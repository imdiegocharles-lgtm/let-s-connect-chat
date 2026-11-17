# Endereço automático por CEP (ViaCEP)

## O que foi verificado no banco
- Turnos usados hoje: **"almoco"** (almoço) e **"noite"** (jantar). Nada será criado ou renomeado; o código também aceitará "manhã/almoço" e "noite/jantar" por segurança.
- 31 bairros cadastrados, cada um com taxa do almoço e taxa da noite (ex.: Barro Vermelho R$10/R$10, Trindade até a praça R$8/R$8).
- Alguns bairros têm nome com detalhe, como "Trindade (até a praça)" e "Trindade (depois da praça)", "Porto do Rosa (até o viaduto)".

## Como vai funcionar para o cliente
1. Campo **CEP obrigatório** no lugar da escolha de bairro. Ao digitar 8 números, o site busca no ViaCEP e preenche **rua, bairro e cidade** (travados, sem edição).
2. O bairro encontrado é comparado com a lista do Admin (ignorando acentos, maiúsculas e o texto entre parênteses).
   - **Atendido:** mostra o bairro e a taxa do turno aberto; libera o pedido.
   - **Vários cadastros do mesmo bairro** (ex.: Trindade até/depois da praça): o cliente escolhe só entre essas opções.
   - **Não atendido / CEP inválido:** aviso "Ainda não entregamos neste bairro" e botão de finalizar bloqueado.
3. **Número obrigatório**; **Complemento** e **Bloco/Apartamento** opcionais. Observações/ponto de referência continuam como hoje.
4. Bairros e taxas são lidos na hora, então novos bairros e mudanças de taxa no Admin valem imediatamente.

## Onde o endereço completo aparece
- Pedido salvo com CEP, rua, número, complemento, bloco/apto, bairro e cidade.
- Cozinha e Admin mostram o endereço completo.
- Comanda da Elgin i9 imprime complemento e bloco/apto, e a pré-visualização no Admin também.

## O que não muda
Bairros, taxas, turnos, pagamentos, cupons, desconto e o restante do checkout. Não publico automaticamente.

## Testes
- CEP de bairro atendido e não atendido; CEP inexistente.
- Novo bairro cadastrado sendo reconhecido; taxa alterada no Admin refletindo.
- Taxa correta com turno almoço e com turno noite (o servidor recalcula pela taxa do turno aberto, como já faz).
- Pedido completo de teste, endereço no painel e na pré-visualização da comanda. A impressão física na Elgin depende da impressora local — confiro o texto gerado, não o papel.

## Detalhes técnicos
- Migração aditiva em `orders`: `customer_cep`, `customer_complement`, `customer_block`, `customer_city` (texto, opcionais).
- `CartSheet.tsx`: fetch direto do navegador para `https://viacep.com.br/ws/{cep}/json/`; função de normalização compartilhada em `src/lib/neighborhood-match.ts` com teste unitário.
- `orders.functions.ts`: aceita os novos campos; continua validando `neighborhoodId` e calcula a taxa pelo `shift_type` do turno aberto (aceitando almoco/manha e noite/jantar).
- `receipt.ts`, `ReceiptPreview.tsx`, cards da cozinha/admin: exibir os novos campos.
