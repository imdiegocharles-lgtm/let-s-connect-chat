CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_payments TO authenticated;
GRANT ALL ON public.order_payments TO service_role;

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read order payments"
ON public.order_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert order payments"
ON public.order_payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete order payments"
ON public.order_payments FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS order_payments_order_id_idx ON public.order_payments(order_id);

ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS deletion_password_hash text;

CREATE INDEX IF NOT EXISTS orders_shift_number_idx ON public.orders(shift_id, order_number);

CREATE OR REPLACE FUNCTION public.set_daily_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  next_num integer;
BEGIN
  IF NEW.shift_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.shift_id::text, 0));
    SELECT COALESCE(MAX(order_number), 0) + 1
    INTO next_num
    FROM public.orders
    WHERE shift_id = NEW.shift_id;
  ELSE
    PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(NEW.created_at::date, CURRENT_DATE)::text, 0));
    SELECT COALESCE(MAX(order_number), 0) + 1
    INTO next_num
    FROM public.orders
    WHERE created_at::date = COALESCE(NEW.created_at::date, CURRENT_DATE);
  END IF;

  NEW.order_number := next_num;
  RETURN NEW;
END;
$function$;