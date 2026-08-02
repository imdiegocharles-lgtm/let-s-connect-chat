## O que descobri (verificado agora)

**Por que a seleção de espeto sumiu:** o código procura as categorias pelo nome exato `"completos"` e `"espetos"`, mas no banco elas foram renomeadas para **"O MAIS PEDIDO 🏆"** e **"Espetos 🍖"**. Como nenhum nome bate, o diálogo nunca abre. Além disso a lista de espetos está travada em `price === 15` no código.

**Bug relacionado:** quando o combo era adicionado, o item ia pro carrinho com id `uuid:uuid`, o que quebra a gravação do item do pedido (a coluna `menu_item_id` espera um id válido).

**RLS hoje:** `orders` e `order_items` permitem INSERT para `anon` e — mais grave — existem políticas `Permitir leitura de pedidos para anonimos` (SELECT `true`) que deixam **qualquer visitante ler todos os pedidos com nome, telefone e endereço dos clientes**. Isso será corrigido nesta mudança.

A tabela `orders` **não tem** coluna `user_id` hoje.

## Estratégia proposta

- **Autenticação:** e-mail + senha do próprio Auth já disponível no projeto (é o caminho mais simples e confiável; login por telefone exigiria SMS pago). No cadastro o cliente informa nome, WhatsApp, e-mail e senha; nome e telefone ficam em `profiles` e pré-preenchem o checkout. Confirmação de e-mail desativada para o cliente entrar na hora.

**Tempo real:** a tela do cliente assina as mudanças da tabela `orders` filtradas pelo `user_id` dele (Realtime), atualizando o status na hora em que a cozinha muda no painel — sem recarregar.

**RLS:** adiciono `user_id` em `orders`, preenchido automaticamente com o usuário logado; INSERT passa a exigir `authenticated` + `user_id = auth.uid()`; cliente só lê os próprios pedidos; `order_items` idem via pedido dono. As políticas anônimas de leitura e inserção são removidas. Admin e operador continuam com acesso total.

## Etapas

### 1. Banco (migração)

- `orders.user_id` (referência ao usuário) + preenchimento automático no insert.
- `order_items.extras` já existe — passa a guardar o espeto escolhido.
- Remover: `Anyone can place orders`, `Anyone can add order items`, `Permitir leitura de pedidos para anonimos`, `Permitir leitura de itens de pedido para anonimos`.
- Criar: insert/leitura de pedidos e itens apenas para `authenticated` dono; `GRANT` correspondentes; Realtime habilitado em `orders`.
- Cadastro automático de `profiles` (nome + telefone) no signup.

### 2. Cardápio — seleção de espeto (dinâmica)

- Identificar as categorias por correspondência flexível (ignorando emojis/acentos), com fallback pelos nomes dos itens ("Completo com Maionese/Salpicão").
- A lista de espetos passa a vir inteira da tabela `menu_items` da categoria de espetos disponíveis — **sem filtro fixo de R$ 15**, ordenada pelo `sort_order`. Novos espetos cadastrados no Admin aparecem sozinhos.
- Seleção obrigatória (só fecha escolhendo), preço do combo inalterado.
- Corrigir o carrinho para guardar `menuItemId` real do combo + o espeto em `extras`, mantendo o nome "Combo (Espeto: X)" que os relatórios já sabem ler.

### 3. Conta do cliente

- Nova página `/conta` (entrar / criar conta) com a identidade visual do site.
- Nova página `/meus-pedidos`: cabeçalho com a logo Família Amaral, cartões de pedido com linha do tempo de status (Recebido → Em preparo → Saiu para entrega → Entregue), itens, total e horário — em tempo real.
- Link "Meus pedidos / Entrar" no topo do site.

### 4. Checkout obrigatoriamente logado

- Sem sessão, o botão de finalizar vira "Entrar para finalizar o pedido" e leva ao login, voltando ao carrinho depois (carrinho preservado).
- Nome e telefone pré-preenchidos pelo perfil; o pedido é gravado vinculado ao cliente e a tela de sucesso leva direto para o acompanhamento.

## Detalhes técnicos

Arquivos afetados: `src/components/menu/MenuBrowser.tsx`, `src/lib/cart.tsx`, `src/components/menu/CartSheet.tsx`, `src/routes/index.tsx`, novas rotas `src/routes/conta.tsx` e `src/routes/meus-pedidos.tsx`, mais uma migração de banco. Painéis admin/operacional e relatórios não mudam de comportamento.