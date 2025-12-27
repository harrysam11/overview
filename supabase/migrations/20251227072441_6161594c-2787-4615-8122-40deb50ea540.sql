-- Create a table to track rate limits
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action_type, created_at);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only insert their own rate limit entries
CREATE POLICY "Users can insert their own rate limit entries"
ON public.rate_limits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own rate limit entries
CREATE POLICY "Users can view their own rate limit entries"
ON public.rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all entries (for cleanup)
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create a function to check and enforce rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id UUID,
  _action_type TEXT,
  _max_requests INTEGER,
  _window_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count INTEGER;
BEGIN
  -- Count requests in the time window
  SELECT COUNT(*) INTO request_count
  FROM public.rate_limits
  WHERE user_id = _user_id
    AND action_type = _action_type
    AND created_at > (NOW() - (_window_minutes || ' minutes')::INTERVAL);
  
  -- If under limit, record this request and return true
  IF request_count < _max_requests THEN
    INSERT INTO public.rate_limits (user_id, action_type)
    VALUES (_user_id, _action_type);
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create cleanup function to remove old rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < (NOW() - INTERVAL '24 hours');
END;
$$;