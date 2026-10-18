# Comanda: pergunta extra e acompanhamento sem duplicar

## Problema
Itens com pergunta extra (ex: "Ponto da carne? Mal passada", "Acompanha mel? Sim") saem duas vezes na comanda: entre parênteses no nome do item e na linha de baixo `[ ... ]`. O mesmo acontece com o acompanhamento.

## Solução
- O nome do item sai limpo (ex: "1X ALCATRA"), e a informação aparece só uma vez, na linha de baixo: `[ PONTO DA CARNE ?: MAL PASSADA ]`.
- Vale para todos os itens com pergunta extra (Romeu e Julieta, ponto da carne, observações dos Completos) e para acompanhamentos do almoço.
- Vale também ao reimprimir pedidos antigos e na pré-visualização do Admin.
- O carrinho do cliente não muda.

## Detalhes técnicos
- `src/lib/receipt.ts` e `src/components/admin/ReceiptPreview.tsx`: quando `extras.pergunta` existir, remover do nome o trecho `(${pergunta} ${escolha})`; quando `extras.acompanhamento` existir, remover `(Acompanhamento: ...)`. Remoção por texto exato (escapado), mantendo a regra atual do espeto.
