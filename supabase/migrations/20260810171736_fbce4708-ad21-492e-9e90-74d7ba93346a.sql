
-- Adiciona colunas para valor pago ao motoboy na tabela neighborhoods
ALTER TABLE public.neighborhoods 
ADD COLUMN IF NOT EXISTS motoboy_fee_almoco NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS motoboy_fee_noite NUMERIC DEFAULT 0;

-- Atualiza as permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.neighborhoods TO authenticated;
GRANT ALL ON public.neighborhoods TO service_role;
GRANT SELECT ON public.neighborhoods TO anon;
