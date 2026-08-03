-- Pedidos de convidado (sem login)
DROP POLICY IF EXISTS "Clientes criam seus pedidos" ON public.orders;
DROP POLICY IF EXISTS "Clientes veem seus pedidos" ON public.orders;
DROP POLICY IF EXISTS "Clientes adicionam itens do proprio pedido" ON public.order_items;
DROP POLICY IF EXISTS "Clientes veem itens dos proprios pedidos" ON public.order_items;

GRANT INSERT ON public.orders TO anon, authenticated;
GRANT INSERT ON public.order_items TO anon, authenticated;

CREATE POLICY "Convidados criam pedidos" ON public.orders
FOR INSERT TO anon, authenticated
WITH CHECK (
  user_id IS NULL
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

CREATE POLICY "Convidados adicionam itens do pedido" ON public.order_items
FOR INSERT TO anon, authenticated
WITH CHECK (
  quantity BETWEEN 1 AND 100
  AND price >= 0
  AND length(name) BETWEEN 1 AND 200
  AND EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.id = order_items.menu_item_id AND order_items.price >= mi.price)
  AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id IS NULL AND o.payment_confirmed_at IS NULL)
);

-- Espetos escolhidos dentro dos pratos "Completo"
ALTER TABLE public.shift_reports ADD COLUMN IF NOT EXISTS combos_summary jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS combos_summary jsonb NOT NULL DEFAULT '[]'::jsonb;