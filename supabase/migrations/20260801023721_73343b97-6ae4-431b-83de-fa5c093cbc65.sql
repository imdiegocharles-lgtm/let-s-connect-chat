ALTER TABLE public.shift_reports
  ADD COLUMN IF NOT EXISTS items_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS motoboys_summary jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS items_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS motoboys_summary jsonb NOT NULL DEFAULT '[]'::jsonb;