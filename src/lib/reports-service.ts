import { supabase } from "@/integrations/supabase/client";
import type { DailyReport, ShiftReport } from "@/lib/report";

const sb = supabase as any;

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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
  const payload = {
    shift_id: shift.id,
    report_date: shift.opened_at.slice(0, 10),
    shift_type: shift.shift_type,
    operator_name: shift.operator_name,
    opened_at: shift.opened_at,
    closed_at,
    opening_cash: Number(shift.opening_cash ?? 0),
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
