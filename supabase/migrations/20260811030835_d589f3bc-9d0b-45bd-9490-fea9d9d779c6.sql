ALTER TABLE public.shift_reports ADD COLUMN IF NOT EXISTS deleted_orders JSONB DEFAULT '[]'::jsonb;
NOTIFY pgrst, 'reload schema';