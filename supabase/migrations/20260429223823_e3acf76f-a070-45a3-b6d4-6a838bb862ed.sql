-- Restrict notification_subscriptions policies to authenticated role
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.notification_subscriptions;

CREATE POLICY "Users can create their own subscriptions"
ON public.notification_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON public.notification_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
ON public.notification_subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);