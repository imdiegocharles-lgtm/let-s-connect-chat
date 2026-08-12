ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS printed_at timestamp with time zone;

-- Garante que a coluna seja visível/atualizável pelas políticas existentes de orders.
GRANT ALL ON public.orders TO service_role;