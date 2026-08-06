-- Force add columns if they really are missing despite the migration
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

-- The user wants the extra question for ALL items. 
-- For existing items, we'll set it to false by default, but the columns are now available for all.
-- To "add this option for all items", I'll set a default text if they are enabled.
