-- Create acompanhamentos table
CREATE TABLE public.acompanhamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add has_side_dish to menu_items
ALTER TABLE public.menu_items ADD COLUMN has_side_dish BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.acompanhamentos ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.acompanhamentos TO authenticated, anon;
GRANT ALL ON public.acompanhamentos TO service_role;

-- Policies
CREATE POLICY "Allow public read-only access to active acompanhamentos"
ON public.acompanhamentos FOR SELECT
USING (true);

-- Seed initial data
INSERT INTO public.acompanhamentos (name) VALUES
('Batata Frita'),
('Purê de batata'),
('Maionese'),
('Salpicão'),
('Macarronese'),
('Legumes no vapor (batata inglesa, chuchu e cenoura)'),
('Salada de alface, tomate e cebola');