# Remover a marca "Edit with Lovable" do site publicado

## Objetivo
Ocultar permanentemente o badge "Edit with Lovable" que aparece sobre o site publicado para que os clientes nunca o vejam — mesmo que ele tenha um "x" para fechar.

## Ação
- Usar a configuração de publicação (`publish_settings--set_badge_visibility`) com `hide_badge: true`.

## Observação
- Ocultar o badge exige plano Pro ou superior. Se o plano atual não permitir, a tentativa retornará um erro e informaremos a alternativa.
