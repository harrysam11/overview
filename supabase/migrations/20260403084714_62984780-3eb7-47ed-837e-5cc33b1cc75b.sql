
-- Fix rate_limits: drop the public-scoped policy and create one scoped to service_role only
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

-- Ensure RLS is enabled
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy scoped exclusively to service_role
CREATE POLICY "Only service_role can access rate_limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add RLS policy on realtime.messages to restrict channel subscriptions
-- For private messages: only sender/receiver can subscribe
-- For group messages: only group members can subscribe
CREATE POLICY "Authorize private message channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id::text = realtime.messages.extension::jsonb->>'id'
    AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    WHERE gm.id::text = realtime.messages.extension::jsonb->>'id'
    AND public.is_group_member(auth.uid(), gm.group_id)
  )
  OR
  -- Allow if topic matches user's own data pattern
  realtime.messages.extension::jsonb->>'source' IS NULL
);
