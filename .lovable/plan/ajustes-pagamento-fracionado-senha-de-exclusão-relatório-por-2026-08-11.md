# Ajustes: pagamento fracionado, senha de exclusão, relatório por e-mail e turnos

## 1. Pagamento fracionado (várias formas no mesmo pedido)

Hoje a confirmação grava uma única forma em `confirmed_payment_method`. Vou criar uma tabela `order_payments` (pedido, forma, valor) e transformar o modal "Confirmar pagamento" em uma lista de linhas:

- Botão "+ Adicionar forma de pagamento" cria uma nova linha (forma + valor).
- Mostra em tempo real: Total do pedido, Total informado e Diferença.
- Só permite confirmar quando a soma bater com o total do pedido.
- Com uma única forma, o fluxo continua igual ao de hoje (1 clique, valor preenchido automaticamente).
- O pedido continua guardando um resumo: uma forma só quando for única, ou "Misto" quando fracionado.

Relatórios (impresso, e-mail e financeiro) passam a somar por forma usando os valores reais de cada fração, então "Dinheiro / Crédito / Débito" ficam corretos mesmo em pedidos divididos.

## 2. Senha administrativa para excluir pedidos

- Nova senha exclusiva de exclusão, cadastrada no Admin (aba Configurações), separada da senha de login. Guardada apenas como hash no banco.
- No painel da cozinha, o modal de exclusão passa a exigir **motivo** (mínimo 5 caracteres) **e** a senha de exclusão.
- A validação é feita no servidor: sem senha correta, nada é excluído. Continua registrando motivo, data e o pedido nos relatórios.
- A verificação por cargo (admin/operador) continua valendo, então a cozinha consegue excluir informando a senha.

## 3. Relatório de e-mail igual ao impresso

O e-mail hoje mostra só "diária" do motoboy. Vou igualar ao cupom impresso:

- Bloco Motoboys detalhado: entregas, valor de entregas, ajuda de gasolina e TOTAL A RECEBER por motoboy, mais o total geral.
- Bloco "Pedidos Excluídos" (número, cliente, valor e motivo).
- Mesma ordem e mesmos totais do impresso, tanto no relatório de turno quanto no relatório do dia.

## 4. Numeração dos pedidos

Verifiquei no banco: no turno da noite de 10/08 os pedidos foram 1..7 e, após a meia-noite, voltaram a 1..4 — exatamente o comportamento antigo baseado em data. A regra por turno já foi corrigida depois disso e os turnos de 11/08 estão corretos (almoço 1..7, noite 1..8). Para não depender de sorte em pedidos simultâneos, vou reforçar:

- Trava de concorrência na geração do número (dois pedidos ao mesmo tempo não recebem o mesmo número).
- Índice único de `número por turno`.
- Pedidos excluídos não devolvem o número: a sequência segue crescendo até o fim do turno.

Observação: cada turno novo começa em 1 novamente (almoço e churrasco têm numeração própria), como está hoje.

## 5. Aba de pedidos zera a cada turno

A lista da cozinha hoje busca os últimos 50 pedidos de qualquer turno. Vou passar a filtrar pelo turno aberto:

- Sem turno aberto: lista vazia.
- Turno novo: 0 pedidos ativos e 0 entregues; nada dos turnos anteriores aparece.
- Nada é apagado — o histórico continua inteiro nos relatórios e no financeiro.

## Detalhes técnicos

- Migração: tabela `public.order_payments` (order_id, method, amount) com GRANTs e RLS (leitura/escrita para `authenticated`); coluna de hash da senha de exclusão em `system_settings`; índice único `(shift_id, order_number)`; `set_daily_order_number` com `pg_advisory_xact_lock` por turno.
- `src/routes/operacional.tsx`: modal de pagamento multi-linha, modal de exclusão com senha, query `kitchen-orders` filtrada por `shift_id` do turno ativo.
- `src/lib/orders-admin.functions.ts`: validação do hash da senha antes da exclusão; nova função para gravar pagamentos fracionados.
- `src/lib/reports-service.ts`: `totals_by_payment` a partir de `order_payments` com fallback para `confirmed_payment_method`.
- `src/lib/email-templates/daily-report.tsx` e `shift-report.tsx`: `MotoboysSection` detalhada e nova `DeletedOrdersSection`.
- `src/routes/admin.index.tsx`: campo para definir/alterar a senha de exclusão.
