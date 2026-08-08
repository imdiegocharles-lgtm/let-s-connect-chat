# Plano: Reformulação Visual da Comanda de Impressão e Favicon

O objetivo é alinhar o layout da comanda de impressão térmica (ESC/POS) com o exemplo visual fornecido pelo usuário, incluindo a logo oficial em preto e branco e ícones/estilização profissional. Também será configurado o favicon do site a partir da logo oficial.

## Mudanças

### Backend e Assets
- [x] Criar ponteiro de asset para a logo preto e branco (`logo-familia-amaral-bw.png.asset.json`).
- [ ] Implementar migração para adicionar `official_logo_bw_url` em `system_settings` (ou garantir que a tabela suporte essa configuração).
- [ ] Configurar o Favicon oficial no diretório `public/` e atualizar `src/routes/__root.tsx`.

### Lógica de Impressão (`src/lib/receipt.ts` e `src/lib/report.ts`)
- [ ] Atualizar `buildReceiptBytes` para seguir o layout da imagem:
    - Logo centralizada no topo (se possível via comando GS v 0 ou similar, ou mantendo texto estilizado se a logo raster for complexa demais para o agente local sem processamento prévio).
    - Divisórias pontilhadas claras.
    - Seção de CLIENTE com ícone (👤, 📞, 📍) mapeado para CP860 ou caracteres ASCII compatíveis.
    - Itens com destaque em negrito e blocos de extras (`Espeto incluso`, `Acompanha mel?`) com moldura simulada em texto.
    - Seção de PAGAMENTO e TROCO com destaque visual (fundo invertido ou negrito duplo).
    - Seção de OBSERVAÇÕES com ícone de alerta (⚠️).
- [ ] Aplicar lógica semelhante ao `src/lib/report.ts` para manter a identidade visual nos relatórios de fechamento.

### Admin (`src/routes/admin.index.tsx`)
- [ ] Adicionar campo na aba de Configurações para gerenciar a URL da logo oficial (BW).

## Verificação
- [ ] Simular geração de bytes da comanda no console.
- [ ] Validar Renderização do Favicon no preview.
- [ ] Confirmar que caracteres especiais e formatação monetária seguem o padrão brasileiro (R$ 0,00).
