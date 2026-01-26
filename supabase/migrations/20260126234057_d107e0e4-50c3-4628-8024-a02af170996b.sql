-- Drop the existing SELECT policy on user_levels
DROP POLICY IF EXISTS "Users can view their own level" ON public.user_levels;

-- Create a new policy that allows users to view their own level OR friends' levels
CREATE POLICY "Users can view own and friends levels"
ON public.user_levels
FOR SELECT
USING (
  auth.uid() = user_id 
  OR are_friends(auth.uid(), user_id)
);