-- Drop the existing SELECT policy that exposes sensitive keys
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.notification_subscriptions;

-- Create a security definer function to check if user has an active subscription
-- This allows users to check subscription status without exposing sensitive keys
CREATE OR REPLACE FUNCTION public.has_push_subscription(_user_id uuid, _endpoint text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.notification_subscriptions
    WHERE user_id = _user_id
    AND (_endpoint IS NULL OR endpoint = _endpoint)
  )
$$;

-- Create a function to get non-sensitive subscription info (id and endpoint only)
-- This is useful for managing subscriptions without exposing crypto keys
CREATE OR REPLACE FUNCTION public.get_user_subscription_info(_user_id uuid)
RETURNS TABLE(id uuid, endpoint text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, endpoint, created_at 
  FROM public.notification_subscriptions
  WHERE user_id = _user_id
  AND _user_id = auth.uid() -- Only allow users to get their own info
$$;