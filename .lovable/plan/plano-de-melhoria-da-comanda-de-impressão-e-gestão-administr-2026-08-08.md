# Plano de Melhoria da Comanda de Impressão e Gestão Administrativa

O objetivo é tornar a comanda de impressão mais organizada, legível e totalmente personalizável através do painel administrativo.

## Alterações Realizadas / A Realizar

### 1. Banco de Dados
- [x] Adição de colunas na tabela `system_settings` para armazenar as preferências de impressão:
    - `receipt_show_logo`: Exibir/Ocultar cabeçalho/logo.
    - `receipt_header_bold`, `receipt_items_bold`, `receipt_footer_bold`: Controle de negrito por seção.
    - `receipt_extra_spacing`: Espaçamento adicional entre itens para evitar que fiquem "amontoados".
    - `receipt_qty_double_size`: Destacar a quantidade dos produtos em tamanho grande.
    - `receipt_font_size`: Tamanho da fonte global do cabeçalho.

### 2. Lógica de Impressão (`src/lib/receipt.ts`)
- [x] Implementação de novos comandos ESC/POS para tamanho dobrado (`doubleSizeOn`).
- [x] Reformulação do layout da comanda:
    - **Quantidade em Destaque**: A numeração da quantidade agora aparece maior (dobro do tamanho) e alinhada à esquerda.
    - **Alinhamento Vertical**: Itens, quantidades e preços agora seguem um padrão de alinhamento rigoroso.
    - **Identificação de Espetos**: Sub-itens de combos agora exibem explicitamente "1X ESPETO" para facilitar a conferência do churrasqueiro.
    - **Espaçamento**: Adicionado espaçamento configurável entre os itens do pedido.

### 3. Painel Administrativo (`src/routes/admin.index.tsx`)
- [x] Criação de uma nova aba **"🖨️ Impressão"**.
- [x] Interface intuitiva para editar todas as novas configurações de comanda.
- [x] Campo para gerenciar a URL da Logo P&B com orientações técnicas sobre o formato compatível com impressoras térmicas (Elgin i9).

### 4. Integração com Painel Operacional (`src/routes/operacional.tsx`)
- [x] Atualização do fluxo de impressão para carregar as configurações do banco de dados em tempo real antes de enviar para a impressora.

## Próximos Passos
1. Validar o alinhamento na impressora física.
2. Caso a logo continue não aparecendo, será necessário verificar se o agente de impressão local (`http://localhost:8080/print`) suporta o processamento de imagens por URL ou se a logo deve ser gravada na memória interna da impressora via software da Elgin.
