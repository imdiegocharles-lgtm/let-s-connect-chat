## Plano: Impressão automática na Elgin i9 Full (agente Elgin oficial)

### Como vai funcionar
1. Cliente faz pedido pelo link público no celular.
2. Pedido é salvo no banco na nuvem.
3. Na loja, PC com a tela **Cozinha** aberta recebe o pedido em tempo real.
4. Cupom é montado em ESC/POS e enviado para o **agente Elgin** rodando em `localhost` no PC.
5. Agente repassa o comando para a impressora i9 Full conectada via USB.

### Etapas de implementação

#### 1. Banco de dados
- Adicionar coluna `order_number` em `orders` para numeração sequencial do dia (ex: `#0042`).
- Criar função/trigger para gerar o próximo número automaticamente por dia.
- Habilitar **Realtime** na tabela `orders` para a tela Cozinha receber novos pedidos instantaneamente.

#### 2. Tela "Cozinha" (`/admin/cozinha`)
- Nova rota protegida para admin.
- Lista de pedidos em cards com: nº, hora, cliente, telefone, endereço, bairro, itens, total, pagamento e observações.
- Botões de status: **Recebido → Em preparo → Pronto → Entregue**.
- Botão **"Imprimir cupom"** em cada pedido.
- Toggle **"Imprimir novos pedidos automaticamente"**.
- Som de notificação ao chegar pedido novo.

#### 3. Gerador de cupom ESC/POS
- Módulo que monta o cupom 80mm com:
  - Cabeçalho: nome do restaurante e logo (texto).
  - Nº do pedido e data/hora.
  - Dados do cliente: nome, telefone, endereço completo, bairro.
  - Itens: quantidade × nome ......... preço.
  - Subtotal, taxa de entrega, total.
  - Forma de pagamento + troco (se dinheiro).
  - Observações.
  - Rodapé com agradecimento.
- Comandos de corte de papel e beep opcional.

#### 4. Conexão com o agente Elgin local
- Campo configurável para endereço do agente (padrão: `http://localhost:8080` — ajustável se a Elgin usar outra porta).
- Botão **"Testar impressora"** que envia um cupom de teste.
- Envio do cupom em ESC/POS via POST para o endpoint do agente.
- Tratamento de erro amigável: se o agente não responder, mostra alerta "Verifique se o utilitário Elgin está aberto".

#### 5. Configuração no PC da loja (você faz do lado de lá)
1. Instalar o utilitário/agente Elgin no computador da loja.
2. Conectar a Elgin i9 Full via USB e instalá-la como padrão no Windows.
3. Abrir o navegador em `https://seu-site.lovable.app/admin/cozinha` e fazer login.
4. Clicar em **"Testar impressora"** para confirmar que imprime.
5. Deixar a aba Cozinha aberta durante o expediente.

### Resultado esperado
- Pedido feito pelo cliente → aparece na tela Cozinha em segundos → cupom impresso automaticamente na Elgin i9 Full.
- Endereço, forma de pagamento, troco e observações todos no cupom.
- Reimpressão manual disponível para qualquer pedido.

### Observação importante
A impressão depende do PC da loja estar ligado, com a aba Cozinha aberta e o agente Elgin rodando. O celular do cliente não precisa de nada instalado.
