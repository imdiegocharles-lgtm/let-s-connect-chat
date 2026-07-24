
CREATE OR REPLACE FUNCTION public.claim_admin_if_whitelisted()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN false;
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  IF lower(_email) IN ('imdiegocharles@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_admin_if_whitelisted() TO authenticated;
