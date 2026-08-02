-- Remove API-callable EXECUTE on SECURITY DEFINER functions for signed-in users.
-- has_role() is intentionally left callable because RLS policies evaluate it as the caller.

REVOKE EXECUTE ON FUNCTION public.get_active_shift_id() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_shift_id() TO anon;

REVOKE EXECUTE ON FUNCTION public.get_next_order_number() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_order_number() TO anon;

REVOKE EXECUTE ON FUNCTION public.sync_public_settings() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_settings() TO anon;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

REVOKE EXECUTE ON FUNCTION public.set_daily_order_number() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.set_daily_order_number() TO anon;

REVOKE EXECUTE ON FUNCTION public.set_order_number() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.set_order_number() TO anon;

REVOKE EXECUTE ON FUNCTION public.set_order_shift_id() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.set_order_shift_id() TO anon;