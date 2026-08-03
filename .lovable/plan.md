# Pedido sem login + espetos dos Completos nos relatórios

## Parte 1 — Pedido direto, sem conta

Fluxo do cliente volta a ser anônimo: escolher itens, preencher nome/telefone/endereço/pagamento e enviar.

- "Fazer Pedido Agora" abre o cardápio/carrinho direto, sem checagem de sessão.
- Checkout deixa de exigir login e de carregar perfil do cliente.
- Menu inferior fica com 3 abas equilibradas: Início, Cardápio e Meu Pedido (o botão central do carrinho permanece em destaque).
- Removidos: tela de conta/login do cliente, tela de acompanhamento de pedidos, link de conta no topo, aviso "é necessário criar conta" e o link "Acompanhar meu pedido" na confirmação.
- Após enviar, o cliente continua vendo o número do pedido e a confirmação na tela.
- Login de admin/cozinha/operacional permanece intacto.

Banco: hoje o pedido só pode ser criado por usuário autenticado e com `user_id` igual ao usuário. Será criada uma migração para permitir pedido de convidado: acesso de inserção para visitantes em `orders` e `order_items`, mantendo todas as validações já existentes (nome, telefone, tamanho de campos, preço mínimo pelo cardápio, status inicial e pagamento não confirmado). Visitante não ganha permissão de leitura de pedidos; leitura continua restrita a admin/operador.

## Parte 2 — Espetos escolhidos dentro dos Completos

Hoje o espeto que acompanha um Completo é somado junto com os espetos avulsos, o que infla a contagem de vendas de espeto.

- A contagem de espetos avulsos passa a considerar somente espetos vendidos como item próprio.
- Passa a existir uma seção separada nos relatórios:

```text
Espetos inclusos nos Completos (não são vendas avulsas)

Completo com Salpicão: 50 vendidos
  - Frango empanado: 20
  - Linguiça mineira: 15
  - Tulipa da asa: 15

Completo com Maionese: 20 vendidos
  - Frango grelhado: 10
  - Coração: 10
```

- Aplicado igualmente ao relatório de fechamento de turno e ao relatório consolidado do dia: tela, impressão e e-mail.

## Detalhes técnicos

- Remoções: `src/routes/conta.tsx`, `src/routes/meus-pedidos.tsx`, `src/lib/customer-auth.ts`; limpeza dos usos em `CartSheet.tsx`, `index.tsx`, `BottomNav.tsx` e `__root.tsx` (lista de rotas públicas).
- Migração: políticas de INSERT para `anon` em `public.orders` (com `user_id IS NULL`) e `public.order_items`, mais `GRANT INSERT` correspondente; políticas atuais de cliente autenticado são removidas por não terem mais uso.
- Relatórios: em `src/lib/reports-service.ts`, separar o parse de `Completo ... (Espeto: X)` em uma nova agregação `combos_summary` (`{ combo, total, skewers: [{name, quantity}] }`), sem alimentar mais o grupo "Espetos".
- Nova coluna `combos_summary jsonb not null default '[]'` em `shift_reports` e `daily_reports`, com merge dia = soma dos turnos.
- Renderização em `src/lib/report.ts` (tela/impressão) e no template `src/lib/email-templates/daily-report.tsx` como bloco próprio, rotulado como escolha inclusa no prato.
- Relatórios antigos, sem o novo campo, seguem exibindo normalmente com a seção vazia.

## Testes

- Pedido completo ponta a ponta sem nenhuma tela de login e conferência da gravação no banco.
- Menu inferior com apenas as 3 abas.
- Fechamento de turno de teste com Completos, verificando contagem separada de espetos avulsos e inclusos.
- Revisão de console/logs por erros de permissão após remover a autenticação.
