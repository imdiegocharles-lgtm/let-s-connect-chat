## Observações antes de começar

- Hoje **não existe** uma barra de navegação inferior no site (verifiquei o código): as 5 abas serão criadas do zero, reaproveitando as rotas e a lógica que já existem (`/` com âncora `#cardapio`, carrinho `CartSheet`, `/meus-pedidos`, `/conta`).
- O seu prompt pula a "PARTE 3" — considerei que não existe.
- Os horários hoje vivem em `system_settings` / `public_settings` (um horário único, sem dia da semana). Vou criar as tabelas novas que você pediu e migrar a leitura para elas.

## 1. Menu inferior (Bottom Navigation)

Novo componente `src/components/layout/BottomNav.tsx`, montado no layout raiz e exibido em todas as páginas públicas:

- Barra fixa, altura 82px + safe area do iPhone, fundo escuro translúcido com blur, borda superior discreta e sombra.
- 5 abas: Início, Cardápio, **Meu Pedido** (central, destacado: círculo vermelho da marca, ícone e texto brancos, sombra, animação de toque), Pedidos, Conta.
- Abas laterais: ícone outline, texto pequeno, cinza claro quando inativo, vermelho quando ativo, com transição suave e indicador animado.
- Badge de quantidade no botão central usando a contagem já existente do carrinho.
- Aba "Conta" lê a sessão real: deslogado → ícone + "Entrar" (vai para `/conta`); logado → inicial do nome em avatar circular + "Minha Conta" (vai para `/meus-pedidos`).
- Padding inferior extra nas páginas para o conteúdo nunca ficar coberto.
- As informações "A partir de R$ 5 / Taxa de entrega" e "4.9 Avaliar" saem da faixa do hero e ficam apenas na seção da página do restaurante.

## 2. Horários e prazo de entrega editáveis

Banco (migração):

- Tabela `horarios_funcionamento`: dia da semana, tipo (almoço/churrasquinho), hora de abertura, hora de fechamento, delivery disponível. Leitura pública, escrita só para admin.
- Tabela `configuracoes_entrega`: prazo mínimo, prazo máximo e texto de observação. Leitura pública, escrita só para admin.
- Dados iniciais: almoço seg–sáb 11:00–14:30; churrasquinho seg–sáb 18:00–00:00; domingo churrasco 11:00–00:00 com delivery desativado; prazo 40–80 min com a observação atual.

Aplicativo:

- Nova aba dentro de **Configurações** no Admin para editar a grade de horários (por dia e tipo, com o interruptor de delivery) e o prazo de entrega + observação.
- Card "Horário do churrasco" da home passa a montar o texto a partir da tabela.
- Card de entrega passa a exibir "Entrega em X–Y min" e a observação vindas da tabela.
- A liberação do cardápio deixa de usar os horários fixos e passa a usar a janela do dia atual vinda de `horarios_funcionamento`; fora da janela, o cardápio fica indisponível para pedido.
- Quando o dia estiver com delivery desativado (domingo), a home e o carrinho bloqueiam o pedido e exibem aviso de atendimento somente presencial nesse dia.
- Card "Pedido seguro / Sem cadastro, direto pelo site" removido da home.

## 3. Login/cadastro unificado

- Remove o aviso de texto solto abaixo de "Fazer Pedido Agora".
- "Fazer Pedido Agora" e a finalização do pedido verificam a sessão: deslogado → leva direto para a tela de login/cadastro e retorna ao fluxo depois; logado → segue normal.
- Pontos de entrada de login passam a ser apenas o botão do topo e a aba "Conta" do menu inferior.

## 4. Testes

Rodo verificação de tipos/build e testo no navegador headless: navegação entre abas, badge do carrinho, alternância Entrar/Minha Conta, edição de horário e prazo refletindo na home, simulação de domingo (bloqueio de delivery), simulação de horário fora da janela (cardápio indisponível), fluxo de pedido logado e deslogado, e leitura do console em busca de erros.

## Detalhes técnicos

- `BottomNav` usa `useRouterState` para aba ativa, `useCart` para o badge e `useCustomerSession` para o estado de auth.
- Horários/prazo consumidos via TanStack Query com invalidação após salvar no Admin (atualiza sem recarregar).
- Cálculo da janela considera fechamento à meia-noite (00:00 tratado como fim do dia) e o fuso America/Sao_Paulo.
- Migração cria as tabelas com GRANTs, RLS (leitura anônima, escrita via `has_role(auth.uid(),'admin')`) e os INSERTs dos valores padrão.
- `public_settings`/`system_settings` continuam existindo para os demais campos (pedido mínimo, tempo médio de preparo); apenas a fonte dos horários muda.
