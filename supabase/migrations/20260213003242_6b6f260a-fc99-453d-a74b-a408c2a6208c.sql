
-- Remove user-facing policies; only SECURITY DEFINER function and service_role can access
DROP POLICY IF EXISTS "Users can insert their own rate limit entries" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can view their own rate limit entries" ON public.rate_limits;
