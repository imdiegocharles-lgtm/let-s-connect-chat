## Problema

As telas de login/admin/cozinha caem, de forma intermitente, na tela de erro genérica ("This page didn't load" / "Ocorreu um problema da nossa parte"). Essa tela vem de dois lugares do projeto: o fallback de erro do servidor (`src/lib/error-page.ts`) e o `errorComponent` da rota raiz (`src/routes/__root.tsx`).

O que já verifiquei no código:
- `/operacional` já está com renderização no servidor desligada (`ssr: false`) e tem sua própria tela de erro.
- `/admin`, `/admin/` e `/auth` ainda são renderizadas no servidor, mesmo sendo páginas 100% dependentes da sessão do navegador (a sessão fica no navegador, o servidor não enxerga). Nenhuma delas tem tela de erro própria, então qualquer falha sobe para a tela genérica.
- A checagem de permissão (`hasMyRole` / `getMyRoles`) roda sem tratamento de falha; se a chamada ao backend falhar ou demorar, a página quebra em vez de mostrar mensagem.

Observação honesta: não consigo confirmar a causa exata só pelo código, porque em ambiente local as três rotas respondem normalmente — o erro aparece no site publicado. O plano abaixo elimina as causas prováveis (render no servidor de páginas de sessão + ausência de tratamento de falha) e, se ainda ocorrer, deixa a mensagem de erro real visível para eu identificar em um passo.

## O que vou fazer

1. **Desligar a renderização no servidor** das rotas `/admin`, `/admin/` e `/auth` (como já está em `/operacional`). São páginas privadas, sem necessidade de SEO, e que dependem da sessão do navegador — renderizá-las no servidor é a fonte mais provável da instabilidade.

2. **Tela de erro própria em português** para `/admin`, `/admin/` e `/auth`, com botões "Tentar novamente" e "Ir para o site", exibindo a mensagem técnica em letra pequena (para diagnóstico), no mesmo padrão já usado em `/operacional`.

3. **Tornar a verificação de acesso à prova de falha**: envolver a leitura de sessão e de papéis em tratamento de erro, com uma tentativa automática de repetição e mensagem clara ("Não foi possível verificar seu acesso, tente novamente") em vez de derrubar a página inteira.

4. **Traduzir a tela de erro genérica** (raiz e fallback do servidor) para português, mantendo os botões de recarregar e voltar ao site.

5. **Verificação**: abrir `/admin`, `/auth` e `/operacional` com o navegador automatizado, recarregando várias vezes, e conferir console/rede para garantir que não há mais falha intermitente.

## Detalhes técnicos

- `src/routes/admin.tsx`, `src/routes/admin.index.tsx`, `src/routes/auth.tsx`: adicionar `ssr: false`, `errorComponent` e `notFoundComponent`.
- `src/lib/roles.ts`: `getMyRoles` passa a propagar erro de forma controlada (hoje devolve lista vazia silenciosamente, o que faz um admin válido parecer "sem permissão" quando a rede falha) e ganha uma repetição automática.
- `src/routes/__root.tsx` e `src/lib/error-page.ts`: textos em português.
- Sem mudanças no banco de dados, no cardápio ou nas regras de pedido.
