-- Drop the old global sequence default
ALTER TABLE public.orders ALTER COLUMN order_number DROP DEFAULT;
DROP SEQUENCE IF EXISTS orders_order_number_seq;

-- Function: next daily order number
CREATE OR REPLACE FUNCTION public.get_next_order_number()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
  today date := CURRENT_DATE;
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1
  INTO next_num
  FROM public.orders
  WHERE created_at::date = today;

  RETURN next_num;
END;
$$;

-- Trigger to set order_number on insert
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.get_next_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;
CREATE TRIGGER set_order_number_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_number();

-- Enable Realtime for kitchen screen
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;