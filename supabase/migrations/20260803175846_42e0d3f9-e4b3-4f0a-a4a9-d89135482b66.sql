DROP POLICY IF EXISTS "Convidados criam pedidos" ON public.orders;
DROP POLICY IF EXISTS "Convidados adicionam itens do pedido" ON public.order_items;
REVOKE INSERT ON public.orders FROM anon, authenticated;
REVOKE INSERT ON public.order_items FROM anon, authenticated;