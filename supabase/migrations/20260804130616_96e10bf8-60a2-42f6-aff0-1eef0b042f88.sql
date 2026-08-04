CREATE TABLE public.avisos_loja (
  id integer PRIMARY KEY DEFAULT 1,
  titulo_fechado text NOT NULL DEFAULT 'Estamos fechados no momento',
  horarios_modo text NOT NULL DEFAULT 'auto',
  horarios_texto text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT avisos_loja_single_row CHECK (id = 1),
  CONSTRAINT avisos_loja_modo_check CHECK (horarios_modo IN ('auto','manual'))
);

GRANT SELECT ON public.avisos_loja TO anon;
GRANT SELECT, UPDATE ON public.avisos_loja TO authenticated;
GRANT ALL ON public.avisos_loja TO service_role;

ALTER TABLE public.avisos_loja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aviso visivel para todos" ON public.avisos_loja
  FOR SELECT USING (true);

CREATE POLICY "Admins editam o aviso" ON public.avisos_loja
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER avisos_loja_updated_at
  BEFORE UPDATE ON public.avisos_loja
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.avisos_loja (id, titulo_fechado, horarios_modo, horarios_texto)
VALUES (1, 'Estamos fechados no momento', 'auto', 'Almoço: Seg–Sáb 11h às 14h30 · Churrasquinho: Seg–Sáb 18h às 00h · Dom 11h às 00h');