# Plano — Próximas entregas (Família Amaral)

Sem mexer em identidade visual, layout geral, organização do cardápio ou funcionalidades já prontas. Só adiciono/ajusto o pedido abaixo.

## 1) Upload/troca de imagens dos produtos + card 65% foto

- Criar bucket **público** `menu-images` no Lovable Cloud com RLS: leitura pública, upload/update/delete apenas para `admin`.
- No painel Admin → aba **Itens**: substituir o campo "URL da imagem" por **uploader** (arrastar/clicar). Ao salvar, sobe arquivo para `menu-images/{itemId}-{timestamp}.jpg` e grava a URL pública em `menu_items.image_url`. Botão "Trocar foto" e "Remover foto".
- Ajustar `MenuBrowser.tsx`: cards com **~65% de altura ocupada pela foto** (aspect-ratio + `object-cover`), preservando estilo/typography atuais e o selo "🏆 Campeão de Vendas".

## 2) Controle de turnos (Operacional)

- Já existe tabela `shifts`. Adicionar UI em `/operacional`:
  - Ao entrar sem turno aberto → modal **"Abrir turno"**: seleciona *Almoço* ou *Noite*, informa **caixa inicial (R$)** e confirma. Grava `operator_id`, `operator_name`, `opening_cash`, `opened_at`.
  - Cabeçalho mostra turno aberto (tipo, operador, hora de abertura, caixa inicial) e botão **"Fechar turno"**.
  - Fechar turno: **bloqueado** se houver pedidos com status ≠ `delivered` **ou** pagamento não confirmado ainda pendente do turno. Mensagem clara listando pendências.
  - Todo novo pedido criado enquanto turno aberto é vinculado (`orders.shift_id`) via trigger baseado no turno ativo do tipo correspondente ao horário.

## 3) Confirmação de pagamento real (pós-motoboy)

- No card do pedido (Operacional), quando status = **Entregue**, exibir bloco **"Confirmar pagamento"**:
  - Select da forma real recebida (mesmas opções: dinheiro/crédito/débito/sodexo/alelo/pix).
  - Botão **"Confirmar recebimento"** → grava `confirmed_payment_method` + `payment_confirmed_at`.
- **Faturamento** = soma apenas de pedidos com `payment_confirmed_at IS NOT NULL`. Pedidos entregues sem confirmação aparecem como **"Aguardando pagamento"** e bloqueiam fechamento de turno.

## 4) Relatórios de turno + consolidado do dia

- Ao fechar turno gerar relatório com:
  - Turno, operador, abertura/fechamento, caixa inicial.
  - Nº de pedidos, ticket médio, faturamento (só confirmados), quebra por forma de pagamento, top itens, taxas de entrega.
- **Impressão automática** do relatório via mesmo agente ESC/POS.
- Ao fechar o **turno da noite**, também imprime o **consolidado do dia** (soma almoço + noite).
- Botão manual "Reimprimir relatório" nos turnos fechados (lista no Admin).
- **E-mail**: preparar server function `send-shift-report` (usa `system_settings.report_emails`); só dispara quando houver domínio configurado — hoje fica com log/no-op e aviso "envio será ativado quando domínio de e-mail for configurado".

## 5) Marcar produto indisponível no Operacional

- Já existe policy `operator_toggle_availability`. Adicionar aba/tela **"Cardápio"** em `/operacional` (só leitura + toggle `is_available`) com busca por nome/categoria. Sem editar preço/descrição.

## 6) Impressora: detecção, seleção, status e reconexão

O navegador **não enxerga impressoras locais do Windows** — quem faz isso é o agente. Vou entregar dos dois lados:

**Agente local (documentar + fornecer script Node.js pronto)**
- Script `printer-agent.js` (Node + `pdf-to-printer`/`node-thermal-printer`) que:
  - `GET /printers` → lista impressoras instaladas no Windows.
  - `GET /status?name=...` → retorna `connected: true/false` (checa spooler).
  - `POST /print?name=...` → imprime bytes ESC/POS recebidos.
  - CORS liberado só para o domínio Lovable + `localhost`.
- Instruções passo a passo (instalar Node, `npm i`, `node printer-agent.js`, atalho na inicialização do Windows).

**UI no Operacional**
- Cabeçalho ganha bloco "Impressora":
  - Select com impressoras retornadas por `/printers` (autopreenche a padrão do Windows).
  - Indicador **● Conectada / ● Desconectada** (poll `/status` a cada 5s).
  - Botão **"Testar impressão"** (já existe, mantido).
  - **Reconexão automática**: se `/status` falhar, tenta novamente a cada 5s até voltar. Toast "Impressora reconectada" quando volta.
  - Se impressão de pedido falhar: **toast destacado + banner vermelho persistente** "Falha ao imprimir pedido #XXXX — clique para reimprimir".
- Preferência da impressora escolhida guardada em `localStorage`.

## Detalhes técnicos

- Migração: bucket `menu-images` + policies; trigger para setar `shift_id` no insert de `orders`; policies leitura de `shifts` para operator/admin (já existem).
- Server fn `close-shift` (`requireSupabaseAuth` + verifica role admin/operator): valida pendências, fecha turno, retorna payload do relatório.
- Server fn `send-shift-report` (stub até domínio ativo).
- Ajuste `receipt.ts`: helper `buildShiftReportBytes(report)` reutilizando ESC/POS.
- `MenuBrowser.tsx`: apenas ajustes de classe/aspect, sem mudar cores/tokens.

## Ordem de execução

1. Migração (bucket + trigger shift_id).
2. Upload de imagens no Admin + ajuste 65% no card.
3. UI de turnos + trigger + bloqueio de fechamento.
4. Confirmação de pagamento + faturamento filtrado.
5. Fechar turno → relatório → impressão automática + consolidado do dia.
6. Aba Cardápio no Operacional (toggle disponibilidade).
7. UI de impressora (lista/status/reconexão) + script `printer-agent.js` + guia de instalação.

Confirma que sigo nessa ordem?
