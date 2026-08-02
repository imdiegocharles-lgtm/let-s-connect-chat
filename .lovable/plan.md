## Objetivo

Os produtos passam a ser exibidos automaticamente do menor para o maior preço dentro de cada categoria, sem depender do campo manual de "posição". As categorias continuam com a ordem que você define no Admin (incluindo "O MAIS PEDIDO 🏆" sempre primeiro).

## O que muda

1. **Cardápio do cliente** (`src/components/menu/MenuBrowser.tsx`)
   - Itens buscados e ordenados por preço crescente (desempate por nome), agrupados por categoria como hoje.
   - A lista de espetos do diálogo do "Completo" também passa a sair por preço crescente.

2. **Painel Admin** (`src/routes/admin.index.tsx`)
   - Lista de produtos ordenada por categoria e depois por preço crescente.
   - Campo "Posição" removido do formulário de produto (novos produtos entram com valor padrão, sem você precisar preencher nada).
   - A ordenação de categorias continua manual, como está hoje.

3. **Painel Operacional** (`src/routes/operacional.tsx`)
   - Lista de itens para marcar disponível/indisponível também ordenada por preço crescente dentro da categoria.

4. **Correção dos dados já cadastrados**
   - Atualização única no banco recalculando o campo de posição de todos os produtos existentes: dentro de cada categoria, posição 1, 2, 3… seguindo o preço do menor para o maior. Isso deixa o banco coerente com a nova exibição e sem misturar categorias.

## Detalhes técnicos

- Consulta passa de `.order("sort_order")` para `.order("price", { ascending: true }).order("name")` nos três pontos de leitura de `menu_items`.
- O agrupamento por categoria continua sendo feito em memória a partir de `category_id`, então nenhum item vaza para outra categoria.
- A coluna `sort_order` não é removida do banco (evita quebrar tipos gerados e outros pontos), apenas deixa de ser usada para exibição de produtos.
- Correção dos dados via UPDATE com `row_number() over (partition by category_id order by price, name)`.
