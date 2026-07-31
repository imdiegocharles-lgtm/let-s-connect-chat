CREATE TABLE public.shift_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  shift_type text NOT NULL,
  operator_name text,
  opened_at timestamptz NOT NULL,
  closed_at timestamptz NOT NULL,
  opening_cash numeric NOT NULL DEFAULT 0,
  orders_count integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  delivery_fees numeric NOT NULL DEFAULT 0,
  totals_by_payment jsonb NOT NULL DEFAULT '{}'::jsonb,
  printed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shift_id)
);

GRANT SELECT, INSERT, UPDATE ON public.shift_reports TO authenticated;
GRANT ALL ON public.shift_reports TO service_role;
ALTER TABLE public.shift_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver relatorios de turno"
ON public.shift_reports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Equipe pode criar relatorios de turno"
ON public.shift_reports FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Equipe pode atualizar relatorios de turno"
ON public.shift_reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE TRIGGER update_shift_reports_updated_at
BEFORE UPDATE ON public.shift_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL UNIQUE,
  shifts_count integer NOT NULL DEFAULT 0,
  orders_count integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  delivery_fees numeric NOT NULL DEFAULT 0,
  totals_by_payment jsonb NOT NULL DEFAULT '{}'::jsonb,
  shifts_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  printed_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.daily_reports TO authenticated;
GRANT ALL ON public.daily_reports TO service_role;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver relatorios do dia"
ON public.daily_reports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Equipe pode criar relatorios do dia"
ON public.daily_reports FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Equipe pode atualizar relatorios do dia"
ON public.daily_reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE TRIGGER update_daily_reports_updated_at
BEFORE UPDATE ON public.daily_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();