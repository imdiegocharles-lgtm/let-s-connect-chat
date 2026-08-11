# Barra de categorias fixa no mobile

No celular, a barra de categorias do cardápio passa a ser o elemento fixo no topo durante a rolagem, e o botão "Faça sua Reserva" volta a rolar junto com a página.

## O que muda

1. **Botão "Faça sua Reserva" (mobile)**
   - Hoje ele fica dentro da barra superior fixa, logo abaixo da logo, e acompanha a tela o tempo todo.
   - Passa a ser um bloco normal da página, logo abaixo da barra superior, rolando junto com o conteúdo (incluindo o texto "Reservas disponíveis apenas para grupos a partir de 10 pessoas").
   - No desktop nada muda: o botão continua no cabeçalho como hoje.

2. **Barra de categorias (mobile)**
   - Continua fixa ao rolar, encaixando logo abaixo da barra superior com a logo (sem sobreposição nem espaço vazio), já que essa barra fica mais baixa sem o botão de reserva.
   - Mantém a rolagem horizontal por arrasto, com os chips das categorias ("O Mais Pedido", "Espetos", "Batatas Fritas", etc.).
   - Mantém o clique que rola até a seção da categoria, com o espaçamento de destino ajustado para o título não ficar escondido atrás da barra fixa.

3. **Desktop/tablet**
   - Comportamento visual atual preservado.

## Detalhes técnicos

- `src/routes/index.tsx`: retirar o bloco `sm:hidden` do botão de reserva de dentro do `<header className="sticky top-0 ...">` e renderizá-lo imediatamente após o header, como seção comum (sem `sticky`).
- `src/components/menu/MenuBrowser.tsx`: ajustar o `top` do `<nav>` fixo para a nova altura do header no mobile, mantendo o valor atual em telas maiores, e revisar o `scroll-mt-*` das seções de categoria.
- Manter `overflow-x-auto` e os utilitários de rolagem horizontal já existentes na barra.