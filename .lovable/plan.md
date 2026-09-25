# Reservas na cozinha

## O que vai mudar
- Tirar a aba **Reservas** do painel administrativo e colocá-la no painel da cozinha, acessível aos funcionários já autorizados a entrar ali.
- Manter a lista e os filtros atuais, a visualização dos dados, a impressão manual e a alteração de status (pendente, confirmada, cancelada).
- Manter a confirmação antes de excluir. O funcionário poderá cancelar ou excluir uma reserva em caso de desistência, liberando o local naquela data.
- Não alterar o formulário do cliente, a disponibilidade por local/data, a impressão automática, os pedidos ou as demais abas.

## Detalhes técnicos
- Reaproveitar o painel de reservas existente em um componente da cozinha, removendo sua aba e código exclusivo do administrador; manter o componente de confirmação de exclusão usado por outras funções administrativas.
- A leitura e a alteração de status já estão autorizadas para o papel operacional. Adicionar somente a permissão de exclusão de reservas para operadores autenticados, mantendo a proteção por papel no banco; conferir que um visitante não consegue ler, alterar ou excluir reservas.
- Mostrar a aba mesmo sem turno aberto, para que reservas possam ser gerenciadas independentemente do delivery. Invalidar/atualizar a lista após alterações e preservar o comportamento atual da impressora.
- Testar com uma conta da cozinha: visualizar reservas, alterar status, excluir uma reserva de teste e verificar que o local volta a ficar disponível; conferir também o acesso do administrador pelo painel da cozinha e o fluxo público de reserva.
