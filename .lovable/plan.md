# Aviso de "Estamos fechados" editável no Admin

## O que muda para você

No Admin > Configurações passa a existir um bloco **"Aviso de loja fechada"** com:

- **Título** do aviso (padrão: "Estamos fechados no momento")
- **Modo dos horários no aviso**:
  - *Automático* — monta o texto a partir dos horários cadastrados (comportamento atual)
  - *Manual* — você escreve o texto exatamente como quer que apareça
- **Texto manual** dos horários (usado no modo Manual), ex.:
  "Almoço: Seg–Sáb 11h às 14h30 · Churrasquinho: Seg–Sáb 18h às 00h · Dom 11h às 00h"

Ao salvar, o cardápio e a página inicial mostram o novo aviso imediatamente para os clientes.

## Detalhes técnicos

- Migração: nova tabela `avisos_loja` (linha única, id = 1) com `titulo_fechado`, `horarios_modo` ('auto' | 'manual'), `horarios_texto`, `updated_at` + trigger de atualização. GRANT SELECT para `anon` e `authenticated` (leitura pública), escrita só para admin via `has_role(auth.uid(),'admin')`, acesso total para `service_role`. Seed com os textos atuais.
- `src/lib/store-hours.ts`: `fetchAvisosLoja()` + `useAvisosLoja()` com React Query e fallback aos textos atuais caso a leitura falhe.
- `src/components/menu/MenuBrowser.tsx`: o bloco de loja fechada usa o título salvo e, conforme o modo, o texto manual ou o `formatSchedule` atual.
- `src/routes/index.tsx`: mesma fonte de texto onde o aviso/horários aparecem na home.
- `src/routes/admin.index.tsx`: novo card junto ao `HorariosPanel` com esses campos, mutação de update e `invalidateQueries` das chaves `avisos_loja` e `menu`.