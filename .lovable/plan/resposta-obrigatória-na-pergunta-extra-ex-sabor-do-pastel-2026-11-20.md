# Resposta obrigatória na pergunta extra (ex.: sabor do Pastel)

## O que muda para você (Admin)
- Ao editar um item com pergunta extra de texto livre, aparece uma nova chave: **"Resposta obrigatória"**.
- Ligada: o cliente precisa digitar a resposta para adicionar o item.
- Desligada: continua como hoje (opcional, como o "OBSERVAÇÕES:" dos Completos).
- Itens que já existem continuam opcionais. Você só liga no Pastel (ou em outros itens que precisarem).

## O que o cliente vê quando é obrigatória
- O texto fica "Resposta obrigatória", sem "deixe em branco".
- O campo mostra "Digite aqui" (sem "opcional").
- O botão fica "Adicionar ao pedido" e só libera depois que ele escrever alguma coisa.
- Pergunta com opções de escolha não muda, porque escolher uma opção já é obrigatório.

## Parte técnica
- Coluna nova `menu_items.extra_question_required boolean not null default false`.
- Admin (`admin.index.tsx`): estado, switch e gravação do campo.
- `MenuBrowser.tsx`: buscar a coluna, mudar textos e desativar o botão quando a resposta estiver vazia e for obrigatória.
- Comanda, carrinho e relatórios ficam iguais (a resposta já sai na comanda).
