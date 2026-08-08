# Corrigir status de loja aberta no site do cliente

## Diagnóstico confirmado

- Existe um turno aberto no banco (`closed_at IS NULL`).
- O vídeo mostra o painel operacional com o turno aberto e o celular exibindo “Estamos fechados”.
- A consulta pública atual lê diretamente a tabela `shifts`, mas a política de segurança permite essa leitura apenas para usuários autenticados com função administrativa ou operacional. Para o cliente anônimo, a consulta retorna uma lista vazia e o site conclui incorretamente que a loja está fechada.
- A função segura `is_shift_open()` já existe no banco, retorna apenas verdadeiro/falso e pode ser executada por clientes anônimos.

## Alterações

### Verificação pública centralizada
- Criar em `src/lib/store-hours.ts` uma única consulta/hook para chamar `is_shift_open()` e obter um booleano.
- Manter atualização automática em intervalo curto para que abrir ou fechar o turno seja refletido no celular sem recarregar manualmente.
- Tratar falhas de consulta como erro visível/registrável, sem confundir uma falha de rede com “turno fechado”.

### Home, cardápio e carrinho
- Substituir as leituras diretas de `shifts` em `src/routes/index.tsx`, `src/components/menu/MenuBrowser.tsx` e `src/components/menu/CartSheet.tsx` pela verificação pública centralizada.
- Usar exclusivamente o booleano retornado para definir “loja aberta”, habilitar os botões de adicionar e permitir avançar no checkout.
- Preservar a navegação e visualização do cardápio quando não houver turno aberto.
- Remover do fluxo de compra qualquer bloqueio residual baseado na janela de horários; os horários permanecem apenas para exibição e escolha das categorias adequadas.

### Proteção do pedido
- Manter a validação já existente no servidor e o gatilho do banco para impedir pedidos sem turno aberto, inclusive contra tentativas de burlar o navegador.
- Não liberar leitura pública dos registros completos de `shifts`; somente o resultado booleano será exposto.

## Verificação

- Com turno aberto: confirmar no domínio usado pelo celular que o aviso de fechado desaparece, os botões ficam ativos e o checkout avança.
- Fechar o turno: confirmar que o aviso reaparece após a atualização automática e que um pedido não pode ser criado.
- Validar em viewport móvel e conferir que a consulta pública retorna `true` enquanto `closed_at IS NULL`.

## Detalhes técnicos

- Fonte pública do estado: `rpc('is_shift_open')`.
- A tabela `shifts` continua protegida por RLS para operadores e administradores.
- A mesma chave de cache será compartilhada pela Home, cardápio e carrinho para evitar estados divergentes.