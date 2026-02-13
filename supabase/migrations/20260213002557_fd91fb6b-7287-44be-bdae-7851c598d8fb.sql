
-- Harden are_friends function: revoke public access, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;
