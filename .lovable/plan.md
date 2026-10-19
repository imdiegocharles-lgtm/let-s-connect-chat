# Ativar/desativar todos os itens de uma categoria (cozinha)

## O que vai mudar
- Na aba de cardápio da cozinha, ao lado do nome de cada categoria (Espetos, Almoço, Bebidas etc.), aparece um botão liga/desliga "Todos".
- Ligado = todos os itens da categoria estão disponíveis. Ao desligar, todos ficam indisponíveis de uma vez; ao ligar, todos voltam.
- Se a categoria estiver com alguns ligados e outros desligados, o botão aparece desligado com o aviso "parcial"; ao ligar, ativa todos.
- Os botões individuais de cada item continuam funcionando como hoje.
- Com a busca ativa, o botão da categoria age só nos itens que aparecem na tela.
- Nada mais muda (cardápio do cliente, Admin, pedidos).

## Detalhes técnicos
- Em `src/routes/operacional.tsx` (painel de cardápio): nova mutação que faz `update({ is_available })` com `.in("id", ids)` dos itens visíveis da categoria, depois invalida `["op-menu"]`; toast de sucesso/erro.
- Switch no cabeçalho da seção, desabilitado enquanto a mutação roda. Mesma permissão já usada para o toggle individual.
