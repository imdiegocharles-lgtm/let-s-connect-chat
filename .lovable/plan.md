# Comanda: quantidade certa de espetos dos Completos e sem repetição

## Problema
- Com 2 Completos iguais, a comanda imprime "1X ESPETO: TULIPA DA ASA" — o espeto sai sempre como 1, sem acompanhar a quantidade do Completo.
- O espeto aparece duas vezes: entre parênteses no nome do Completo e na linha de baixo.

## Solução
1. A linha do espeto passa a usar a mesma quantidade do Completo (2 Completos → "2X ESPETO: TULIPA DA ASA").
2. O nome do Completo sai sem o "(Espeto: ...)" — fica só "2X COMPLETO COM SALPICÃO", com o espeto apenas na linha de baixo.
3. Vale para qualquer espeto escolhido no Completo (tulipa, frango, carne, etc.), em Completo com Salpicão e com Maionese.
4. Vale também para pedidos já feitos ao reimprimir, e para a pré-visualização da comanda no Admin.
4. Pedidos novos já passam a ser gravados sem o parênteses no nome (no carrinho e relatórios o espeto continua identificado pelas escolhas do item).

## Detalhes técnicos
- `src/lib/receipt.ts`: `extras.espeto` imprime `${item.quantity}X`; remover `/\s*\(Espeto:[^)]*\)/i` do nome quando houver `extras.espeto`.
- `src/components/admin/ReceiptPreview.tsx`: mesma regra.
- `src/components/menu/MenuBrowser.tsx`: parar de adicionar `(Espeto: X)` em `nameParts`; o `id` composto do carrinho continua diferenciando espetos distintos. No carrinho, mostrar o espeto como linha secundária a partir de `extras.espeto`.
- Relatórios de espetos dos completos já usam `extras.espeto` × quantidade — conferir e não alterar se correto.
