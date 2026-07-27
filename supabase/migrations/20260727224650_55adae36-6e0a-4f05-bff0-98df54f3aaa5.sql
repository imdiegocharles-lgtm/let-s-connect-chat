
-- Category availability window
ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS available_lunch boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS available_dinner boolean NOT NULL DEFAULT true;

UPDATE public.menu_categories SET available_lunch = false, available_dinner = true
  WHERE lower(name) LIKE '%espeto%' OR lower(name) LIKE '%completo%' OR lower(name) LIKE '%porç%'
     OR lower(name) LIKE '%porc%' OR lower(name) LIKE '%petisco%' OR lower(name) LIKE '%batata%'
     OR lower(name) LIKE '%caldo%' OR lower(name) LIKE '%sobremesa%' OR lower(name) LIKE '%mais pedido%';
UPDATE public.menu_categories SET available_lunch = true, available_dinner = false
  WHERE lower(name) LIKE '%almoç%' OR lower(name) LIKE '%almoc%' OR lower(name) LIKE '%prato feito%';
UPDATE public.menu_categories SET available_lunch = true, available_dinner = true
  WHERE lower(name) LIKE '%bebida%' OR lower(name) LIKE '%refri%' OR lower(name) LIKE '%cerveja%'
     OR lower(name) LIKE '%suco%' OR lower(name) LIKE '%água%' OR lower(name) LIKE '%agua%';

-- Shifts
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_type text NOT NULL CHECK (shift_type IN ('lunch','dinner')),
  operator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  operator_name text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_cash numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shifts_read" ON public.shifts;
CREATE POLICY "shifts_read" ON public.shifts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
DROP POLICY IF EXISTS "shifts_insert" ON public.shifts;
CREATE POLICY "shifts_insert" ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
DROP POLICY IF EXISTS "shifts_update" ON public.shifts;
CREATE POLICY "shifts_update" ON public.shifts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
DROP POLICY IF EXISTS "shifts_delete" ON public.shifts;
CREATE POLICY "shifts_delete" ON public.shifts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS shifts_updated_at ON public.shifts;
CREATE TRIGGER shifts_updated_at BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Orders extras
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_payment_method text,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz;

DROP POLICY IF EXISTS "operator_read_orders" ON public.orders;
CREATE POLICY "operator_read_orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operator'));
DROP POLICY IF EXISTS "operator_update_orders" ON public.orders;
CREATE POLICY "operator_update_orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'operator'))
  WITH CHECK (public.has_role(auth.uid(), 'operator'));
DROP POLICY IF EXISTS "operator_read_order_items" ON public.order_items;
CREATE POLICY "operator_read_order_items" ON public.order_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operator'));
DROP POLICY IF EXISTS "operator_toggle_availability" ON public.menu_items;
CREATE POLICY "operator_toggle_availability" ON public.menu_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'operator'))
  WITH CHECK (public.has_role(auth.uid(), 'operator'));

-- System settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  lunch_start time NOT NULL DEFAULT '11:00',
  lunch_end time NOT NULL DEFAULT '14:30',
  dinner_start time NOT NULL DEFAULT '18:00',
  dinner_end time NOT NULL DEFAULT '23:59',
  avg_prep_minutes integer NOT NULL DEFAULT 30,
  min_order_value numeric NOT NULL DEFAULT 0,
  printer_url text NOT NULL DEFAULT 'http://localhost:8080/print',
  report_emails text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT UPDATE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_read_settings" ON public.system_settings;
CREATE POLICY "anyone_read_settings" ON public.system_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_update_settings" ON public.system_settings;
CREATE POLICY "admin_update_settings" ON public.system_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS system_settings_updated_at ON public.system_settings;
CREATE TRIGGER system_settings_updated_at BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Whitelist role claim (admin + operator by email)
CREATE OR REPLACE FUNCTION public.claim_role_if_whitelisted()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _email text; _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RETURN 'none'; END IF;
  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;
  IF _email = 'imdiegocharles@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin') ON CONFLICT DO NOTHING;
    RETURN 'admin';
  ELSIF _email = 'familiaamaraldelivery01@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'operator') ON CONFLICT DO NOTHING;
    RETURN 'operator';
  END IF;
  RETURN 'none';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_role_if_whitelisted() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_role_if_whitelisted() TO authenticated;
