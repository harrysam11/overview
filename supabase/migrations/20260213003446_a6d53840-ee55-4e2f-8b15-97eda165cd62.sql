
-- Enable RLS on the safe view (views inherit from base table with security_invoker=on, but let's also secure it)
-- Drop and recreate the view to ensure security_invoker is set
DROP VIEW IF EXISTS public.notification_subscriptions_safe;

CREATE VIEW public.notification_subscriptions_safe
WITH (security_invoker = on) AS
  SELECT id, user_id, endpoint, created_at
  FROM public.notification_subscriptions;
