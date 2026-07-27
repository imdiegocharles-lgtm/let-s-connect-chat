## Auditoria do sistema atual

**O que já existe e será preservado:**
- Site público (`/`) — hero, logo 4K, horários, link Instagram, cardápio
- Cardápio (`MenuBrowser`) com aba "🏆 O MAIS PEDIDO" primeiro, selo "CAMPEÃO DE VENDAS", diálogo de escolha de espeto para completos
- Carrinho persistente (`CartSheet`) com validações obrigatórias (nome, telefone, endereço, bairro, pagamento, observações)
- Painel Admin (`/admin`) com abas Itens, Categorias, Bairros
- Login (`/auth`) via e-mail/senha, admin whitelist via `claim_admin_if_whitelisted`
- Tela Cozinha (`/admin/cozinha`) com realtime, som, auto-impressão ESC/POS via agente Elgin local
- Banco: `menu_categories`, `menu_items`, `orders`, `order_items`, `neighborhoods`, `profiles`, `user_roles`, numeração diária de pedidos

**Identidade visual, layout e organização do cardápio serão mantidos intactos.**

---

## Correções antes de novas features

1. **Erro 404 em `/admin/cozinha`**: a rota existe no arquivo `admin.cozinha.tsx` e no `routeTree.gen.ts`, mas ela renderiza como filha de `/admin` sem `<Outlet />` no `admin.tsx`. Corrigir: transformar `admin.tsx` no dashboard direto (rota index) e mover Cozinha para rota irmã, OU adicionar `<Outlet />` no admin e mover conteúdo para `admin.index.tsx`. Vou usar a segunda opção.
2. Validar todas as rotas após alterações para garantir zero 404.

---

## Novos módulos (nesta ordem)

### 1) Controle de acesso em 3 níveis
- Nova role `operator` (enum `app_role`)
- Função `claim_operator_if_whitelisted` opcional; admin cria operadores via painel
- Rotas separadas:
  - `/admin` → **somente admin** (gestão de produtos, categorias, bairros, promoções, horários, usuários, configurações, relatórios históricos, dashboard)
  - `/operacional` → **operador OU admin** (antiga cozinha + turnos + relatórios + confirmar pagamento + marcar indisponível)
- Login único em `/auth`, mas redireciona por role. Admin nunca compartilha senha; operador tem conta própria criada pelo admin.

### 2) Horários automáticos do cardápio
- Nova tabela `menu_categories.availability_window` (JSON): `{ lunch: bool, dinner: bool }`
- Configurar categorias existentes:
  - Almoço → lunch
  - Espetos/Combos/Porções/Petiscos/Sobremesas → dinner
  - Bebidas (refri, não alcoólicas, cervejas) → lunch + dinner
- Nova tabela `restaurant_hours` (configurável pelo admin) com janelas: `lunch_start=11:00, lunch_end=14:30, dinner_start=18:00, dinner_end=23:59`
- No frontend, filtrar categorias/itens pelo horário atual (client-side com hora do Brasil)
- Fora de horário: banner "Restaurante preparando o churrasco / Fechado — abrimos às XX:XX" e desabilita checkout

### 3) Upload de imagens (sem código, sem créditos)
- Bucket público `menu-images` no Storage
- No painel admin, campo de upload direto no editor de item (preview + trocar + remover)
- Cards do cardápio: foto ocupando ~70% da altura, produto vendendo pela imagem

### 4) Turnos e pagamentos confirmados
- Tabela `shifts`: `id, type ('lunch'|'dinner'), operator_id, opened_at, closed_at, opening_cash`
- Coluna `orders.shift_id`, `orders.confirmed_payment_method`, `orders.payment_confirmed_at`
- No painel operacional:
  - Botão Abrir/Fechar turno (bloqueia fechamento se houver pedidos pendentes)
  - Ao clicar num pedido finalizado, diálogo "Confirmar pagamento recebido" com opções Pix/Crédito/Débito/Dinheiro/Sodexo/Alelo — só entra no faturamento após confirmar
  - Botão marcar item como indisponível (toggle `is_available`)

### 5) Relatórios automáticos
- Server function `generateShiftReport(shiftId)` que calcula: qtd pedidos, faturamento (só confirmados), top produtos, delivery/retirada, pagamentos confirmados, horários, operador
- Ao fechar turno: imprime ESC/POS na Elgin + envia por e-mail (Lovable Emails)
- Ao fechar turno da noite: também gera e envia o **Consolidado do Dia** (almoço + noite)
- Configuração de destinatários no painel admin

### 6) Configurações (painel admin)
- Nova aba "Configurações": horários (almoço/churrasco), tempo médio de preparo, valor mínimo do pedido, endereço da impressora, e-mails dos relatórios

### 7) Impressão robusta
- Manter fluxo atual ESC/POS via agente Elgin local
- Retry automático + alerta visual em caso de falha + botão reimprimir (já existe parcialmente)

---

## Detalhes técnicos

- **Banco**: migrações para enum `operator`, tabelas `shifts`, `restaurant_hours`, `system_settings`, `report_recipients`; colunas em `orders` e `menu_categories`; policies RLS por role usando `has_role`
- **Storage**: bucket público `menu-images` com policies (admin escreve, todos leem)
- **E-mail**: usar Lovable Emails (necessita domínio próprio para envio real; se ainda não configurado, mostro o fluxo de setup na primeira geração de relatório)
- **Rotas**:
  ```text
  /                      público
  /auth                  público (login unificado, redireciona por role)
  /admin/                admin only  (dashboard, itens, categorias, bairros, promoções, horários, usuários, configs, relatórios históricos)
  /operacional/          operator+admin (pedidos tempo real, turnos, confirmar pgto, indisponibilidade, relatórios do turno)
  ```
- **Componentes novos**: `ShiftManager`, `PaymentConfirmDialog`, `ImageUpload`, `ScheduleSettings`, `UsersManager`, `ReportViewer`

---

## Ordem de execução

1. Corrigir 404 da Cozinha (mover para `/operacional` com layout próprio)
2. Migração: role `operator`, tabelas de turnos/configs/pagamento confirmado, bucket de imagens, availability_window
3. Configurações + horários automáticos + filtro do cardápio
4. Upload de imagens + cards com foto grande (70%)
5. Painel operacional novo (turnos, confirmar pagamento, indisponível)
6. Relatórios automáticos + envio por e-mail (requer domínio configurado)
7. Gestão de usuários operadores no painel admin
8. Validar todas as rotas

---

## Pontos que precisam da sua confirmação

1. **E-mail para relatórios**: você precisa ter um domínio próprio configurado no Lovable Emails para o envio automático funcionar. Você já tem um domínio? Se não, os relatórios ficarão só na tela + impressão até você configurar.
2. **Contas de operador**: quer que eu já crie uma conta operador de teste, ou você cria depois pelo painel admin?
3. **Valor mínimo do pedido**: tem valor definido hoje ou começamos em R$ 0 e você ajusta na tela de configurações?
4. **Fechamento automático de turno**: se o operador esquecer, quer que o sistema feche sozinho após o horário limite, ou só manual?
