
-- Tighten UPDATE policy on friend_requests
DROP POLICY IF EXISTS "Users can update requests sent to them" ON public.friend_requests;
CREATE POLICY "Users can update requests sent to them"
ON public.friend_requests
FOR UPDATE
USING (auth.uid() = to_user_id)
WITH CHECK (auth.uid() = to_user_id AND status IN ('accepted'::request_status, 'rejected'::request_status));

-- Tighten UPDATE policy on challenge_invites
DROP POLICY IF EXISTS "Invited users can update invite status" ON public.challenge_invites;
CREATE POLICY "Invited users can update invite status"
ON public.challenge_invites
FOR UPDATE
USING (auth.uid() = to_user_id)
WITH CHECK (auth.uid() = to_user_id AND status IN ('accepted'::request_status, 'rejected'::request_status));
