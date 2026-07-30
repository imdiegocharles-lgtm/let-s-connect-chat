## O que já foi verificado agora

- A trava da coluna `shift_type` já está corrigida no banco: aceita `almoco` e `noite` (confere com o app).
- **Existe um turno aberto no momento**: tipo "noite", aberto hoje às 19:41 (ainda sem fechamento). Ou seja, a abertura chegou a ser gravada com sucesso — a tela de erro apareceu depois da gravação, não impedindo o registro.
- Os gatilhos de numeração de pedido e de vínculo do pedido ao turno estão ativos.
- A página `/operacional` carrega normalmente no servidor (resposta 200), então não é uma falha permanente da rota.

Conclusão honesta: a causa da tela genérica "This page didn't load" ainda **não está confirmada**. Não vou chutar um culpado — o primeiro passo do plano é reproduzir e capturar o erro real.

## Plano

### 1. Reproduzir com captura de erro
- Abrir o painel operacional em navegador automatizado com sessão autenticada, fechar o turno atual e abrir um novo turno, capturando console, requisições de rede e tela no momento exato da falha.
- Ler os logs do servidor durante a ação para identificar se a tela de erro vem de uma falha de renderização (SSR) ou de uma chamada ao banco.

### 2. Corrigir a causa identificada
- Aplicar a correção pontual conforme o que a reprodução mostrar (por exemplo: recarregamento da lista de turnos, formato de dado inesperado, ou consulta que falha após o turno abrir).

### 3. Blindar a tela contra tela branca
- Adicionar tratamento de erro próprio na rota do painel operacional, com mensagem em português e botão "Tentar novamente", em vez da tela genérica em inglês.
- Evitar duplicidade: se já houver um turno aberto, o botão "Abrir turno" mostra aviso claro em vez de tentar criar outro.

### 4. Validação
- Fechar e reabrir turno de ponta a ponta (almoço e noite), conferindo que o faturamento e os pedidos continuam vinculados corretamente ao turno.

### Detalhes técnicos
- Rota: `src/routes/operacional.tsx` (diálogos `OpenShiftDialog` / `CloseShiftDialog`, query `active-shift`).
- Tela genérica vem de `src/server.ts` + `src/lib/error-page.ts` quando a renderização no servidor falha; será substituída por `errorComponent` na rota.
- Nenhuma nova migração é prevista neste momento; se a reprodução apontar necessidade de ajuste em `get_active_shift_id()`, ela será proposta separadamente.
