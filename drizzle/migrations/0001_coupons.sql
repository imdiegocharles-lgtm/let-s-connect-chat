CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  percent numeric NOT NULL CHECK (percent > 0 AND percent <= 100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX coupons_code_lower_uidx ON public.coupons (lower(code));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.orders ADD COLUMN coupon_code text;
ALTER TABLE public.shift_reports ADD COLUMN coupons_summary jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.daily_reports ADD COLUMN coupons_summary jsonb NOT NULL DEFAULT '[]'::jsonb;