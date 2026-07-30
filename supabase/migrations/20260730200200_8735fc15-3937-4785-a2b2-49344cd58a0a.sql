-- 1. Public-safe settings table
CREATE TABLE IF NOT EXISTS public.public_settings (
  id integer PRIMARY KEY DEFAULT 1,
  lunch_start time NOT NULL DEFAULT '11:00',
  lunch_end time NOT NULL DEFAULT '14:30',
  dinner_start time NOT NULL DEFAULT '18:00',
  dinner_end time NOT NULL DEFAULT '23:59',
  min_order_value numeric NOT NULL DEFAULT 0,
  avg_prep_minutes integer NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_settings_single_row CHECK (id = 1)
);

GRANT SELECT ON public.public_settings TO anon, authenticated;
GRANT ALL ON public.public_settings TO service_role;
ALTER TABLE public.public_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_public_settings" ON public.public_settings;
CREATE POLICY "anyone_read_public_settings" ON public.public_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_public_settings" ON public.public_settings;
CREATE POLICY "admin_update_public_settings" ON public.public_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.public_settings (id, lunch_start, lunch_end, dinner_start, dinner_end, min_order_value, avg_prep_minutes)
SELECT 1, lunch_start, lunch_end, dinner_start, dinner_end, min_order_value, avg_prep_minutes
FROM public.system_settings WHERE id = 1
ON CONFLICT (id) DO UPDATE SET
  lunch_start = EXCLUDED.lunch_start,
  lunch_end = EXCLUDED.lunch_end,
  dinner_start = EXCLUDED.dinner_start,
  dinner_end = EXCLUDED.dinner_end,
  min_order_value = EXCLUDED.min_order_value,
  avg_prep_minutes = EXCLUDED.avg_prep_minutes;

CREATE OR REPLACE FUNCTION public.sync_public_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_settings (id, lunch_start, lunch_end, dinner_start, dinner_end, min_order_value, avg_prep_minutes, updated_at)
  VALUES (1, NEW.lunch_start, NEW.lunch_end, NEW.dinner_start, NEW.dinner_end, NEW.min_order_value, NEW.avg_prep_minutes, now())
  ON CONFLICT (id) DO UPDATE SET
    lunch_start = EXCLUDED.lunch_start,
    lunch_end = EXCLUDED.lunch_end,
    dinner_start = EXCLUDED.dinner_start,
    dinner_end = EXCLUDED.dinner_end,
    min_order_value = EXCLUDED.min_order_value,
    avg_prep_minutes = EXCLUDED.avg_prep_minutes,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS system_settings_sync_public ON public.system_settings;
CREATE TRIGGER system_settings_sync_public
AFTER INSERT OR UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.sync_public_settings();

-- 2. Lock down system_settings reads to staff only
DROP POLICY IF EXISTS "anyone_read_settings" ON public.system_settings;
CREATE POLICY "staff_read_settings" ON public.system_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
REVOKE ALL ON public.system_settings FROM anon;

-- 3. Orders: prevent clients forging paid/confirmed orders
DROP POLICY IF EXISTS "Anyone can place orders" ON public.orders;
CREATE POLICY "Anyone can place orders" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'received'
    AND payment_confirmed_at IS NULL
    AND confirmed_payment_method IS NULL
    AND total >= 0 AND subtotal >= 0 AND delivery_fee >= 0
    AND length(customer_name) BETWEEN 1 AND 120
    AND length(customer_phone) BETWEEN 8 AND 30
    AND (customer_address IS NULL OR length(customer_address) <= 300)
    AND (notes IS NULL OR length(notes) <= 500)
    AND (neighborhood IS NULL OR length(neighborhood) <= 120)
  );

-- 4. Order items: price must match the real menu price
DROP POLICY IF EXISTS "Anyone can add order items" ON public.order_items;
CREATE POLICY "Anyone can add order items" ON public.order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    quantity BETWEEN 1 AND 100
    AND price >= 0
    AND length(name) BETWEEN 1 AND 200
    AND EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = order_items.menu_item_id
        AND order_items.price >= mi.price
    )
  );

-- 5. Reviews / reservations input validation
DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.reviews;
CREATE POLICY "Anyone can submit reviews" ON public.reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    rating BETWEEN 1 AND 5
    AND (comment IS NULL OR length(comment) <= 2000)
  );

DROP POLICY IF EXISTS "Anyone can create reservations" ON public.reservations;
CREATE POLICY "Anyone can create reservations" ON public.reservations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    people_count BETWEEN 10 AND 500
    AND status = 'pendente'
    AND length(customer_name) BETWEEN 1 AND 120
    AND length(phone) BETWEEN 8 AND 30
    AND length(location) BETWEEN 1 AND 120
  );

-- 6. Restrict EXECUTE on internal SECURITY DEFINER / trigger functions
REVOKE ALL ON FUNCTION public.get_next_order_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_active_shift_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_admin_if_whitelisted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_order_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_daily_order_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_order_shift_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_public_settings() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_role_if_whitelisted() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_role_if_whitelisted() TO authenticated;

-- 7. Storage: keep public CDN reads, stop directory listing
DROP POLICY IF EXISTS "menu_images_public_read" ON storage.objects;
CREATE POLICY "menu_images_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'menu-images' AND public.has_role(auth.uid(), 'admin'));