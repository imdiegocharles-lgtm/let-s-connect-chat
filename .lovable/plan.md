# Plano: Correção de Acesso Administrativo e Operacional

O erro "permission denied for function has_role" ocorre porque as permissões de execução da função `has_role` foram revogadas para os papéis `anon` e `authenticated` por questões de segurança (endurecimento de RLS), mas essa função é chamada diretamente via RPC ou em consultas do lado do cliente para verificar o acesso.

## Alterações Sugeridas

### 1. Banco de Dados (Supabase)
* Criar uma nova migração para restaurar a permissão de execução da função `has_role` para o papel `authenticated`.
* Isso é seguro porque a função apenas verifica a existência de um registro na tabela `user_roles`, que já possui RLS protegendo os dados (cada usuário só vê seus próprios papéis).

```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
```

### 2. Verificação de Acessos Semelhantes
* Verificar se outras funções revogadas na migração `20260808061636` também estão causando bloqueios em telas legítimas. No momento, o foco principal é o login administrativo e a verificação de permissões da cozinha.

## Passos de Verificação
1. Aplicar a migração.
2. Tentar realizar o login administrativo novamente no preview.
3. Verificar se o erro de permissão desapareceu da tela de login.
