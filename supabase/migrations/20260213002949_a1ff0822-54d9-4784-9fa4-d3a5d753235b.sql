
-- Fix check_rate_limit to use auth.uid() directly instead of accepting arbitrary user_id
CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id uuid, _action_type text, _max_requests integer, _window_minutes integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count INTEGER;
  actual_user_id UUID;
BEGIN
  -- Enforce that _user_id matches the authenticated caller
  actual_user_id := auth.uid();
  IF actual_user_id IS NULL OR _user_id != actual_user_id THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  -- Count requests in the time window
  SELECT COUNT(*) INTO request_count
  FROM public.rate_limits
  WHERE user_id = actual_user_id
    AND action_type = _action_type
    AND created_at > (NOW() - (_window_minutes || ' minutes')::INTERVAL);
  
  -- If under limit, record this request and return true
  IF request_count < _max_requests THEN
    INSERT INTO public.rate_limits (user_id, action_type)
    VALUES (actual_user_id, _action_type);
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) TO authenticated;
