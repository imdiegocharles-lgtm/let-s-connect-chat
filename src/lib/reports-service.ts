import { supabase } from "@/integrations/supabase/client";
import type { DailyReport, ShiftReport } from "@/lib/report";

const sb = supabase as any;

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export type ItemLine = { group: string; name: string; quantity: number };
export type MotoboyLine = { name: string; daily_rate: number; deliveries: number };

const COMBO_RE = /^(.*?)\s*\(Espeto:\s*(.+?)\)\s*$/;

function sortItems(map: Map<string, ItemLine>): ItemLine[] {
  return [...map.values()].sort(
    (a, b) => a.group.localeCompare(b.group, "pt-BR") || b.quantity - a.quantity,
  );
}

const keyOf = (group: string, name: string) => `${group}||${name}`;

/** Agrega os itens vendidos (somente pedidos com pagamento confirmado) de um turno. */
export async function aggregateShiftItems(shiftId: string): Promise<ItemLine[]> {
  const { data: orders, error: ordErr } = await sb
    .from("orders")
    .select("id, payment_confirmed_at")
    .eq("shift_id", shiftId);
  if (ordErr) throw ordErr;
  const paidIds = (orders ?? []).filter((o: any) => o.payment_confirmed_at).map((o: any) => o.id);
  if (paidIds.length === 0) return [];

  const { data: items, error } = await sb
    .from("order_items")
    .select("name, quantity, menu_items(menu_categories(name))")
    .in("order_id", paidIds);
  if (error) throw error;

  const map = new Map<string, ItemLine>();
  const add = (group: string, name: string, qty: number) => {
    const k = keyOf(group, name);
    const cur = map.get(k);
    if (cur) cur.quantity += qty;
    else map.set(k, { group, name, quantity: qty });
  };

  for (const it of items ?? []) {
    const qty = Number(it.quantity ?? 0);
    const group = it.menu_items?.menu_categories?.name ?? "Outros";
    const m = COMBO_RE.exec(String(it.name ?? ""));
    if (m) {
      add(group, m[1], qty);
      // o espeto que acompanha o combo entra na contagem de espetos
      add("Espetos", m[2], qty);
    } else {
      add(group, String(it.name ?? "Item"), qty);
    }
  }
  return sortItems(map);
}

/** Soma listas de itens de vários turnos em uma só. */
export function mergeItemLines(lists: ItemLine[][]): ItemLine[] {
  const map = new Map<string, ItemLine>();
  for (const list of lists) {
    for (const l of list ?? []) {
      const k = keyOf(l.group, l.name);
      const cur = map.get(k);
      if (cur) cur.quantity += Number(l.quantity ?? 0);
      else map.set(k, { ...l, quantity: Number(l.quantity ?? 0) });
    }
  }
  return sortItems(map);
}

/** Motoboys escalados no turno, com número de entregas realizadas. */
export async function aggregateShiftMotoboys(shiftId: string): Promise<MotoboyLine[]> {
  const { data: scale, error } = await sb
    .from("shift_motoboys")
    .select("motoboy_id, motoboys(name, daily_rate)")
    .eq("shift_id", shiftId);
  if (error) throw error;
  if (!scale || scale.length === 0) return [];

  const { data: orders } = await sb
    .from("orders")
    .select("motoboy_id")
    .eq("shift_id", shiftId)
    .not("motoboy_id", "is", null);

  const counts = new Map<string, number>();
  for (const o of orders ?? []) {
    counts.set(o.motoboy_id, (counts.get(o.motoboy_id) ?? 0) + 1);
  }

  return scale.map((s: any) => ({
    name: s.motoboys?.name ?? "Motoboy",
    daily_rate: Number(s.motoboys?.daily_rate ?? 0),
    deliveries: counts.get(s.motoboy_id) ?? 0,
  }));
}

/** Soma diárias de motoboys de vários turnos (mesmo motoboy em 2 turnos = 2 diárias). */
export function mergeMotoboyLines(lists: MotoboyLine[][]): MotoboyLine[] {
  const map = new Map<string, MotoboyLine>();
  for (const list of lists) {
    for (const m of list ?? []) {
      const cur = map.get(m.name);
      if (cur) {
        cur.deliveries += Number(m.deliveries ?? 0);
        cur.daily_rate += Number(m.daily_rate ?? 0);
      } else {
        map.set(m.name, { ...m, daily_rate: Number(m.daily_rate ?? 0), deliveries: Number(m.deliveries ?? 0) });
      }
    }
  }
  return [...map.values()];
}

function aggregate(orders: any[]) {
  const paid = orders.filter((o) => o.payment_confirmed_at);
  const totals_by_payment: Record<string, number> = {};
  let total_revenue = 0;
  let delivery_fees = 0;
  for (const o of paid) {
    const m = o.confirmed_payment_method ?? o.payment_method ?? "outros";
    totals_by_payment[m] = (totals_by_payment[m] ?? 0) + Number(o.total ?? 0);
    total_revenue += Number(o.total ?? 0);
    delivery_fees += Number(o.delivery_fee ?? 0);
  }
  return { orders_count: paid.length, total_revenue, delivery_fees, totals_by_payment };
}

/** Cria (ou recupera) o relatório do turno recém fechado. */
export async function createShiftReport(shift: {
  id: string;
  shift_type: string;
  operator_name: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
}): Promise<ShiftReport> {
  const { data: orders, error } = await sb
    .from("orders")
    .select("total, delivery_fee, payment_method, confirmed_payment_method, payment_confirmed_at")
    .eq("shift_id", shift.id);
  if (error) throw error;

  const closed_at = shift.closed_at ?? new Date().toISOString();
  const agg = aggregate(orders ?? []);
  const [items_summary, motoboys_summary] = await Promise.all([
    aggregateShiftItems(shift.id),
    aggregateShiftMotoboys(shift.id),
  ]);
  const payload = {
    shift_id: shift.id,
    report_date: shift.opened_at.slice(0, 10),
    shift_type: shift.shift_type,
    operator_name: shift.operator_name,
    opened_at: shift.opened_at,
    closed_at,
    opening_cash: Number(shift.opening_cash ?? 0),
    items_summary,
    motoboys_summary,
    ...agg,
  };

  const { data, error: upErr } = await sb
    .from("shift_reports")
    .upsert(payload, { onConflict: "shift_id" })
    .select("*")
    .single();
  if (upErr) throw upErr;
  return data as ShiftReport;
}

export async function getTodayShifts(date = todayISO()) {
  const { data, error } = await sb
    .from("shifts")
    .select("*")
    .gte("opened_at", `${date}T00:00:00`)
    .lte("opened_at", `${date}T23:59:59`)
    .order("opened_at");
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function getShiftReports(date = todayISO()) {
  const { data, error } = await sb
    .from("shift_reports")
    .select("*")
    .eq("report_date", date)
    .order("opened_at");
  if (error) throw error;
  return (data ?? []) as ShiftReport[];
}

export async function getDailyReport(date = todayISO()) {
  const { data, error } = await sb
    .from("daily_reports")
    .select("*")
    .eq("report_date", date)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as (DailyReport & { id: string; printed_at: string | null; emailed_at: string | null }) | null;
}

/** Consolida o dia — exige os dois turnos (almoço e noite) fechados. */
export async function createDailyReport(date = todayISO()) {
  const reports = await getShiftReports(date);
  const types = new Set(reports.map((r) => r.shift_type));
  if (!types.has("almoco") || !types.has("noite")) {
    throw new Error(
      "O relatório do dia só pode ser gerado depois que os dois turnos (almoço e noite) forem finalizados.",
    );
  }

  const totals_by_payment: Record<string, number> = {};
  let total_revenue = 0;
  let delivery_fees = 0;
  let orders_count = 0;
  for (const r of reports) {
    total_revenue += Number(r.total_revenue ?? 0);
    delivery_fees += Number(r.delivery_fees ?? 0);
    orders_count += Number(r.orders_count ?? 0);
    for (const [k, v] of Object.entries(r.totals_by_payment ?? {})) {
      totals_by_payment[k] = (totals_by_payment[k] ?? 0) + Number(v);
    }
  }

  const payload = {
    report_date: date,
    shifts_count: reports.length,
    orders_count,
    total_revenue,
    delivery_fees,
    totals_by_payment,
    items_summary: mergeItemLines(reports.map((r: any) => r.items_summary ?? [])),
    motoboys_summary: mergeMotoboyLines(reports.map((r: any) => r.motoboys_summary ?? [])),
    shifts_summary: reports.map((r) => ({
      shift_type: r.shift_type,
      operator_name: r.operator_name,
      opened_at: r.opened_at,
      closed_at: r.closed_at,
      orders_count: r.orders_count,
      total_revenue: r.total_revenue,
    })),
  };

  const { data, error } = await sb
    .from("daily_reports")
    .upsert(payload, { onConflict: "report_date" })
    .select("*")
    .single();
  if (error) throw error;
  return data as DailyReport & { id: string; printed_at: string | null; emailed_at: string | null };
}

export async function markPrinted(table: "shift_reports" | "daily_reports", id: string) {
  await sb.from(table).update({ printed_at: new Date().toISOString() }).eq("id", id);
}
