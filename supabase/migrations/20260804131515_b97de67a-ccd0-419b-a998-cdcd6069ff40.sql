REVOKE EXECUTE ON FUNCTION public.get_active_shift_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_order_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_daily_order_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_order_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_order_shift_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_public_settings() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;