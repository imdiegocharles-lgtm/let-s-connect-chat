-- Adicionar colunas para flexibilidade de posição na comanda
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS receipt_order_sections jsonb DEFAULT '["header", "order_info", "customer", "items", "totals", "payment", "notes"]'::jsonb;

-- Garantir que a logo P&B esteja atualizada
UPDATE public.system_settings 
SET official_logo_bw_url = '/__l5e/assets-v1/5398c413-cb5d-4c2f-b8c1-c7ba9e8310b6/logo_familia_amaral_elgin_i9_200x200_1bit_correta.png'
WHERE id = (SELECT id FROM public.system_settings LIMIT 1);
