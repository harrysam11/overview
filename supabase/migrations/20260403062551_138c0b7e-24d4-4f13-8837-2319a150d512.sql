
-- Create a SECURITY DEFINER function that calculates and updates challenge progress server-side
CREATE OR REPLACE FUNCTION public.update_challenge_progress(
  p_challenge_id uuid,
  p_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_goal_type text;
  v_start_date date;
  v_end_date date;
  v_effective_end date;
  v_progress integer := 0;
  v_is_participant boolean;
BEGIN
  -- Only allow users to update their own progress
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only update your own progress';
  END IF;

  -- Verify user is a participant
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'Not a participant in this challenge';
  END IF;

  -- Get challenge details
  SELECT goal_type::text, start_date, end_date
  INTO v_goal_type, v_start_date, v_end_date
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_goal_type IS NULL THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  -- Effective end date is min(end_date, today)
  v_effective_end := LEAST(v_end_date, CURRENT_DATE);

  -- Only calculate if challenge has started
  IF CURRENT_DATE < v_start_date THEN
    v_progress := 0;
  ELSE
    CASE v_goal_type
      WHEN 'points' THEN
        -- Points = completed habits (1pt each) + journal entries (2pts each)
        SELECT COALESCE(SUM(pts), 0) INTO v_progress FROM (
          SELECT COUNT(*) as pts FROM public.daily_records
          WHERE user_id = p_user_id AND completed = true
            AND record_date >= v_start_date AND record_date <= v_effective_end
          UNION ALL
          SELECT COUNT(*) * 2 as pts FROM public.journal_entries
          WHERE user_id = p_user_id
            AND entry_date >= v_start_date AND entry_date <= v_effective_end
        ) sub;

      WHEN 'habits_completed' THEN
        SELECT COUNT(*) INTO v_progress
        FROM public.daily_records
        WHERE user_id = p_user_id AND completed = true
          AND record_date >= v_start_date AND record_date <= v_effective_end;

      WHEN 'streak_days' THEN
        -- Count distinct dates with completed habits
        SELECT COUNT(DISTINCT record_date) INTO v_progress
        FROM public.daily_records
        WHERE user_id = p_user_id AND completed = true
          AND record_date >= v_start_date AND record_date <= v_effective_end;

      ELSE
        v_progress := 0;
    END CASE;
  END IF;

  -- Update the participant's progress
  UPDATE public.challenge_participants
  SET progress = v_progress
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id;

  RETURN v_progress;
END;
$$;

-- Drop the permissive UPDATE policy that allows arbitrary progress values
DROP POLICY IF EXISTS "Users can update their own progress" ON public.challenge_participants;

-- Create a restricted UPDATE policy - only allow updating via the RPC function
-- Since we removed the direct UPDATE policy, progress can only be changed through the SECURITY DEFINER function
