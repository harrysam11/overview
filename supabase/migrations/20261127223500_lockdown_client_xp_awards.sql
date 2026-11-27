-- Client-supplied XP is untrusted. Keep the legacy SECURITY DEFINER
-- function available only to trusted server-side roles until a server-
-- authoritative XP award flow replaces it.
REVOKE EXECUTE ON FUNCTION public.increment_xp(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_xp(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_xp(integer) FROM authenticated;
