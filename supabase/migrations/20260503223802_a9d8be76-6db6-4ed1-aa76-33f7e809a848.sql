
-- 1. Fix messages UPDATE policy: receivers can only flip `read` to true
DROP POLICY IF EXISTS "Users can update read status of received messages" ON public.messages;

CREATE POLICY "Users can mark received messages as read"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (
  auth.uid() = receiver_id
  AND read = true
);

-- 2. Server-side XP increment function with bounded amounts
CREATE OR REPLACE FUNCTION public.increment_xp(p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id uuid;
  v_new_total integer;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 100 THEN
    RAISE EXCEPTION 'Invalid XP amount';
  END IF;

  INSERT INTO public.user_levels (user_id, total_xp, updated_at)
  VALUES (v_caller_id, p_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = public.user_levels.total_xp + EXCLUDED.total_xp,
        updated_at = NOW()
  RETURNING total_xp INTO v_new_total;

  RETURN v_new_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_xp(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_xp(integer) TO authenticated;

-- 3. Drop direct UPDATE policy on user_levels so XP can only change via increment_xp
DROP POLICY IF EXISTS "Users can update their own level" ON public.user_levels;
DROP POLICY IF EXISTS "Users can update their own xp" ON public.user_levels;
DROP POLICY IF EXISTS "Users can update own level" ON public.user_levels;
DROP POLICY IF EXISTS "Users update their own user_levels" ON public.user_levels;
