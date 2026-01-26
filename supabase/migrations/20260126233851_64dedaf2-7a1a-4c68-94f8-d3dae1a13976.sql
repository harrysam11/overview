-- Drop the two conflicting SELECT policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile or friends profiles" ON public.profiles;
DROP POLICY IF EXISTS "Searchable profiles are visible to authenticated users" ON public.profiles;

-- Create a single, clear combined policy that handles all access patterns:
-- 1. Users can always view their own profile
-- 2. Users can view searchable profiles (for user search)
-- 3. Users can view friends' profiles (even if not searchable)
CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = id 
    OR is_searchable = true 
    OR are_friends(auth.uid(), id)
  )
);