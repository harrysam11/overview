-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view challenges they participate in or public ones" ON public.challenges;
DROP POLICY IF EXISTS "Users can view participants of their challenges" ON public.challenge_participants;

-- Create security definer function to check if user participates in a challenge
CREATE OR REPLACE FUNCTION public.is_challenge_participant(_user_id uuid, _challenge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE user_id = _user_id AND challenge_id = _challenge_id
  )
$$;

-- Create security definer function to check if challenge is public or user is creator
CREATE OR REPLACE FUNCTION public.can_view_challenge(_user_id uuid, _challenge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenges
    WHERE id = _challenge_id 
    AND (is_public = true OR creator_id = _user_id)
  )
$$;

-- Recreate challenges SELECT policy using the function
CREATE POLICY "Users can view challenges they participate in or public ones"
ON public.challenges
FOR SELECT
USING (
  is_public = true 
  OR creator_id = auth.uid() 
  OR public.is_challenge_participant(auth.uid(), id)
);

-- Recreate challenge_participants SELECT policy using the function
CREATE POLICY "Users can view participants of their challenges"
ON public.challenge_participants
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.can_view_challenge(auth.uid(), challenge_id)
  OR public.is_challenge_participant(auth.uid(), challenge_id)
);