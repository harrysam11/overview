-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view searchable profiles" ON public.profiles;

-- Create updated policy requiring authentication
CREATE POLICY "Users can view searchable profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = id 
    OR is_searchable = true
  )
);