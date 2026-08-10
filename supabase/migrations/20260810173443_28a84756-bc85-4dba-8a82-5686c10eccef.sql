-- Deletar dados transacionais mantendo a configuração do sistema
DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.shift_reports;
DELETE FROM public.shift_motoboys;
DELETE FROM public.shifts;
DELETE FROM public.daily_reports;
DELETE FROM public.reservations;
DELETE FROM public.reviews;

-- Zerar sequências de IDs se necessário (opcional, mas limpa o banco)
-- Para IDs UUID não é necessário, mas se houver seriais, seria bom.
-- A tabela orders usa order_number gerado por função, que já reseta diariamente.
