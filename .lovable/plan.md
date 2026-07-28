# Plano de implementação

## 1. Banco de dados (Lovable Cloud)
Nova migração criando duas tabelas públicas:

- **reservations**: `customer_name`, `phone`, `people_count` (≥10), `location` (varanda | salao | segundo_andar), `reservation_date` (date), `status` (pendente | confirmada | cancelada, default pendente), `created_at`, `updated_at`.
  - RLS: qualquer um pode INSERT (formulário público). Apenas admin pode SELECT/UPDATE/DELETE.
- **reviews**: `rating` (1-5), `comment` (text), `created_at`.
  - RLS: qualquer um pode INSERT anônimo. Apenas admin pode SELECT/DELETE. (sem coleta de dados pessoais).

GRANTs corretos para `anon`/`authenticated`/`service_role`.

## 2. Página inicial (`src/routes/index.tsx`)

- Adicionar botão de destaque **📅 Faça sua Reserva** no topo (acima ou dentro do hero) com subtítulo "Reservas disponíveis apenas para grupos a partir de 10 pessoas."
- Adicionar botão/link nas estrelas **⭐ 4.9** que abre modal de avaliação.
- Trocar "30–45 min" por "40–80 min" + linha "Entrega podendo ocorrer antes do prazo informado." (tanto no hero quanto na faixa de info).
- Remover subtítulo abaixo da logo ("Churrasquinho & Restaurante") no header, ajustando espaçamento.
- Rodapé: remover "@familiaamaral" (bloco Instagram inteiro removido do rodapé), substituir "Em breve" do endereço por "Rua Monteiro Lobato, 18 – Estrela do Norte – São Gonçalo/RJ", trocar telefone/WhatsApp por placeholder (link real a informar).

## 3. Modal de Reserva (`src/components/reservations/ReservationDialog.tsx`)

- Calendário do mês atual (`shadcn Calendar`).
- Desabilitar: datas passadas, sextas-feiras (day=5), domingos (day=0).
- Ao selecionar data válida → mostrar formulário:
  - Nome completo (obrigatório)
  - Quantidade de pessoas (obrigatório, ≥10; se <10 mostrar mensagem de bloqueio)
  - WhatsApp (obrigatório)
  - Local (Varanda / Salão / Segundo Andar) — select obrigatório
- Rodapé do form: "Sua reserva permanecerá válida até às 19:30h..."
- Botão **Confirmar Reserva** → insert em `reservations` (status pendente) via cliente Supabase, exibir toast/mensagem de sucesso.

## 4. Modal de Avaliação (`src/components/reviews/ReviewDialog.tsx`)

- Estrelas 1–5 (clicáveis), campo de comentário livre, botão **Enviar Avaliação**.
- Insert anônimo em `reviews`. Confirmar com toast.

## 5. Painel Administrativo (`src/routes/admin.index.tsx`)

Adicionar duas novas abas:

- **🍽️ Reservas**: listagem ordenada por data de solicitação (mais recentes primeiro), com:
  - busca por nome, busca por telefone, filtro por data;
  - badge de status colorido (🟡🟢🔴);
  - ações: alterar status (dropdown) e excluir.
- **⭐ Avaliações**: lista com estrelas, comentário, data e botão excluir.

## 6. Detalhes técnicos

- Cliente Supabase browser para inserts públicos e para leituras admin (RLS já restringe).
- Realtime opcional nas reservas para o admin (nice-to-have; pode ficar de fora nesta primeira versão).
- Toasts via `sonner` já configurado.
- Componentes seguem tokens de design existentes (vermelho/preto/branco).

## 7. Fora do escopo desta entrega

- Link real do WhatsApp — aguardando o usuário informar.
- Envio automático de notificações para o cliente (contato é manual pelo admin, conforme pedido).

Confirma que posso seguir com esse plano?
