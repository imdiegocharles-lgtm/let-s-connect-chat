
CREATE TABLE public.kitchen_permissions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  can_open_close_shift boolean NOT NULL DEFAULT true,
  can_confirm_payment boolean NOT NULL DEFAULT true,
  can_manage_menu boolean NOT NULL DEFAULT true,
  can_update_order_status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kitchen_permissions TO authenticated;
GRANT ALL ON public.kitchen_permissions TO service_role;

ALTER TABLE public.kitchen_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage kitchen permissions"
  ON public.kitchen_permissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own kitchen permissions"
  ON public.kitchen_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_kitchen_permissions_updated_at
  BEFORE UPDATE ON public.kitchen_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
