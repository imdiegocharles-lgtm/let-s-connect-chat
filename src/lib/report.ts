import iconv from 'iconv-lite';

const ESC = {
  init: [0x1b, 0x40],
  lf: [0x0a],
  center: [0x1b, 0x61, 0x01],
  left: [0x1b, 0x61, 0x00],
  boldOn: [0x1b, 0x45, 0x01],
  boldOff: [0x1b, 0x45, 0x00],
  doubleWidth: [0x1b, 0x21, 0x20],
  normal: [0x1b, 0x21, 0x00],
  cut: [0x1d, 0x56, 0x42, 0x00],
  selectCP860: [0x1b, 0x74, 0x03],
};

function encode(str: string): number[] {
  return Array.from(iconv.encode(str, 'cp860'));
}
const line = (text = "") => encode(text).concat(ESC.lf);
const pad = (l: string, r: string, w = 48) =>
  l + ".".repeat(Math.max(1, w - l.length - r.length)) + r;

export const money = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  credito: "Cartao de Credito",
  debito: "Cartao de Debito",
  sodexo: "Vale-refeicao Sodexo",
  alelo: "Vale-refeicao Alelo",
  pix: "Pix (na entrega)",
};

export type ItemLine = { group: string; name: string; quantity: number };
export type MotoboyLine = { name: string; daily_rate: number; deliveries: number };
export type ComboLine = {
  combo: string;
  total: number;
  skewers: { name: string; quantity: number }[];
};

export type ShiftReport = {
  report_date: string;
  shift_type: string;
  operator_name: string | null;
  opened_at: string;
  closed_at: string;
  opening_cash: number;
  orders_count: number;
  total_revenue: number;
  delivery_fees: number;
  totals_by_payment: Record<string, number>;
  items_summary?: ItemLine[];
  motoboys_summary?: MotoboyLine[];
  combos_summary?: ComboLine[];
};

export type DailyReport = {
  report_date: string;
  shifts_count: number;
  orders_count: number;
  total_revenue: number;
  delivery_fees: number;
  totals_by_payment: Record<string, number>;
  items_summary?: ItemLine[];
  motoboys_summary?: MotoboyLine[];
  combos_summary?: ComboLine[];
  shifts_summary: {
    shift_type: string;
    operator_name: string | null;
    opened_at: string;
    closed_at: string;
    orders_count: number;
    total_revenue: number;
  }[];
};

const shiftLabel = (t: string) => (t === "almoco" ? "ALMOCO / DIA" : "CHURRASCO / NOITE");
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dateBR = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

function header(out: number[], title: string) {
  out.push(...ESC.init, ...ESC.selectCP860, ...ESC.center, ...ESC.boldOn, ...ESC.doubleWidth);
  out.push(...line("FAMILIA AMARAL"));
  out.push(...ESC.normal);
  out.push(...line(title));
  out.push(...ESC.boldOff);
  out.push(...line("------------------------------"));
  out.push(...ESC.left);
}

function paymentBlock(out: number[], totals: Record<string, number>) {
  out.push(...ESC.boldOn, ...line("POR FORMA DE PAGAMENTO (CONFIRMADA)"), ...ESC.boldOff);
  const entries = Object.entries(totals ?? {}).filter(([, v]) => Number(v) > 0);
  if (entries.length === 0) out.push(...line("Nenhum pagamento confirmado"));
  for (const [k, v] of entries) {
    out.push(...line(pad(PAYMENT_LABELS[k] ?? k, money(Number(v)))));
  }
}

function itemsBlock(out: number[], items?: ItemLine[]) {
  out.push(...ESC.boldOn, ...line("ITENS VENDIDOS (PAGAMENTO CONFIRMADO)"), ...ESC.boldOff);
  const list = (items ?? []).filter((i) => Number(i.quantity) > 0);
  if (list.length === 0) {
    out.push(...line("Nenhum item vendido"));
    return;
  }
  const groups = new Map<string, ItemLine[]>();
  for (const i of list) {
    const g = i.group || "Outros";
    groups.set(g, [...(groups.get(g) ?? []), i]);
  }
  let totalQty = 0;
  for (const [group, lines] of groups) {
    out.push(...line(`> ${group.toUpperCase()}`));
    for (const i of lines) {
      totalQty += Number(i.quantity);
      out.push(...line(pad(`  ${i.name}`, `${i.quantity} un`)));
    }
  }
  out.push(...ESC.boldOn, ...line(pad("TOTAL DE ITENS", `${totalQty} un`)), ...ESC.boldOff);
}

function combosBlock(out: number[], combos?: ComboLine[]) {
  const list = (combos ?? []).filter((c) => Number(c.total) > 0);
  if (list.length === 0) return;
  out.push(...line(""));
  out.push(...ESC.boldOn, ...line("ESPETOS INCLUSOS NOS COMPLETOS"), ...ESC.boldOff);
  out.push(...line("(escolha do prato - nao e venda avulsa)"));
  for (const c of list) {
    out.push(...line(pad(c.combo, `${c.total} vendidos`)));
    for (const s of c.skewers ?? []) {
      out.push(...line(pad(`  - ${s.name}`, `${s.quantity}`)));
    }
  }
}

function motoboysBlock(out: number[], motoboys?: MotoboyLine[]) {
  const list = motoboys ?? [];
  if (list.length === 0) return;
  out.push(...line(""));
  out.push(...ESC.boldOn, ...line("MOTOBOYS"), ...ESC.boldOff);
  let total = 0;
  for (const m of list) {
    total += Number(m.daily_rate ?? 0);
    out.push(...line(pad(`${m.name} (${m.deliveries} entregas)`, money(Number(m.daily_rate ?? 0)))));
  }
  out.push(...ESC.boldOn, ...line(pad("TOTAL DIARIAS", money(total))), ...ESC.boldOff);
}

export function buildShiftReportBytes(r: ShiftReport): Uint8Array {
  const out: number[] = [];
  header(out, "RELATORIO DE TURNO");
  out.push(...line(`Data: ${dateBR(r.report_date)}`));
  out.push(...ESC.boldOn, ...line(`Turno: ${shiftLabel(r.shift_type)}`), ...ESC.boldOff);
  out.push(...line(`Operador: ${r.operator_name ?? "-"}`));
  out.push(...line(`Abertura: ${hhmm(r.opened_at)}   Fechamento: ${hhmm(r.closed_at)}`));
  out.push(...line("------------------------------"));
  out.push(...line(pad("Caixa inicial", money(r.opening_cash))));
  out.push(...line(pad("Pedidos", String(r.orders_count))));
  out.push(...line(pad("Taxas de entrega", money(r.delivery_fees))));
  out.push(...ESC.boldOn, ...line(pad("TOTAL FATURADO", money(r.total_revenue))), ...ESC.boldOff);
  out.push(...line(""));
  paymentBlock(out, r.totals_by_payment);
  out.push(...line(""));
  itemsBlock(out, r.items_summary);
  combosBlock(out, r.combos_summary);
  motoboysBlock(out, r.motoboys_summary);
  out.push(...line(""));
  out.push(...ESC.center, ...line("Relatorio de turno - Familia Amaral"));
  out.push(...line(""), ...line(""), ...ESC.cut);
  return new Uint8Array(out);
}

export function buildDailyReportBytes(r: DailyReport): Uint8Array {
  const out: number[] = [];
  header(out, "RELATORIO DO DIA");
  out.push(...ESC.boldOn, ...line(`Data: ${dateBR(r.report_date)}`), ...ESC.boldOff);
  out.push(...line(`Turnos finalizados: ${r.shifts_count}`));
  out.push(...line("------------------------------"));
  for (const s of r.shifts_summary) {
    out.push(...ESC.boldOn, ...line(shiftLabel(s.shift_type)), ...ESC.boldOff);
    out.push(...line(`Operador: ${s.operator_name ?? "-"}`));
    out.push(...line(`${hhmm(s.opened_at)} as ${hhmm(s.closed_at)}`));
    out.push(...line(pad("Pedidos", String(s.orders_count))));
    out.push(...line(pad("Faturado", money(s.total_revenue))));
    out.push(...line(""));
  }
  out.push(...line("------------------------------"));
  out.push(...line(pad("Pedidos no dia", String(r.orders_count))));
  out.push(...line(pad("Taxas de entrega", money(r.delivery_fees))));
  out.push(...ESC.boldOn, ...ESC.doubleWidth);
  out.push(...line(pad("TOTAL DIA", money(r.total_revenue), 24)));
  out.push(...ESC.normal, ...ESC.boldOff);
  out.push(...line(""));
  paymentBlock(out, r.totals_by_payment);
  out.push(...line(""));
  itemsBlock(out, r.items_summary);
  combosBlock(out, r.combos_summary);
  motoboysBlock(out, r.motoboys_summary);
  out.push(...line(""));
  out.push(...ESC.center, ...line("Relatorio consolidado do dia"));
  out.push(...line("Familia Amaral"));
  out.push(...line(""), ...line(""), ...ESC.cut);
  return new Uint8Array(out);
}

export async function sendBytesToPrinter(agentUrl: string, bytes: Uint8Array) {
  const res = await fetch(agentUrl, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Blob([bytes.buffer as ArrayBuffer]),
  });
  if (!res.ok) throw new Error(`Erro ${res.status}: ${await res.text().catch(() => "desconhecido")}`);
}

export function reportToText(r: DailyReport): string {
  const lines: string[] = [];
  lines.push(`RELATORIO DO DIA - ${dateBR(r.report_date)}`);
  lines.push(`Turnos finalizados: ${r.shifts_count}`);
  lines.push("");
  for (const s of r.shifts_summary) {
    lines.push(
      `${shiftLabel(s.shift_type)} (${hhmm(s.opened_at)}-${hhmm(s.closed_at)}) — ${s.orders_count} pedidos — ${money(s.total_revenue)}`,
    );
  }
  lines.push("");
  lines.push(`Pedidos no dia: ${r.orders_count}`);
  lines.push(`Taxas de entrega: ${money(r.delivery_fees)}`);
  lines.push(`TOTAL DIA: ${money(r.total_revenue)}`);
  lines.push("");
  lines.push("Por forma de pagamento confirmada:");
  for (const [k, v] of Object.entries(r.totals_by_payment ?? {})) {
    if (Number(v) > 0) lines.push(`- ${PAYMENT_LABELS[k] ?? k}: ${money(Number(v))}`);
  }
  return lines.join("\n");
}
