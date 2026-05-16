REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (read) ON public.messages TO authenticated;