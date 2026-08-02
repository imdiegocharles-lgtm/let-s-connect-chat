## 1. Confirmação automática de e-mail

Ativar o auto-confirm no cadastro: o cliente cria a conta e já entra direto, sem precisar clicar em link no e-mail. (Configuração de autenticação, sem mudança de banco.)

## 2. Painel Operacional — fluxo mais rápido

Hoje o operador precisa de 3 cliques de status ("Mover para em preparo" → "saiu para entrega" → "entregue") e depois ainda um 4º clique em "Confirmar pagamento", que abre outro diálogo. Vou reduzir isso mantendo tudo que já existe.

**No cartão do pedido:**

- Uma barra de etapas clicável (Recebido · Em preparo · Saiu p/ entrega · Entregue): o operador pode tocar direto em qualquer etapa adiante e o pedido pula para ela — de "recebido" para "entregue" em um único toque quando for pedido de balcão/entrega rápida.
- O botão principal continua sendo "avançar uma etapa", só que maior e sem sair do lugar (não muda a posição do cartão até concluir), com atualização otimista: a etapa muda na hora, sem esperar a resposta do servidor.
- Quando o operador marcar **"entregue"**, o diálogo de confirmação de pagamento + motoboy **abre sozinho na sequência**, já preenchido com a forma de pagamento que o cliente escolheu e com o motoboy usado por último no turno pré-selecionado. Um clique em "Confirmar" fecha o ciclo.
- Se o operador fechar o diálogo sem confirmar, o pedido segue como está hoje: fica em "Entregues" com o aviso âmbar e o botão "Confirmar pagamento" para retomar depois.

**Resultado:** um pedido normal passa a ser resolvido em ~2 interações (etapa "entregue" + confirmar pagamento), em vez de 4 cliques espalhados.

## 3. O que NÃO muda

- Nenhuma tabela, coluna ou tela nova. Usa `orders.status`, `confirmed_payment_method`, `payment_confirmed_at`, `motoboy_id` e a tabela `motoboys` já existentes.
- Permissões (`can_update_order_status`, `can_confirm_payment`), relatórios, impressão e o acompanhamento do cliente em `/meus-pedidos` continuam iguais.

## Detalhes técnicos

Alterações concentradas em `src/routes/operacional.tsx`: `OrderCard` ganha a barra de etapas clicável e passa a chamar `onStatus(status)` para qualquer etapa à frente; `updateStatus` recebe update otimista no cache do React Query; `onSuccess` da mutação abre o `ConfirmPaymentDialog` quando o novo status é `delivered` e o pedido ainda não tem `payment_confirmed_at`; `ConfirmPaymentDialog` passa a inicializar o método com `order.payment_method` e o motoboy com o último usado no turno. Configuração de auth: auto-confirm de e-mail ativado.
