# Reservas: impressão imediata e bloqueio de local já reservado

## O que muda para você

1. **Impressão automática no momento da solicitação** — assim que o cliente envia a reserva pelo site, a comanda sai na impressora, sem precisar mudar o status para "confirmada".
2. **Local ocupado fica indisponível** — se já existe reserva para uma data em um local (Varanda, Salão ou Segundo Andar), aquele **local** some/aparece bloqueado para aquela data. Os outros dois continuam liberados. O dia só fica totalmente indisponível quando os três locais estiverem reservados.

## Por que hoje não imprime na hora

O painel operacional já escuta novas reservas em tempo real, mas as regras de acesso do banco só permitem que **administradores** enxerguem a tabela de reservas. Quando o painel está logado como operador, o aviso em tempo real nunca chega — por isso a comanda só sai quando alguém abre o admin e imprime manualmente.

## Detalhes técnicos

**Banco de dados (migração)**
- Nova política de leitura em `reservations` para o papel `operator` (além do admin já existente), para que o evento em tempo real chegue ao painel operacional.
- Nova coluna `printed_at` em `reservations` (marca a reserva já impressa, evita impressão duplicada).
- Índice único parcial em `(reservation_date, location)` para `status <> 'cancelada'` — garante no banco que não haja duas reservas ativas no mesmo local/dia.
- Função pública `get_reserved_slots(from_date, to_date)` (SECURITY DEFINER, executável por `anon`) devolvendo apenas `reservation_date` e `location` das reservas ativas — nenhum dado pessoal exposto.

**Painel operacional (`src/routes/operacional.tsx`)**
- Mantém a assinatura em tempo real de INSERT em `reservations` e passa a gravar `printed_at` após imprimir.
- Rede de segurança: a cada 10s, busca reservas com `printed_at` nulo do dia/futuras e imprime as pendentes (mesmo padrão já usado para pedidos), cobrindo queda de internet ou aba fechada no momento da reserva.

**Formulário de reserva (`src/components/reservations/ReservationDialog.tsx`)**
- Consulta `get_reserved_slots` para os próximos ~120 dias.
- Ao escolher a data, as opções de local já reservadas aparecem desabilitadas com a marcação "Indisponível".
- Datas com os três locais ocupados ficam desabilitadas no calendário.
- Se duas pessoas enviarem ao mesmo tempo, o erro de duplicidade do banco vira a mensagem: "Este local acabou de ser reservado para esta data. Escolha outro local ou outra data."

## Fora do escopo
- Nenhuma mudança no layout da comanda impressa nem no fluxo de pedidos.
