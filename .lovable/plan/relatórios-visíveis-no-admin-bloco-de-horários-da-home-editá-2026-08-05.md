# Relatórios visíveis no Admin + bloco de horários da home editável

## Parte 1 — Ver relatórios completos no Admin

Hoje os relatórios só aparecem no Painel Operacional, apenas do dia atual, e mostram só faturamento e formas de pagamento — os detalhes já gravados (itens vendidos, espetos dos combos, motoboys) não são exibidos em tela, só saem impressos/por e-mail.

O que passa a existir em **Admin > Relatórios** (nova aba):

- Seletor de data (padrão: hoje), para consultar qualquer dia já fechado.
- Lista dos relatórios de turno do dia escolhido (Almoço/Dia e Churrasco/Noite) com operador, horário de abertura/fechamento, caixa inicial, pedidos pagos, faturamento, taxas de entrega e totais por forma de pagamento.
- Botão "Ver detalhes" abrindo a visualização completa com todos os blocos já programados:
  - Itens vendidos (nome, quantidade, valor)
  - Espetos inclusos nos Completos (contagem separada dos avulsos)
  - Motoboys (nome, diária, corridas, custo total) e valor líquido
  - Totais por forma de pagamento e resumo financeiro
- Relatório do dia (consolidado) com os mesmos blocos detalhados e o resumo por turno.
- Ações: reimprimir na Elgin e reenviar o relatório do dia por e-mail (mesmas funções já usadas no Operacional).

O painel Operacional continua igual; o Admin ganha a visualização completa e o histórico por data.

## Parte 2 — Bloco de horários da home editável

Na home, o cartão "Horário do churrasco / Seg–Sáb 18h às 00h · Dom 11h às 00h" passa a ser totalmente editável no Admin, com o conteúdo já corrigido como padrão:

Título: **Horário do Delivery**

Texto:
```text
Almoço: SEG - SÁB 11h às 14:30h
Churrasco: SEG - SÁB 18h às 00h
DOMINGO não temos delivery, somente presencial com churrasco de 11h às 00h.
```

Em **Admin > Configurações**, no bloco de textos do site, entram dois campos novos: título do cartão e texto (várias linhas). Ao salvar, a home atualiza automaticamente. Se o texto ficar em branco, volta a montar o horário automaticamente a partir da grade cadastrada.

## Detalhes técnicos

- Migração: adicionar `home_horario_titulo text` e `home_horario_texto text` em `public.avisos_loja` (linha id = 1) com os valores acima como padrão; as políticas atuais (leitura pública, escrita admin) já cobrem as novas colunas.
- `src/lib/store-hours.ts`: estender o tipo `AvisoLoja`, o `select` de `fetchAvisoLoja` e o `DEFAULT_AVISO`.
- `src/routes/index.tsx`: o `Strip` de horário usa os novos campos (com `whitespace-pre-line`), caindo no `formatSchedule` atual quando vazio.
- `src/routes/admin.index.tsx`: campos novos no `AvisoFechadoPanel` (mesma mutação e `invalidateQueries` de `avisos_loja`); nova aba `reports`.
- Novo `src/components/admin/ReportsViewer.tsx`: usa `getShiftReports(date)` / `getDailyReport(date)` de `src/lib/reports-service.ts` e renderiza `items_summary`, `combos_summary`, `motoboys_summary`, `totals_by_payment` e `shifts_summary`; reimpressão via `buildShiftReportBytes`/`buildDailyReportBytes` + `sendBytesToPrinter`, e e-mail via `sendDailyReportEmail`.
- Sem mudança na geração/agregação dos relatórios — apenas leitura e exibição.