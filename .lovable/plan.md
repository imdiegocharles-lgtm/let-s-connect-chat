## 1. Domínio de e-mail (informativo)

Não há verificação alternativa por MX/SPF/DKIM: o envio exige a delegação NS do subdomínio. Como você decidiu transferir `familiaamaral.com.br` para dentro do Lovable, a delegação passa a ser automática — nada a fazer no código.

## 2. Cadastro e gestão de motoboys

Hoje existe a tabela `motoboys` (nome, diária, ativo) e o vínculo `shift_motoboys` / `orders.motoboy_id`, mas **não há nenhuma tela** — a tabela está vazia e o código só grava `motoboy_id: null`.

- Nova aba **Motoboys** no painel Admin: cadastrar, editar nome e valor da diária, ativar/desativar.
- Na abertura de turno (painel Operacional): selecionar quais motoboys estão trabalhando no turno (grava em `shift_motoboys`).
- Na tela de pedidos: escolher o motoboy que saiu com a entrega (grava `orders.motoboy_id`).
- No fechamento do turno: bloco "Motoboys" com nome, diária, nº de entregas e total de diárias a pagar.

## 3. Relatórios detalhados por item

Hoje os relatórios trazem só faturamento, taxas e formas de pagamento. Passarão a trazer também a composição das vendas:

- Espetos vendidos, quantidade por tipo.
- Combos "completo", contabilizados como combo **e** com o espeto escolhido somado à contagem daquele tipo de espeto.
- Bebidas, quantidade por tipo.
- Demais itens do cardápio, quantidade.

Aparece nos três relatórios: turno do almoço, turno do churrasco e relatório do dia — tanto na impressão na Elgin i9 quanto no e-mail.

## Detalhes técnicos

- Migração: colunas `items_summary jsonb` e `motoboys_summary jsonb` em `shift_reports` e `daily_reports` (default `[]`).
- `reports-service.ts`: agregar `order_items` (nome, quantidade, `extras` para o espeto do combo) apenas de pedidos com pagamento confirmado; consolidar no relatório do dia somando os turnos.
- `receipt.ts`: nova seção ESC/POS "ITENS VENDIDOS" e "MOTOBOYS" no cupom de fechamento (80mm).
- `email-templates/daily-report.tsx`: tabelas de itens e motoboys no mesmo visual atual.
- Novos componentes: `src/components/admin/MotoboysManager.tsx` e seletor de motoboy no `operacional.tsx`.
