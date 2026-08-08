import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ServiceType = "almoco" | "churrasquinho";

export type Horario = {
  id: string;
  dia_semana: number;
  tipo: ServiceType;
  hora_abertura: string;
  hora_fechamento: string;
  delivery_disponivel: boolean;
};

export type ConfigEntrega = {
  prazo_minimo_minutos: number;
  prazo_maximo_minutos: number;
  texto_observacao: string;
};

export type AvisoLoja = {
  titulo_fechado: string;
  horarios_modo: "auto" | "manual";
  horarios_texto: string;
  home_horario_titulo: string;
  home_horario_texto: string;
  order_confirmation_message?: string;
  order_estimated_time?: string;
};

export const DAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const SERVICE_LABELS: Record<ServiceType, string> = {
  almoco: "Almoço",
  churrasquinho: "Churrasquinho",
};

const DEFAULT_DELIVERY: ConfigEntrega = {
  prazo_minimo_minutos: 40,
  prazo_maximo_minutos: 80,
  texto_observacao: "Podendo ocorrer antes do prazo informado",
};

export const DEFAULT_AVISO: AvisoLoja = {
  titulo_fechado: "Estamos fechados no momento",
  horarios_modo: "auto",
  horarios_texto: "",
  home_horario_titulo: "Horário do Delivery",
  home_horario_texto:
    "Almoço: SEG - SÁB 11h às 14:30h\nChurrasco: SEG - SÁB 18h às 00h\nDOMINGO não temos delivery, somente presencial com churrasco de 11h às 00h.",
  order_confirmation_message: "Seu pedido foi recebido com sucesso!",
  order_estimated_time: "40-80 min, podendo chegar antes",
};

export async function fetchHorarios(): Promise<Horario[]> {
  const { data, error } = await supabase
    .from("horarios_funcionamento")
    .select("id, dia_semana, tipo, hora_abertura, hora_fechamento, delivery_disponivel")
    .order("dia_semana")
    .order("hora_abertura");
  if (error) throw error;
  return (data ?? []) as Horario[];
}

export async function fetchConfigEntrega(): Promise<ConfigEntrega> {
  const { data } = await supabase
    .from("configuracoes_entrega")
    .select("prazo_minimo_minutos, prazo_maximo_minutos, texto_observacao")
    .eq("id", 1)
    .maybeSingle();
  return (data as ConfigEntrega) ?? DEFAULT_DELIVERY;
}

export function useHorarios() {
  return useQuery({ queryKey: ["horarios_funcionamento"], queryFn: fetchHorarios });
}

export function useConfigEntrega() {
  return useQuery({ queryKey: ["configuracoes_entrega"], queryFn: fetchConfigEntrega });
}

export async function fetchAvisoLoja(): Promise<AvisoLoja> {
  const { data } = await supabase
    .from("avisos_loja")
    .select("titulo_fechado, horarios_modo, horarios_texto, home_horario_titulo, home_horario_texto, order_confirmation_message, order_estimated_time")
    .eq("id", 1)
    .maybeSingle();
  return (data as AvisoLoja) ?? DEFAULT_AVISO;
}

export function useAvisoLoja() {
  return useQuery({ queryKey: ["avisos_loja"], queryFn: fetchAvisoLoja });
}

/** Momento atual no fuso America/Sao_Paulo. */
export function nowInSaoPaulo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const hour = Number(get("hour")) % 24;
  return {
    dow: weekdayMap[get("weekday")] ?? new Date().getDay(),
    minutes: hour * 60 + Number(get("minute")),
  };
}

export function toMinutes(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatHour(t: string) {
  const [h, m] = t.slice(0, 5).split(":");
  return Number(m) === 0 ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/** 00:00 como fechamento significa fim do dia. */
function closeMinutes(t: string) {
  const v = toMinutes(t);
  return v === 0 ? 24 * 60 : v;
}

export type StoreStatus = {
  /** Janela de serviço aberta agora (null = fechado) */
  openService: ServiceType | null;
  /** Se o dia atual aceita delivery */
  deliveryToday: boolean;
  /** Pode receber pedidos agora */
  canOrder: boolean;
  todayLabel: string;
  todayWindows: Horario[];
};

export function getStoreStatus(horarios: Horario[], date = new Date()): StoreStatus {
  const { dow, minutes } = nowInSaoPaulo(date);
  const todayWindows = horarios.filter((h) => h.dia_semana === dow);
  const open = todayWindows.find(
    (h) => minutes >= toMinutes(h.hora_abertura) && minutes <= closeMinutes(h.hora_fechamento),
  );
  const deliveryToday = todayWindows.some((h) => h.delivery_disponivel);
  return {
    openService: (open?.tipo as ServiceType) ?? null,
    deliveryToday,
    canOrder: Boolean(open && open.delivery_disponivel),
    todayLabel: DAY_LABELS[dow] ?? "",
    todayWindows,
  };
}

/** "Seg–Sáb 18h às 00h · Dom 11h às 00h" agrupando dias com o mesmo horário. */
export function formatSchedule(horarios: Horario[], tipo?: ServiceType) {
  const rows = (tipo ? horarios.filter((h) => h.tipo === tipo) : horarios).slice().sort((a, b) => {
    const oa = a.dia_semana === 0 ? 7 : a.dia_semana;
    const ob = b.dia_semana === 0 ? 7 : b.dia_semana;
    return oa - ob;
  });
  if (!rows.length) return "";

  const groups: { days: number[]; open: string; close: string }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    const sameHours =
      last && last.open === r.hora_abertura.slice(0, 5) && last.close === r.hora_fechamento.slice(0, 5);
    const order = r.dia_semana === 0 ? 7 : r.dia_semana;
    const lastOrder = last ? (last.days[last.days.length - 1] === 0 ? 7 : last.days[last.days.length - 1]) : -9;
    if (sameHours && order === lastOrder + 1) last.days.push(r.dia_semana);
    else
      groups.push({
        days: [r.dia_semana],
        open: r.hora_abertura.slice(0, 5),
        close: r.hora_fechamento.slice(0, 5),
      });
  }

  return groups
    .map((g) => {
      const label =
        g.days.length === 1
          ? DAY_SHORT[g.days[0]]
          : `${DAY_SHORT[g.days[0]]}–${DAY_SHORT[g.days[g.days.length - 1]]}`;
      const close = g.close === "23:59" ? "00h" : formatHour(g.close);
      return `${label} ${formatHour(g.open)} às ${close}`;
    })
    .join(" · ");
}