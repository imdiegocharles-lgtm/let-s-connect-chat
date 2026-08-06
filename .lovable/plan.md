
# Melhorias no Sistema de Relatórios

Implementação do envio automático de relatórios por e-mail no fechamento de turnos e adição de botões para reenvio manual no painel administrativo.

## Mudanças Necessárias

### 1. Novo Servidor de E-mail para Turnos
Criar `src/lib/shift-report-email.functions.ts` para enviar o relatório de um turno específico.

### 2. Automação no Painel Operacional
Alterar a mutação `closeShift` em `src/routes/operacional.tsx` para chamar a nova função de e-mail logo após o fechamento bem-sucedido.

### 3. Interface Administrativa
Atualizar `src/components/admin/ReportsViewer.tsx` para incluir o botão "Reenviar E-mail" nos relatórios de turno.

## Plano de Ação

1.  **Criar `src/lib/shift-report-email.functions.ts`**:
    *   Implementar `sendShiftReportEmail` usando `createServerFn`.
    *   Validar entrada (ID do turno).
    *   Buscar relatório na tabela `shift_reports`.
    *   Buscar e-mails configurados em `system_settings`.
    *   Enviar usando o template correspondente (ou reaproveitar o estilo do `daily-report`).

2.  **Atualizar `src/routes/operacional.tsx`**:
    *   Importar `sendShiftReportEmail` (via `useServerFn`).
    *   Adicionar a chamada no `onSuccess` da mutação `closeShift`.

3.  **Atualizar `src/components/admin/ReportsViewer.tsx`**:
    *   Adicionar a mutação para reenviar e-mail de turno.
    *   Inserir o botão "Reenviar E-mail" na lista de turnos (ao lado de "Reimprimir").

4.  **Verificação**:
    *   Testar fechamento de turno simulado.
    *   Testar botões de reenvio no Admin.
