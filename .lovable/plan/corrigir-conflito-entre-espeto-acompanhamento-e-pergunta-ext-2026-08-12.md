# Corrigir conflito entre espeto/acompanhamento e pergunta extra

## Problema
No cardápio, ao adicionar um item o sistema mostra apenas **uma** etapa e já joga o produto no carrinho. Se o prato pede escolha de espeto (Completo Salpicão/Maionese) ou acompanhamento, a pergunta extra configurada no Admin nunca aparece — por isso ela "não está sendo criada".

## Solução

### 1. Etapas em sequência (vale para todos os pratos)
Transformar o fluxo em uma fila de perguntas: espeto → acompanhamento → pergunta extra. O item só entra no carrinho depois da última etapa, juntando todas as escolhas no nome e nos extras (que já aparecem na comanda impressa e nos relatórios).

Exemplo: "Completo com Salpicão (Espeto: Frango) (OBSERVAÇÕES: sem vinagrete)".

### 2. Pergunta extra opcional em texto livre
Hoje a pergunta extra só funciona com opções fixas (Sim/Não). Passa a aceitar dois modos:
- **Com opções cadastradas** (como hoje, obrigatória): cliente escolhe uma das opções.
- **Sem opções cadastradas**: mostra um campo de texto livre, opcional, com o texto da pergunta como título (ex: "OBSERVAÇÕES:") e a dica "Sugestão: retirar algum item do completo". O cliente pode pular com "Continuar sem observação".

Assim, nos Completos basta ativar "Pergunta extra ao adicionar?", escrever `OBSERVAÇÕES:` e deixar o campo de opções vazio.

### 3. Admin
Ajustar o texto de ajuda do campo de opções: deixe vazio para virar campo de observação livre (opcional); preencha para virar escolha obrigatória.

## Detalhes técnicos
- `src/components/menu/MenuBrowser.tsx`: substituir os três estados `pending*` independentes por um estado de fluxo (item + escolhas acumuladas + etapa atual), com uma função `nextStep()` decidindo a próxima etapa e adicionando ao carrinho apenas no fim.
- Condição atual `item.has_extra_question && options.length > 0` passa a `item.has_extra_question` (sem opções → diálogo de texto livre, limite de ~140 caracteres).
- `extras` do item do carrinho passa a acumular `espeto`, `acompanhamento` e `pergunta/escolha` no mesmo objeto; o `id` composto continua garantindo que variações diferentes não se misturem no carrinho.
- `src/routes/admin.index.tsx`: apenas o texto de ajuda do campo de opções.
- Sem mudanças no banco de dados.