CREATE OR REPLACE FUNCTION public.set_daily_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
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