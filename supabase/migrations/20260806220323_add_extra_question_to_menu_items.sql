ALTER TABLE public.menu_items 
ADD COLUMN has_extra_question BOOLEAN DEFAULT false,
ADD COLUMN extra_question_text TEXT,
ADD COLUMN extra_question_options TEXT[];

COMMENT ON COLUMN public.menu_items.extra_question_options IS 'Array of strings representing possible answers for the extra question';
