CREATE OR REPLACE FUNCTION public.set_daily_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num integer;
  today date;
BEGIN
  today := COALESCE(NEW.created_at::date, CURRENT_DATE);
  SELECT COALESCE(MAX(order_number), 0) + 1
  INTO next_num
  FROM public.orders
  WHERE created_at::date = today;
  NEW.order_number := next_num;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;
CREATE TRIGGER set_order_number_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_daily_order_number();