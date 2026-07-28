
-- Function: return the currently active open shift (if any).
-- Priority: shift type matching current time window; fallback to most recent open shift.
CREATE OR REPLACE FUNCTION public.get_active_shift_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_time time := (now() AT TIME ZONE 'America/Sao_Paulo')::time;
  cur_type text;
  s_id uuid;
BEGIN
  IF now_time >= time '11:00' AND now_time < time '16:00' THEN
    cur_type := 'almoco';
  ELSE
    cur_type := 'noite';
  END IF;

  SELECT id INTO s_id
  FROM public.shifts
  WHERE closed_at IS NULL AND shift_type = cur_type
  ORDER BY opened_at DESC
  LIMIT 1;

  IF s_id IS NOT NULL THEN
    RETURN s_id;
  END IF;

  SELECT id INTO s_id
  FROM public.shifts
  WHERE closed_at IS NULL
  ORDER BY opened_at DESC
  LIMIT 1;

  RETURN s_id;
END;
$$;

-- Trigger: attach shift_id on new orders.
CREATE OR REPLACE FUNCTION public.set_order_shift_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.shift_id IS NULL THEN
    NEW.shift_id := public.get_active_shift_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_set_shift_id ON public.orders;
CREATE TRIGGER orders_set_shift_id
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_shift_id();
