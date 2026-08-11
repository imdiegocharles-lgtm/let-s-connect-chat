ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS deleted_orders jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.shift_reports
  ADD COLUMN IF NOT EXISTS emailed_at timestamptz;