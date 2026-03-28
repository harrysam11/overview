
-- Drop the permissive INSERT policy that allows self-awarding any badge
DROP POLICY IF EXISTS "Users can earn badges" ON public.user_badges;

-- Create a SECURITY DEFINER function that validates badge criteria before awarding
CREATE OR REPLACE FUNCTION public.award_badge_if_earned(
  p_user_id uuid,
  p_badge_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requirement_type text;
  v_requirement_value integer;
  v_actual_value integer;
  v_already_earned boolean;
  v_caller_id uuid;
BEGIN
  -- Only allow users to award badges to themselves
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only award badges to yourself';
  END IF;

  -- Check if already earned
  SELECT EXISTS (
    SELECT 1 FROM public.user_badges
    WHERE user_id = p_user_id AND badge_id = p_badge_id
  ) INTO v_already_earned;

  IF v_already_earned THEN
    RETURN FALSE;
  END IF;

  -- Get badge requirements
  SELECT requirement_type, requirement_value
  INTO v_requirement_type, v_requirement_value
  FROM public.badges
  WHERE id = p_badge_id;

  IF v_requirement_type IS NULL THEN
    RAISE EXCEPTION 'Badge not found';
  END IF;

  -- Validate the user actually meets the requirement
  CASE v_requirement_type
    WHEN 'streak_days' THEN
      -- Count consecutive days with completed habits (simplified: count distinct dates with completions in last N days)
      SELECT COUNT(DISTINCT record_date) INTO v_actual_value
      FROM public.daily_records
      WHERE user_id = p_user_id AND completed = true
        AND record_date >= (CURRENT_DATE - v_requirement_value);

    WHEN 'habits_completed' THEN
      SELECT COUNT(*) INTO v_actual_value
      FROM public.daily_records
      WHERE user_id = p_user_id AND completed = true;

    WHEN 'journal_entries' THEN
      SELECT COUNT(*) INTO v_actual_value
      FROM public.journal_entries
      WHERE user_id = p_user_id;

    WHEN 'total_points' THEN
      SELECT COALESCE(total_xp, 0) INTO v_actual_value
      FROM public.user_levels
      WHERE user_id = p_user_id;

    WHEN 'friends_count' THEN
      SELECT COUNT(*) INTO v_actual_value
      FROM public.friend_requests
      WHERE status = 'accepted'
        AND (from_user_id = p_user_id OR to_user_id = p_user_id);

    ELSE
      RAISE EXCEPTION 'Unknown requirement type: %', v_requirement_type;
  END CASE;

  -- Check if the user meets the requirement
  IF v_actual_value >= v_requirement_value THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, p_badge_id);
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;
