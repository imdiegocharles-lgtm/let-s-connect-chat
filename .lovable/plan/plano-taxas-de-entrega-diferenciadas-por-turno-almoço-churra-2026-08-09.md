# Plano: Taxas de Entrega Diferenciadas por Turno (Almoço/Churrasco)

Implementar dois valores de taxa de entrega para cada bairro (um para o turno de almoço e outro para o turno de churrasco/noite). A taxa correta será aplicada automaticamente no checkout com base no turno aberto.

## Alterações

### 1. Banco de Dados (Supabase)
- Adicionar colunas `fee_almoco` (numeric) e `fee_noite` (numeric) à tabela `neighborhoods`.
- Migrar os dados da coluna `fee` atual para ambas as novas colunas como valor padrão inicial.
- Manter a coluna `fee` por compatibilidade ou removê-la após a transição total (preferível manter por segurança inicialmente).

### 2. Frontend - Admin (`src/routes/admin.index.tsx`)
- Atualizar o tipo `Neighborhood` para incluir `fee_almoco` e `fee_noite`.
- Modificar o `NeighborhoodsPanel` para exibir as duas taxas na lista de bairros.
- Atualizar o `NeighborhoodDialog` para incluir campos de input para ambas as taxas e enviar os novos campos no payload de `update`/`insert`.

### 3. Frontend - Checkout (`src/components/menu/CartSheet.tsx`)
- Atualizar a query de bairros para buscar os novos campos.
- Implementar a lógica de seleção automática da taxa:
    - Se o turno atual for `almoco`, usar `fee_almoco`.
    - Se o turno atual for `noite` (churrasco), usar `fee_noite`.
- Garantir que o valor total do pedido reflita a taxa correta baseada no turno ativo.

### 4. Lógica de Negócio (`src/lib/orders.functions.ts` ou similar)
- Verificar se a criação de pedidos no servidor precisa validar o valor da taxa de entrega comparando com o turno ativo no banco de dados para evitar manipulação client-side.

## Verificação
- Abrir turno de almoço e verificar se o checkout aplica a taxa de almoço.
- Abrir turno de churrasco e verificar se o checkout aplica a taxa de noite.
- Testar a edição de ambas as taxas no painel administrativo.
