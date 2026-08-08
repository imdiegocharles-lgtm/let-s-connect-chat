# Plano de Implementação - Validação de Turno Aberto para Pedidos

O objetivo é garantir que pedidos só possam ser realizados se houver um turno (Almoço ou Churrasquinho) explicitamente aberto no painel operacional, separando a navegação do cardápio (sempre disponível) da capacidade de efetuar o pedido.

## Alterações

### 1. Banco de Dados (Supabase)
- Criar uma função de banco de dados `public.is_shift_open()` que verifica se existe algum registro na tabela `shifts` com `closed_at IS NULL`.
- Adicionar uma constraint ou gatilho (trigger) na tabela `orders` para impedir a inserção de novos pedidos se `is_shift_open()` for falso. Isso garante a integridade mesmo que alguém tente burlar pelo console do navegador.

### 2. Backend (Server Functions)
- Modificar `src/lib/orders.functions.ts`:
    - Na função `createGuestOrder`, adicionar uma verificação inicial que consulta a tabela `shifts`.
    - Se não houver turno aberto, lançar um erro descritivo: "Não há um turno aberto no momento. Por favor, tente novamente mais tarde."

### 3. Frontend (Interface do Cliente)
- Modificar `src/lib/store-hours.ts`:
    - Atualizar o tipo `StoreStatus` e a função `getStoreStatus` para incluir uma nova propriedade `hasActiveShift`.
    - Criar um hook `useActiveShift` ou integrar a verificação de turno na query de horários para que o estado seja reativo.
- Modificar `src/components/menu/MenuBrowser.tsx`:
    - Exibir a mensagem "Estamos fechados no momento, em breve estaremos online" de forma proeminente caso não haja turno aberto, mesmo que o horário do relógio esteja dentro do configurado.
    - Desabilitar os botões de "Adicionar ao carrinho" (Plus) se não houver turno aberto.
- Modificar `src/components/menu/CartSheet.tsx`:
    - Na validação do botão "Confirmar pedido", incluir a checagem de turno aberto.
    - Exibir alerta visual no carrinho se o turno for fechado enquanto o usuário ainda está navegando.

## Verificação
- Tentar fazer um pedido fora do horário configurado (já bloqueado).
- Tentar fazer um pedido dentro do horário configurado, mas com o turno fechado no `/operacional` (deve bloquear).
- Abrir o turno e verificar se o pedido volta a ser permitido instantaneamente.
