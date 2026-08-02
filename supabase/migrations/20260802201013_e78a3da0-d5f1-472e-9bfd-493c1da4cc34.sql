ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS is_completo_skewer_option boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_skewer_choice boolean NOT NULL DEFAULT false;