ALTER TABLE public.neighborhoods ADD COLUMN fee_almoco numeric DEFAULT 0;
ALTER TABLE public.neighborhoods ADD COLUMN fee_noite numeric DEFAULT 0;

-- Migrate existing data
UPDATE public.neighborhoods SET fee_almoco = fee, fee_noite = fee;

-- Grant access (ensuring they are still applied)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.neighborhoods TO authenticated;
GRANT SELECT ON public.neighborhoods TO anon;
GRANT ALL ON public.neighborhoods TO service_role;
