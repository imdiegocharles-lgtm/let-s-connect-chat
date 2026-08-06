
# Plano de Implementação: Acompanhamentos para Almoço

Este plano descreve a implementação de acompanhamentos opcionais/obrigatórios para os pratos da categoria "Almoço", seguindo o padrão visual e lógico já existente para espetos.

## 1. Banco de Dados (Supabase)

- **Nova Tabela `acompanhamentos`**:
    - `id`: uuid (PK)
    - `name`: text (não nulo)
    - `is_active`: boolean (default true)
    - `created_at`: timestamp
- **Alteração na Tabela `menu_items`**:
    - Adicionar coluna `has_side_dish`: boolean (default false)
- **RLS e Permissões**:
    - Habilitar RLS na tabela `acompanhamentos`.
    - Garantir permissão de leitura para `authenticated` e `anon`.
    - Garantir permissão total para `service_role`.
- **Dados Iniciais (Seed)**:
    - Cadastrar: Batata Frita, Purê de batata, Maionese, Salpicão, Macarronese, Legumes no vapor, Salada.

## 2. Painel Administrativo (`src/routes/admin.index.tsx`)

- **Aba "Acompanhamentos"**:
    - Interface CRUD completa (Listar, Adicionar, Editar nome, Alternar status, Excluir).
- **Gestão de Itens (`ItemsPanel`)**:
    - Adicionar toggle "Tem acompanhamento?" no diálogo de criação/edição de itens do cardápio.
    - Garantir que essa opção seja salva no campo `has_side_dish` do banco.

## 3. Fluxo do Cliente (`MenuBrowser.tsx`)

- **Lógica de Seleção**:
    - No `handleAdd`, verificar se o item possui `has_side_dish === true`.
    - Se sim, abrir um diálogo (similar ao de espetos) listando os acompanhamentos ativos.
    - O acompanhamento selecionado será anexado ao nome do item e salvo nos `extras`.
- **Formatação do Item**:
    - Nome do item no carrinho: `Nome do Prato (Acompanhamento: Nome Selecionado)`.
    - `extras`: `{ acompanhamento: string, acompanhamento_id: string }`.

## 4. Finalização do Pedido (`src/lib/orders.functions.ts` e `CartSheet.tsx`)

- **Persistência de Extras**:
    - Atualizar o schema e a função `createGuestOrder` para aceitar e salvar o campo `extras` no banco de dados (`order_items`).
    - Atualizar `CartSheet.tsx` para passar o campo `extras` ao chamar `createGuestOrder`.

## 5. Relatórios (`src/lib/reports-service.ts`)

- **Agregação de Dados**:
    - Adicionar uma nova regex/lógica para detectar acompanhamentos nos nomes dos itens (ex: `(Acompanhamento: ...)`).
    - Incluir a contagem de acompanhamentos nos relatórios de turno e diários (seção separada ou similar aos combos).
    - Atualizar os templates de e-mail (se necessário) para exibir essas informações.

## Verificação

- [ ] Criar tabela e coluna via migração SQL.
- [ ] Testar CRUD de acompanhamentos no admin.
- [ ] Testar toggle "Tem acompanhamento" em um prato de almoço.
- [ ] Validar fluxo de seleção obrigatória no cardápio.
- [ ] Confirmar que o acompanhamento aparece no carrinho e no pedido finalizado.
- [ ] Verificar se os relatórios contabilizam corretamente as escolhas.
