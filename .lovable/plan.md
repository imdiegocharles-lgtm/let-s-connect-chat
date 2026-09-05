# Desconto na confirmação do pagamento (liberado por senha)

## O que muda na tela

Na segunda conferência (janela "Confirmar pagamento" / "Editar motoboy / pagamento") entra um bloco novo de desconto:

- Botão "Aplicar desconto" (bloqueado por padrão).
- Ao clicar, aparece um campo de senha: é a mesma senha administrativa usada para excluir pedidos.
- Só depois da senha correta o campo de valor do desconto é liberado. Sem senha, nada de desconto.
- Com o desconto liberado, aparece também um campo de motivo do desconto (obrigatório) e o valor.
- Os totais se atualizam na hora: Total do pedido, Desconto, Total a receber. As formas de pagamento passam a ter que fechar com o total já com desconto.
- O desconto não pode ser maior que o total do pedido.

## O que fica registrado

- Valor do desconto, motivo, quem autorizou e quando ficam gravados no pedido.
- O faturamento passa a considerar o valor realmente recebido (com o desconto abatido), então relatório de turno, relatório do dia, e-mail e financeiro batem com o caixa.
- No relatório impresso e no e-mail, os pedidos com desconto mostram o valor concedido.

## Detalhes técnicos

- Migração: colunas `discount_amount numeric not null default 0`, `discount_reason text`, `discount_authorized_by uuid`, `discount_authorized_at timestamptz` em `public.orders`.
- Nova server function `verifyDeletionPassword` em `src/lib/orders-admin.functions.ts` (mesma comparação SHA-256 de `system_settings.deletion_password_hash`, com `requireSupabaseAuth`), retornando apenas `{ valid: boolean }`.
- Nova server function `applyOrderDiscount` (autenticada, valida senha novamente no servidor antes de gravar): grava desconto, motivo, autor e data; a senha nunca é validada só no cliente.
- `src/routes/operacional.tsx`: no `ConfirmPaymentDialog`, estado `discountUnlocked`, campos de senha/valor/motivo, `orderTotal` passa a ser `total - desconto` para o cálculo de `sum`/`diff`; a mutação `confirmPayment` chama `applyOrderDiscount` antes de gravar os pagamentos.
- `src/lib/reports-service.ts` e `src/lib/financial.functions.ts`: usar o total líquido (`total - discount_amount`) no faturamento e somar os descontos do turno/dia.
- `src/lib/report.ts` e os templates de e-mail: linha de desconto por pedido e total de descontos no fechamento.
