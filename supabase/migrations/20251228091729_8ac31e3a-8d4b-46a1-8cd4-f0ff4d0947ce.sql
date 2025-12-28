-- Add SELECT policy for notification_subscriptions
-- Users can only view their own subscription records
CREATE POLICY "Users can view their own subscriptions"
ON public.notification_subscriptions
FOR SELECT
USING (auth.uid() = user_id);