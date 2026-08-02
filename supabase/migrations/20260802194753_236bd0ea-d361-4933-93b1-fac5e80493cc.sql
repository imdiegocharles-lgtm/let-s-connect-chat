CREATE TABLE public.horarios_funcionamento (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  tipo text NOT NULL CHECK (tipo IN ('almoco','churrasquinho')),
  hora_abertura time NOT NULL,
  hora_fechamento time NOT NULL,
  delivery_disponivel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dia_semana, tipo)
);

GRANT SELECT ON public.horarios_funcionamento TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horarios_funcionamento TO authenticated;
GRANT ALL ON public.horarios_funcionamento TO service_role;

ALTER TABLE public.horarios_funcionamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Horarios visiveis para todos" ON public.horarios_funcionamento
  FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam horarios" ON public.horarios_funcionamento
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_horarios_funcionamento_updated_at
  BEFORE UPDATE ON public.horarios_funcionamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.configuracoes_entrega (
  id integer NOT NULL PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  prazo_minimo_minutos integer NOT NULL DEFAULT 40,
  prazo_maximo_minutos integer NOT NULL DEFAULT 80,
  texto_observacao text NOT NULL DEFAULT 'Podendo ocorrer antes do prazo informado',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.configuracoes_entrega TO anon;
GRANT SELECT, UPDATE ON public.configuracoes_entrega TO authenticated;
GRANT ALL ON public.configuracoes_entrega TO service_role;

ALTER TABLE public.configuracoes_entrega ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Config entrega visivel para todos" ON public.configuracoes_entrega
  FOR SELECT USING (true);
CREATE POLICY "Admins atualizam config entrega" ON public.configuracoes_entrega
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_configuracoes_entrega_updated_at
  BEFORE UPDATE ON public.configuracoes_entrega
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.configuracoes_entrega (id) VALUES (1);

INSERT INTO public.horarios_funcionamento (dia_semana, tipo, hora_abertura, hora_fechamento, delivery_disponivel) VALUES
  (1,'almoco','11:00','14:30',true),
  (2,'almoco','11:00','14:30',true),
  (3,'almoco','11:00','14:30',true),
  (4,'almoco','11:00','14:30',true),
  (5,'almoco','11:00','14:30',true),
  (6,'almoco','11:00','14:30',true),
  (1,'churrasquinho','18:00','23:59',true),
  (2,'churrasquinho','18:00','23:59',true),
  (3,'churrasquinho','18:00','23:59',true),
  (4,'churrasquinho','18:00','23:59',true),
  (5,'churrasquinho','18:00','23:59',true),
  (6,'churrasquinho','18:00','23:59',true),
  (0,'churrasquinho','11:00','23:59',false);