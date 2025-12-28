-- Drop the existing SELECT policy that allows viewing all searchable profiles
DROP POLICY IF EXISTS "Users can view searchable profiles" ON public.profiles;

-- Create a more restrictive policy: users can only view their own profile 
-- or profiles of users they are friends with
CREATE POLICY "Users can view own profile or friends profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = id  -- Own profile
    OR are_friends(auth.uid(), id)  -- Friends' profiles
  )
);