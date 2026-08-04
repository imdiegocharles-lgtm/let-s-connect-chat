# Revisão de segurança do backend

## O que os avisos dizem

Existem 2 avisos, ambos de nível "atenção" (não críticos), sobre funções internas do banco que podem ser chamadas por visitantes não logados e por usuários logados.

## O que é risco real (corrigir)

Hoje todas as 8 funções internas do banco podem ser executadas por visitantes anônimos do site. Isso é permissão em excesso: nenhuma delas precisa ser chamada pelo site público — os pedidos já são criados por um caminho seguro no servidor, e as regras de acesso que usam a verificação de administrador só valem para usuários logados.

Correção: remover a permissão de execução do público anônimo em todas essas funções internas (numeração de pedido, turno ativo, sincronização de configurações, criação de perfil, gatilhos e verificação de papel do usuário).

## O que NÃO é risco (manter e explicar)

A função de verificação de papel (admin/operador) continua executável por usuários logados. Isso é obrigatório: as regras de acesso do painel administrativo e do caixa dependem dela para liberar dados apenas a admin/operador. Ela apenas responde "sim/não" sobre o próprio usuário que consulta, não expõe dados. Esse aviso é esperado e será mantido, com a explicação registrada.

## Impacto no sistema

Nenhuma mudança em pedidos, painel administrativo, cozinha, relatórios ou reservas. Os gatilhos automáticos (número do pedido, turno) continuam funcionando normalmente, pois rodam internamente e não dependem da permissão do visitante.

## Detalhes técnicos

1. Migração SQL: `REVOKE EXECUTE ... FROM anon` em `get_active_shift_id`, `get_next_order_number`, `handle_new_user`, `has_role`, `set_daily_order_number`, `set_order_number`, `set_order_shift_id`, `sync_public_settings`. Mantém `service_role` e mantém `authenticated` apenas em `has_role`.
2. Verificação: reler `pg_proc.proacl` e confirmar que nenhuma política com `TO anon` referencia `has_role` (confirmado: todas as políticas que a usam são `TO authenticated`) e que o código não faz chamadas `.rpc(...)` (confirmado: nenhuma).
3. Marcar o aviso de execução por anônimos como corrigido, registrar o aviso de usuários logados como aceito e atualizar a memória de segurança.