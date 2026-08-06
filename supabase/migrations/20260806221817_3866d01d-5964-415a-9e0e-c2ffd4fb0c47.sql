DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'has_extra_question') THEN
    ALTER TABLE public.menu_items ADD COLUMN has_extra_question BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'extra_question_text') THEN
    ALTER TABLE public.menu_items ADD COLUMN extra_question_text TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'extra_question_options') THEN
    ALTER TABLE public.menu_items ADD COLUMN extra_question_options TEXT[];
    COMMENT ON COLUMN public.menu_items.extra_question_options IS 'Array of strings representing possible answers for the extra question';
  END IF;
END $$;

-- Refresh PostgREST cache (this is usually automatic but sometimes needs a manual nudge or just a delay)
NOTIFY pgrst, 'reload schema';