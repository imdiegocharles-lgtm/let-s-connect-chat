# Apagar o relatório do dia gerado por engano e travar a geração até fechar os 2 turnos

## Situação atual (verificada)

- Existe um relatório do dia de 11/08/2026 criado às 20:56 (horário local) com apenas 1 turno, 6 pedidos e R$ 236,00 — gerado por engano durante o movimento.
- O turno do almoço de 11/08 está fechado; o turno da noite ainda está aberto.

## O que será feito

### 1. Excluir o relatório do dia gerado por engano
Remover apenas o registro consolidado de 11/08/2026. Os relatórios de turno, os pedidos e o histórico de dias anteriores (incluindo 10/08) não são tocados. No fim da noite você gera o relatório do dia correto, já somando almoço + churrasco.

### 2. Relatório do dia só com os 2 turnos fechados
O botão "Gerar Relatório do Dia" fica desabilitado enquanto não existirem os dois relatórios de turno da data (almoço e churrasco/noite) e enquanto houver turno aberto. No lugar do botão aparece um aviso explicando o que falta (por exemplo, "Aguardando o fechamento do turno da noite").

### 3. Confirmação antes de finalizar o dia
Ao clicar em "Gerar Relatório do Dia", abre uma confirmação: "Tem certeza que deseja finalizar o dia? O relatório consolidado será gerado, impresso e enviado por e-mail." Só depois de confirmar o relatório é criado.

Isso vale tanto no Painel Operacional quanto na aba Relatórios do Admin.

## Detalhes técnicos

- Limpeza de dados: `DELETE FROM public.daily_reports WHERE report_date = '2026-08-11'`.
- `src/routes/operacional.tsx` (ReportsPanel) e `src/components/admin/ReportsViewer.tsx`:
  - calcular `hasBothShifts` a partir dos `shift_reports` da data (`almoco` + `noite`) e verificar se não há turno aberto (`is_shift_open`);
  - desabilitar o botão de gerar quando a condição não for atendida, com texto de ajuda;
  - envolver a ação em um `AlertDialog` de confirmação antes de chamar `generateDaily`.
- Nenhuma mudança na lógica de agregação em `src/lib/reports-service.ts`.