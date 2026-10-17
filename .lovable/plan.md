# Cupom de desconto no checkout + gestão no Admin

## O que o cliente vê (preencher dados)
- Novo campo "Adicionar cupom de desconto" com botão "Aplicar".
- Cupom válido e ativo: aparece "Cupom XXX aplicado (-10%)", e o resumo mostra Subtotal, Taxa de entrega, Desconto do cupom e Total final.
- Cupom inexistente ou desativado: mensagem "Cupom inválido ou desativado" e nenhum desconto.
- Botão para remover o cupom aplicado.
- O % é aplicado sobre o valor total do pedido (itens + taxa de entrega).
- Maiúsculas/minúsculas não importam ("NATAL10" = "natal10").

## O que o Admin faz (nova aba "Cupons")
- Criar cupom: palavra do cupom + % de desconto (1 a 100).
- Editar palavra e %.
- Ativar / desativar com um botão. Desativado não funciona até o admin ativar de novo.
- Excluir (com confirmação).
- Lista mostra palavra, %, situação (Ativo/Desativado).

## Registro e relatórios
- O pedido grava qual cupom foi usado e o valor descontado.
- O desconto do cupom entra no mesmo campo de desconto já existente, então relatórios, e-mail, financeiro e comanda impressa já mostram o valor com desconto (motivo: "Cupom XXX").
- Na conferência de pagamento da cozinha o total a receber já vem com o desconto do cupom.
- Relatório do turno e do dia (impresso, e-mail e Admin) ganham a seção "Cupons usados": quantidade total de cupons usados, total descontado e a lista de pedidos (nº do pedido, cliente, cupom, valor descontado).

## Detalhes técnicos
- Migração: tabela `public.coupons` (id, code text unique em lower(code), percent numeric 1–100, is_active bool default true, timestamps), GRANT para authenticated/service_role, RLS só admin (has_role) para select/insert/update/delete. Coluna `orders.coupon_code text` nullable.
- Server function pública `validateCoupon` (supabaseAdmin no handler) retorna só `{ valid, code, percent }`.
- `createGuestOrder`: recebe `couponCode` opcional, revalida no servidor (ativo), calcula `discount = round(total * percent/100, 2)`, grava `discount_amount`, `discount_reason = "Cupom CODE"`, `coupon_code`. Nunca confia no valor enviado pelo cliente.
- `CartSheet.tsx`: campo do cupom, estado do cupom aplicado e resumo.
- `admin.index.tsx`: nova aba CouponsPanel (CRUD + toggle), inputs sem autocorreção.
- Relatórios: coluna `coupons_summary jsonb default '[]'` em `shift_reports` e `daily_reports`; `reports-service.ts` monta a lista a partir de `orders.coupon_code`; `report.ts`, templates de e-mail e `ReportsViewer.tsx` exibem a seção.
- Teste: cálculo do desconto (ex.: total R$ 50 com 10% → R$ 5) e rejeição de cupom desativado.
