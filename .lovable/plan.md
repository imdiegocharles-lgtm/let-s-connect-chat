# Plano de Implementação: Reformulação da Comanda e Sistema de Troco

Este plano detalha a reformulação completa do layout de impressão dos pedidos para a impressora Elgin i9, a integração da logo oficial e a implementação do cálculo e destaque de troco.

## 1. Gestão da Logo Oficial
- **Configuração no Admin**: Adicionar campo na aba "Configurações" do Admin para upload da logo oficial do restaurante (armazenada em Supabase Storage).
- **Persistência**: Garantir que a logo seja utilizada em todas as impressões de comandas.
- **Conversão para Impressão**: Como a Elgin i9 recebe bytes ESC/POS, e imprimir imagens complexas via ESC/POS puro no navegador é limitado, utilizaremos a logo centralizada no topo. Investigar se o agente local suporta renderização de bitmap ou se usaremos um cabeçalho de texto estilizado caso o bitmap seja proibitivo via octet-stream direto. *Nota: A referência mostra uma logo circular.*

## 2. Reformulação do Layout da Comanda (ESC/POS)
- **Arquivo**: `src/lib/receipt.ts`.
- **Destaque Visual**: Implementar uso intensivo de negrito (`boldOn`) e tamanhos variados conforme solicitado.
- **Estrutura**:
    1. Logo (Centralizada)
    2. PEDIDO Nº (Destaque)
    3. DATA / HORA
    4. CLIENTE (Nome, Telefone, Endereço, Bairro)
    5. ITENS DO PEDIDO (Quantidade 1x em negrito, Nome, Preço à direita)
    6. Informações Complementares (Abaixo do item, em negrito e maior):
        - Espeto incluso (ex: 1x ALCATRA)
        - Pergunta extra (ex: ACOMPANHA MEL? -> SIM)
        - Acompanhamentos e adicionais.
    7. Totais (Subtotal, Taxa, TOTAL em destaque).
    8. PAGAMENTO (Forma de pagamento, Valor Pago, Troco em destaque com borda/caixa simulada).
    9. OBSERVAÇÕES (Destaque máximo no final).

## 3. Lógica de Negócio: Pagamento e Troco
- **Checkout**: Atualizar o formulário de checkout (`CartSheet.tsx`) para:
    - Campo "Quanto irá entregar?" visível apenas para pagamento em Dinheiro.
    - Validação de valor insuficiente (não permitir finalizar se for menor que o total).
    - Salvar `change_for` (valor pago) no banco de dados (tabela `orders`).
- **Banco de Dados**: Verificar se a coluna `change_for` já existe ou se precisa de ajuste. A coluna `change_amount` (troco calculado) pode ser virtual ou persistida.
- **Admin**: Exibir o valor pago e o troco no Painel Operacional e Financeiro.

## 4. Tipografia e Acessibilidade na Impressora
- Otimizar o espaçamento entre linhas (`lf`).
- Aumentar a fonte para itens críticos (Produtos, Totais, Troco e Observações).
- Remover o rodapé fixo atual conforme solicitado.

## 5. Testes Unitários e Validação
- Validar fluxo de "Espeto Incluso" (dinâmico, não fixo).
- Validar fluxo do Medalhão Romeu e Julieta (pergunta extra).
- Validar cálculos de troco e bloqueio de valor insuficiente.

A identidade visual do site e as regras de negócio do cardápio permanecerão inalteradas, focando estritamente na experiência de impressão e finalização de pedido.
