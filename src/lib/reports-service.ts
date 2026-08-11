import { supabase } from "@/integrations/supabase/client";
import type { DailyReport, ShiftReport } from "@/lib/report";

const sb = supabase as any;

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export type ItemLine = { group: string; name: string; quantity: number };
export type MotoboyLine = { 
  name: string; 
  daily_rate: number; 
  deliveries: number;
  delivery_fees_total: number;
  gas_help: number;
};
export type ComboLine = {
  combo: string;
  total: number;
  skewers: { name: string; quantity: number }[];
};

const COMBO_RE = /^(.*?)\s*\(Espeto:\s*(.+?)\)\s*$/;
const SIDE_RE = /^(.*?)\s*\(Acompanhamento:\s*(.+?)\)\s*$/;

function sortItems(map: Map<string, ItemLine>): ItemLine[] {
  return [...map.values()].sort(
    (a, b) => a.group.localeCompare(b.group, "pt-BR") || b.quantity - a.quantity,
  );
}

const keyOf = (group: string, name: string) => `${group}||${name}`;

/** Agrega os itens vendidos (somente pedidos com pagamento confirmado e NÃO excluídos) de um turno. */
export async function aggregateShiftItems(
  shiftId: string,
): Promise<{ items: ItemLine[]; combos: ComboLine[]; deletedOrders: any[] }> {
  const { data: orders, error: ordErr } = await sb
    .from("orders")
    .select("id, payment_confirmed_at, deleted_at, deletion_reason, order_number, total, customer_name")
    .eq("shift_id", shiftId);
  if (ordErr) throw ordErr;

  const paidIds = (orders ?? [])
    .filter((o: any) => o.payment_confirmed_at && !o.deleted_at)
    .map((o: any) => o.id);

  const deletedOrders = (orders ?? [])
    .filter((o: any) => o.deleted_at)
    .map((o: any) => ({
      order_number: o.order_number,
      total: o.total,
      customer_name: o.customer_name,
      reason: o.deletion_reason,
    }));

  if (paidIds.length === 0) return { items: [], combos: [], deletedOrders };

  const { data: items, error } = await sb
    .from("order_items")
    .select("name, quantity, menu_items(menu_categories(name))")
    .in("order_id", paidIds);
  if (error) throw error;

  const map = new Map<string, ItemLine>();
  const combos = new Map<string, ComboLine>();
  const add = (group: string, name: string, qty: number) => {
    const k = keyOf(group, name);
    const cur = map.get(k);
    if (cur) cur.quantity += qty;
    else map.set(k, { group, name, quantity: qty });
  };
  const addCombo = (combo: string, skewer: string, qty: number) => {
    const cur = combos.get(combo) ?? { combo, total: 0, skewers: [] };
    cur.total += qty;
    const s = cur.skewers.find((x) => x.name === skewer);
    if (s) s.quantity += qty;
    else cur.skewers.push({ name: skewer, quantity: qty });
    combos.set(combo, cur);
  };

  for (const it of items ?? []) {
    const qty = Number(it.quantity ?? 0);
    const group = it.menu_items?.menu_categories?.name ?? "Outros";
    const m = COMBO_RE.exec(String(it.name ?? ""));
    const s = SIDE_RE.exec(String(it.name ?? ""));
    if (m) {
      add(group, m[1], qty);
      // o espeto incluso NÃO entra na contagem de espetos avulsos
      addCombo(m[1], m[2], qty);
    } else if (s) {
      add(group, s[1], qty);
      // Contabiliza o acompanhamento no mesmo padrão visual dos espetos nos relatórios
      addCombo(s[1], s[2], qty);
    } else {
      add(group, String(it.name ?? "Item"), qty);
    }
  }
  const comboList = [...combos.values()]
    .map((c) => ({ ...c, skewers: c.skewers.sort((a, b) => b.quantity - a.quantity) }))
    .sort((a, b) => b.total - a.total);
  return { items: sortItems(map), combos: comboList, deletedOrders };
}

/** Soma as escolhas de espeto dos Completos de vários turnos. */
export function mergeComboLines(lists: ComboLine[][]): ComboLine[] {
  const map = new Map<string, ComboLine>();
  for (const list of lists) {
    for (const c of list ?? []) {
      const cur = map.get(c.combo) ?? { combo: c.combo, total: 0, skewers: [] };
      cur.total += Number(c.total ?? 0);
      for (const s of c.skewers ?? []) {
        const found = cur.skewers.find((x) => x.name === s.name);
        if (found) found.quantity += Number(s.quantity ?? 0);
        else cur.skewers.push({ name: s.name, quantity: Number(s.quantity ?? 0) });
      }
      map.set(c.combo, cur);
    }
  }
  return [...map.values()]
    .map((c) => ({ ...c, skewers: c.skewers.sort((a, b) => b.quantity - a.quantity) }))
    .sort((a, b) => b.total - a.total);
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

/** Motoboys escalados no turno, com número de entregas realizadas e valores calculados. */
export async function aggregateShiftMotoboys(shiftId: string): Promise<MotoboyLine[]> {
  const { data: shift, error: shiftErr } = await sb
    .from("shifts")
    .select("shift_type")
    .eq("id", shiftId)
    .single();
  if (shiftErr) throw shiftErr;

  const { data: scale, error } = await sb
    .from("shift_motoboys")
    .select("motoboy_id, motoboys(name, daily_rate)")
    .eq("shift_id", shiftId);
  if (error) throw error;
  if (!scale || scale.length === 0) return [];

  const { data: orders } = await sb
    .from("orders")
    .select("motoboy_id, neighborhood")
    .eq("shift_id", shiftId)
    .not("motoboy_id", "is", null);

  const { data: neighborhoods } = await sb
    .from("neighborhoods")
    .select("name, motoboy_fee_almoco, motoboy_fee_noite");

  const counts = new Map<string, { count: number; fees: number }>();
  for (const o of orders ?? []) {
    const hood = neighborhoods?.find((n: any) => n.name === o.neighborhood);
    const fee = shift.shift_type === "almoco" 
      ? Number(hood?.motoboy_fee_almoco ?? 0) 
      : Number(hood?.motoboy_fee_noite ?? 0);
    
    const cur = counts.get(o.motoboy_id) ?? { count: 0, fees: 0 };
    counts.set(o.motoboy_id, { count: cur.count + 1, fees: cur.fees + fee });
  }

  return scale.map((s: any) => {
    const stats = counts.get(s.motoboy_id) ?? { count: 0, fees: 0 };
    return {
      name: s.motoboys?.name ?? "Motoboy",
      daily_rate: Number(s.motoboys?.daily_rate ?? 0),
      gas_help: Number(s.motoboys?.daily_rate ?? 0),
      deliveries: stats.count,
      delivery_fees_total: stats.fees,
    };
  });
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
        cur.gas_help += Number(m.gas_help ?? 0);
        cur.delivery_fees_total += Number(m.delivery_fees_total ?? 0);
      } else {
        map.set(m.name, { 
          name: m.name,
          deliveries: Number(m.deliveries ?? 0),
          daily_rate: Number(m.daily_rate ?? 0),
          gas_help: Number(m.gas_help ?? 0),
          delivery_fees_total: Number(m.delivery_fees_total ?? 0)
        });
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
    .select("total, delivery_fee, payment_method, confirmed_payment_method, payment_confirmed_at, deleted_at")
    .eq("shift_id", shift.id);
  if (error) throw error;

  const closed_at = shift.closed_at ?? new Date().toISOString();
  const agg = aggregate(orders?.filter((o: any) => !o.deleted_at) ?? []);
  const [itemsAgg, motoboys_summary] = await Promise.all([
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
    items_summary: itemsAgg.items,
    combos_summary: itemsAgg.combos,
    motoboys_summary,
    deleted_orders: itemsAgg.deletedOrders,
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
    // Consideramos o dia baseado na data de ABERTURA.
    // Assim, se abrir às 23:50 do dia 10 e fechar às 01:00 do dia 11,
    // ele pertence ao dia 10.
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

  const deleted_orders = reports.flatMap((r: any) => r.deleted_orders ?? []);

  const payload = {
    report_date: date,
    shifts_count: reports.length,
    orders_count,
    total_revenue,
    delivery_fees,
    totals_by_payment,
    deleted_orders,
    items_summary: mergeItemLines(reports.map((r: any) => r.items_summary ?? [])),
    combos_summary: mergeComboLines(reports.map((r: any) => r.combos_summary ?? [])),
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
