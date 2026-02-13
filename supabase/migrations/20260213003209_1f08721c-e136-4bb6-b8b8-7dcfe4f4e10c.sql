
-- Restore proper SELECT policy (needed for UPDATE/DELETE to work)
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.notification_subscriptions;

CREATE POLICY "Users can view their own subscriptions"
ON public.notification_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);
