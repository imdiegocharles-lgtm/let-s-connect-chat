-- 1. user_id em orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);

-- 2. telefone no profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- 3. criacao automatica de profile no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT INSERT ON public.profiles TO authenticated;

-- 4. remover politicas anonimas
DROP POLICY IF EXISTS "Anyone can place orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can add order items" ON public.order_items;
DROP POLICY IF EXISTS "Permitir leitura de pedidos para anonimos" ON public.orders;
DROP POLICY IF EXISTS "Permitir leitura de itens de pedido para anonimos" ON public.order_items;

REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.order_items FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;

-- 5. novas politicas: cliente logado
CREATE POLICY "Clientes criam seus pedidos"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'received'
  AND payment_confirmed_at IS NULL
  AND confirmed_payment_method IS NULL
  AND total >= 0 AND subtotal >= 0 AND delivery_fee >= 0
  AND length(customer_name) BETWEEN 1 AND 120
  AND length(customer_phone) BETWEEN 8 AND 30
  AND (customer_address IS NULL OR length(customer_address) <= 300)
  AND (notes IS NULL OR length(notes) <= 500)
  AND (neighborhood IS NULL OR length(neighborhood) <= 120)
);

CREATE POLICY "Clientes veem seus pedidos"
ON public.orders FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Clientes adicionam itens do proprio pedido"
ON public.order_items FOR INSERT TO authenticated
WITH CHECK (
  quantity BETWEEN 1 AND 100
  AND price >= 0
  AND length(name) BETWEEN 1 AND 200
  AND EXISTS (
    SELECT 1 FROM public.menu_items mi
    WHERE mi.id = order_items.menu_item_id AND order_items.price >= mi.price
  )
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Clientes veem itens dos proprios pedidos"
ON public.order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  )
);

-- 6. realtime
ALTER TABLE public.orders REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;