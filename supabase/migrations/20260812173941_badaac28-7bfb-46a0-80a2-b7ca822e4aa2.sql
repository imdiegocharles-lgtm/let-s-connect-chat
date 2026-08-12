ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS accepting_orders boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.is_shift_open()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shifts WHERE closed_at IS NULL AND accepting_orders = true
  );
$$;