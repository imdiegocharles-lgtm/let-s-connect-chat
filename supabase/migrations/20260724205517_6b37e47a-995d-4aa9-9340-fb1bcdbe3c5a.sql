
-- Add delivery fee & payment fields to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS change_for numeric,
  ADD COLUMN IF NOT EXISTS order_number serial;

-- Neighborhoods (delivery fees)
CREATE TABLE IF NOT EXISTS public.neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  fee numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.neighborhoods TO anon, authenticated;
GRANT ALL ON public.neighborhoods TO service_role;
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view neighborhoods" ON public.neighborhoods FOR SELECT USING (true);
CREATE POLICY "Admins manage neighborhoods" ON public.neighborhoods FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed neighborhoods
INSERT INTO public.neighborhoods (name, fee) VALUES
  ('São Miguel', 4),
  ('Estrela', 4),
  ('Antonina', 5),
  ('Centro', 5),
  ('Nova Cidade', 5),
  ('Colubandê', 10)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;

-- Seed categories
INSERT INTO public.menu_categories (name, sort_order) VALUES
  ('Espetos', 1),
  ('Completos', 2),
  ('Batatas Fritas', 3),
  ('Porções Extras', 4),
  ('Petiscos', 5),
  ('Caldos', 6),
  ('Refrigerantes', 7),
  ('Bebidas Não Alcoólicas', 8),
  ('Cervejas', 9)
ON CONFLICT DO NOTHING;

-- Seed menu items
WITH cats AS (SELECT id, name FROM public.menu_categories)
INSERT INTO public.menu_items (category_id, name, price, sort_order, description)
SELECT c.id, i.name, i.price, i.sort_order, i.description FROM (VALUES
  ('Espetos','Pão de alho',7,1,NULL),
  ('Espetos','Salsichão',12,2,NULL),
  ('Espetos','Frango grelhado',12,3,NULL),
  ('Espetos','Frango empanado',12,4,NULL),
  ('Espetos','Linguiça suína',12,5,NULL),
  ('Espetos','Tulipa de frango',12,6,NULL),
  ('Espetos','Linguiça mineira',13,7,NULL),
  ('Espetos','Coração',13,8,NULL),
  ('Espetos','Misto',13,9,NULL),
  ('Espetos','Costelinha de porco',14,10,NULL),
  ('Espetos','Queijo coalho',14,11,NULL),
  ('Espetos','Kafta com queijo',14,12,NULL),
  ('Espetos','Alcatra',16,13,NULL),
  ('Espetos','Medalhão de frango',16,14,NULL),
  ('Espetos','Ponceta',16,15,NULL),
  ('Espetos','Medalhão de queijo',18,16,NULL),
  ('Espetos','Medalhão de carne',18,17,NULL),
  ('Espetos','Carne seca',18,18,NULL),
  ('Espetos','Picanha',30,19,NULL),
  ('Completos','Completo com Maionese',50,1,'Arroz, molho à campanha, farofa, ovo de codorna, batata frita, banana frita + 1 espeto de até R$ 12,00'),
  ('Completos','Completo com Salpicão',55,2,'Arroz, molho à campanha, farofa, ovo de codorna, batata frita, banana frita + 1 espeto de até R$ 12,00'),
  ('Batatas Fritas','Batata Média',17,1,NULL),
  ('Batatas Fritas','Batata Inteira',25,2,NULL),
  ('Batatas Fritas','Batata Turbinada',35,3,NULL),
  ('Porções Extras','Farofa e molho',7,1,NULL),
  ('Porções Extras','Arroz',13,2,NULL),
  ('Porções Extras','Maionese',15,3,NULL),
  ('Porções Extras','Salpicão',18,4,NULL),
  ('Porções Extras','Feijão preto',13,5,NULL),
  ('Porções Extras','Feijão tropeiro',18,6,NULL),
  ('Porções Extras','Aipim frito',20,7,NULL),
  ('Porções Extras','Ovo de codorna (10 unidades)',10,8,NULL),
  ('Porções Extras','Banana frita',3,9,NULL),
  ('Petiscos','Torresmo',25,1,NULL),
  ('Petiscos','Frango a passarinho',40,2,NULL),
  ('Petiscos','Carne seca com aipim',65,3,NULL),
  ('Petiscos','Gurjão de peixe',55,4,NULL),
  ('Petiscos','Contrafilé com fritas',60,5,NULL),
  ('Petiscos','Calabresa acebolada',25,6,NULL),
  ('Petiscos','Linguiça mineira com fritas',55,7,NULL),
  ('Petiscos','Churrasquinho misto',60,8,NULL),
  ('Petiscos','Picanha na tábua',190,9,NULL),
  ('Caldos','Caldo Verde',20,1,NULL),
  ('Caldos','Mocotó',25,2,NULL),
  ('Caldos','Caldo de Costela',25,3,NULL),
  ('Caldos','Bobó de Camarão',25,4,NULL),
  ('Refrigerantes','Coca-Cola 2L',16,1,NULL),
  ('Refrigerantes','Coca-Cola Zero 2L',16,2,NULL),
  ('Refrigerantes','Mineirinho 2L',14,3,NULL),
  ('Refrigerantes','Guaraná 2L',14,4,NULL),
  ('Refrigerantes','Fanta Uva 2L',14,5,NULL),
  ('Refrigerantes','Fanta Laranja 2L',14,6,NULL),
  ('Refrigerantes','Sprite 2L',14,7,NULL),
  ('Refrigerantes','Pepsi 2L',14,8,NULL),
  ('Refrigerantes','Splash 2L',10,9,NULL),
  ('Refrigerantes','Coca-Cola lata',8,10,NULL),
  ('Refrigerantes','Refrigerante lata (sabores diversos)',8,11,NULL),
  ('Bebidas Não Alcoólicas','H2OH! Limoneto',8,1,NULL),
  ('Bebidas Não Alcoólicas','Água Tônica',8,2,NULL),
  ('Bebidas Não Alcoólicas','Água com gás',4,3,NULL),
  ('Bebidas Não Alcoólicas','Água sem gás',3,4,NULL),
  ('Bebidas Não Alcoólicas','Schweppes Citrus',8,5,NULL),
  ('Bebidas Não Alcoólicas','Guaravita',3,6,NULL),
  ('Bebidas Não Alcoólicas','Matte Leão',8,7,NULL),
  ('Bebidas Não Alcoólicas','Suco Del Valle (lata)',8,8,NULL),
  ('Bebidas Não Alcoólicas','Suco natural',16,9,NULL),
  ('Bebidas Não Alcoólicas','Gatorade',8,10,NULL),
  ('Bebidas Não Alcoólicas','Red Bull',16,11,NULL),
  ('Cervejas','Brahma Latão',10,1,NULL),
  ('Cervejas','Antarctica Latão',10,2,NULL),
  ('Cervejas','Heineken Long Neck',10,3,NULL),
  ('Cervejas','Heineken Zero',10,4,NULL),
  ('Cervejas','Heineken 600 ml',14,5,NULL),
  ('Cervejas','Budweiser Long Neck',9,6,NULL),
  ('Cervejas','Stella Artois Long Neck',10,7,NULL),
  ('Cervejas','Império Long Neck',8,8,NULL),
  ('Cervejas','Corona Long Neck',10,9,NULL),
  ('Cervejas','GT Long Neck',10,10,NULL),
  ('Cervejas','Smirnoff Ice',10,11,NULL)
) AS i(cat, name, price, sort_order, description)
JOIN cats c ON c.name = i.cat
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.name = i.name AND m.category_id = c.id);
