-- Add UPDATE policy for notification_subscriptions
CREATE POLICY "Users can update their own subscriptions"
ON public.notification_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);