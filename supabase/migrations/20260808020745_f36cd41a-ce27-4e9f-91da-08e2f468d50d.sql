ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS official_logo_bw_url TEXT;

-- Garantir que a linha com ID 1 exista para configurações globais
INSERT INTO public.system_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

UPDATE public.system_settings 
SET official_logo_bw_url = '/__l5e/assets-v1/ec2ee36c-9321-4f0e-9089-238505c51ec1/logo-familia-amaral-bw.png'
WHERE id = 1;

GRANT SELECT, UPDATE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
GRANT SELECT ON public.system_settings TO anon;
