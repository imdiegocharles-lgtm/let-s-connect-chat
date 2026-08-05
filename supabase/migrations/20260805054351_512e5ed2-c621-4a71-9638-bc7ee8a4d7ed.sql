ALTER TABLE public.avisos_loja
  ADD COLUMN IF NOT EXISTS home_horario_titulo text NOT NULL DEFAULT 'Horário do Delivery',
  ADD COLUMN IF NOT EXISTS home_horario_texto text NOT NULL DEFAULT 'Almoço: SEG - SÁB 11h às 14:30h
Churrasco: SEG - SÁB 18h às 00h
DOMINGO não temos delivery, somente presencial com churrasco de 11h às 00h.';

UPDATE public.avisos_loja
SET home_horario_titulo = 'Horário do Delivery',
    home_horario_texto = 'Almoço: SEG - SÁB 11h às 14:30h
Churrasco: SEG - SÁB 18h às 00h
DOMINGO não temos delivery, somente presencial com churrasco de 11h às 00h.'
WHERE id = 1;