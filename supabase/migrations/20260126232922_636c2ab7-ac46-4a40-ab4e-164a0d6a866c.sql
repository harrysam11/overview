-- Add policy for searchable profiles to enable user search functionality
-- Users who have is_searchable = true can be found by other authenticated users
CREATE POLICY "Searchable profiles are visible to authenticated users"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_searchable = true);