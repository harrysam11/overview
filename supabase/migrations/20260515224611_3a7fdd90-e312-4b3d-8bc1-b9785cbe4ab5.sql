REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_challenge(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_challenge_participant(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_push_subscription(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_subscription_info(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM authenticated;