# Confirmação de pedido em alto impacto

## Objetivo
Trocar a tela de confirmação do pedido (dentro do carrinho, após "Confirmar pedido") por um layout de alto impacto, seguindo a direção escolhida ("Confirmação de alto impacto"), com os ajustes pedidos:
- SEM número do pedido.
- SEM informação de pagamento.
- Tempo estimado igual ao exibido no início do site (prazos editados no Admin, campos "prazo mínimo/máximo" da configuração de entrega), ex.: "Entrega em 30–45 min".

## Alterações (arquivo único: `src/components/menu/CartSheet.tsx`)
Substituir o conteúdo do bloco `step === "done"` por:

1. **Ícone de sucesso animado**
   - Círculo verde grande (128px) com check branco grosso, borda branca e sombra.
   - Anel pulsante (`animate-ping`) atrás do círculo para chamar atenção.

2. **Título grande**
   - Mensagem de confirmação (a mesma configurável no Admin, `order_confirmation_message`) em letras grandes: `text-4xl font-black uppercase`, centralizada.

3. **Card de tempo estimado**
   - Caixa branca arredondada com rótulo "Tempo Estimado" e o valor vindo de `useConfigEntrega()`: `Entrega em {prazo_minimo_minutos}–{prazo_maximo_minutos} min` (mesma fonte de dados da faixa inicial do site). Fallback para o valor atual (`order_estimated_time`) se a configuração não estiver carregada.

4. **Botão "Fechar"**
   - Largura total, vermelho da marca (`bg-primary`), texto em caixa alta, arredondado, com leve escala ao toque.

Remover o número do pedido (`orderNumber`) da exibição (o estado interno pode continuar, sem uso visual) e qualquer referência a pagamento na confirmação.

## Não muda
- Fluxo de envio do pedido, validações e mensagens do Admin continuam iguais.
- Nenhum dado novo é salvo ou alterado no banco.
