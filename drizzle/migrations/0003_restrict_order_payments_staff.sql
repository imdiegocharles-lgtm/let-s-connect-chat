DROP POLICY IF EXISTS "Authenticated can delete order payments" ON public.order_payments;
DROP POLICY IF EXISTS "Authenticated can insert order payments" ON public.order_payments;
DROP POLICY IF EXISTS "Authenticated can read order payments" ON public.order_payments;
CREATE POLICY "Staff can read order payments" ON public.order_payments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Staff can insert order payments" ON public.order_payments FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Staff can delete order payments" ON public.order_payments FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));