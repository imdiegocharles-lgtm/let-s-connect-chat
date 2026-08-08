CREATE OR REPLACE FUNCTION public.is_shift_open()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shifts WHERE closed_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_shift_open() TO authenticated, anon, service_role;

-- Trigger function to check shift before order insertion
CREATE OR REPLACE FUNCTION public.check_shift_before_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_shift_open() THEN
    RAISE EXCEPTION 'Não há um turno aberto no momento. O pedido não pode ser processado.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_shift_before_order ON public.orders;
CREATE TRIGGER tr_check_shift_before_order
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.check_shift_before_order();