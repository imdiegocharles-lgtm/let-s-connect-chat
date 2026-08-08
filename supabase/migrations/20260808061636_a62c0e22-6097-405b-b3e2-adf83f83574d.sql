-- Revogar execução pública (anon e authenticated) de funções SECURITY DEFINER na schema public
-- Estas funções devem ser chamadas apenas internamente ou por gatilhos/service_role quando apropriado.
-- A função has_role é usada em RLS, mas o linter alerta sobre a execução direta.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_next_order_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_next_order_number() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.set_daily_order_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_daily_order_number() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.set_order_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_order_number() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_active_shift_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_active_shift_id() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.set_order_shift_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_order_shift_id() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_public_settings() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_public_settings() FROM anon, authenticated;

-- Garantir que service_role ainda possa executar (usado em server functions admin)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_next_order_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_daily_order_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_order_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_active_shift_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_order_shift_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_public_settings() TO service_role;
