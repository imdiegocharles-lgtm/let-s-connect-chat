# Planejamento: Edição Direta de Bairros, Taxa do Motoboy e Relatórios Aprimorados

O objetivo é tornar a listagem de bairros no admin editável diretamente, adicionar campos de "Valor Motoboy" (Almoço/Churrasco), e integrar esses valores nos relatórios de turno e diários, além de renomear a diária dos motoboys para "Ajuda de custo da gasolina".

## Alterações no Banco de Dados (Supabase)

1.  **Tabela `neighborhoods`**:
    *   Adicionar colunas `motoboy_fee_almoco` (numeric, default NULL).
    *   Adicionar colunas `motoboy_fee_noite` (numeric, default NULL).
2.  **Tabela `shift_reports`**:
    *   Garantir que o schema suporte a nova estrutura de `motoboys_summary` se necessário, embora o JSONB atual seja flexível.
3.  **Tabela `daily_reports`**:
    *   Mesmo caso da `shift_reports`.

## Alterações no Frontend (Admin)

1.  **`src/routes/admin.index.tsx`**:
    *   Remover o `NeighborhoodDialog` e o ícone de lápis.
    *   Transformar a `NeighborhoodsPanel` em uma tabela ou lista com inputs `Input` de borda mínima que salvam via `onBlur` ou um botão "Salvar" na linha.
    *   Adicionar os campos "Motoboy Almoço" e "Motoboy Churrasco" na listagem.
    *   Garantir que `autoCorrect="off"` e `spellCheck="false"` estejam presentes nos inputs.

## Alterações no Frontend (Operacional)

1.  **`src/components/operacional/MotoboysPanel.tsx`**:
    *   Renomear o label "Diária (R$)" para "Ajuda de custo da gasolina" no `MotoboyDialog`.
    *   Atualizar a exibição no card do motoboy para refletir o novo nome.

## Alterações na Lógica de Relatórios e Impressão

1.  **`src/lib/reports-service.ts`**:
    *   `aggregateShiftMotoboys`: Alterar para buscar o `shift_type` do turno. Para cada entrega (`order`), buscar a `motoboy_fee_almoco` ou `motoboy_fee_noite` do bairro correspondente.
    *   Atualizar `MotoboyLine` para incluir `delivery_fees_total` e `gas_help` (antiga `daily_rate`).
    *   `createShiftReport`: Passar os novos dados agregados.
2.  **`src/lib/report.ts`**:
    *   Atualizar os tipos e a função de construção de bytes/texto para mostrar:
        *   Entregas: R$ X,XX
        *   Ajuda Gasolina: R$ Y,YY
        *   Total a Receber: R$ Z,ZZ
3.  **`src/lib/receipt.ts`**:
    *   Confirmar que o valor do motoboy **não** é incluído no cupom do cliente (o cupom usa `delivery_fee` da ordem, que permanece inalterada).

## Verificação

1.  Validar no Admin se a edição direta funciona e os novos campos persistem.
2.  Simular um pedido em um bairro com "Valor Motoboy" configurado.
3.  Verificar no Painel Operacional se o relatório de fechamento de turno mostra os valores separados.
4.  Confirmar que a impressão do cupom do cliente continua mostrando apenas a taxa de entrega padrão.

---
**Nota de Segurança**: As novas colunas na tabela `neighborhoods` devem ser incluídas nas políticas de RLS e GRANTs existentes.
