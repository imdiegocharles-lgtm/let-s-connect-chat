CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP FUNCTION IF EXISTS public.claim_admin_if_whitelisted();
DROP FUNCTION IF EXISTS public.claim_role_if_whitelisted();

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;