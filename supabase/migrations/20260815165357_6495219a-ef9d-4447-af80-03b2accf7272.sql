ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS printed_at timestamptz;

CREATE POLICY "Operators can view reservations"
ON public.reservations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Operators can update reservations"
ON public.reservations FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'operator'))
WITH CHECK (public.has_role(auth.uid(), 'operator'));

CREATE UNIQUE INDEX IF NOT EXISTS reservations_date_location_active_uidx
ON public.reservations (reservation_date, location)
WHERE status <> 'cancelada';

CREATE OR REPLACE FUNCTION public.get_reserved_slots(from_date date, to_date date)
RETURNS TABLE (reservation_date date, location text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.reservation_date, r.location
  FROM public.reservations r
  WHERE r.status <> 'cancelada'
    AND r.reservation_date >= from_date
    AND r.reservation_date <= to_date
$$;

REVOKE ALL ON FUNCTION public.get_reserved_slots(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reserved_slots(date, date) TO anon, authenticated;