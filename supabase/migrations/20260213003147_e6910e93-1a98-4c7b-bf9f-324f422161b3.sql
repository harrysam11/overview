
-- Create a safe view that excludes sensitive crypto keys
CREATE VIEW public.notification_subscriptions_safe
WITH (security_invoker = on) AS
  SELECT id, user_id, endpoint, created_at
  FROM public.notification_subscriptions;

-- Replace the user SELECT policy to deny direct table access
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.notification_subscriptions;

CREATE POLICY "Users can view their own subscriptions"
ON public.notification_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id AND false);
-- Direct SELECT denied; use the view or the get_user_subscription_info RPC instead
