import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

const FilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(["today", "yesterday", "last7days", "thisMonth", "lastMonth", "thisYear", "custom"]).default("today"),
});

export const getFinancialStats = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => FilterSchema.parse(data))
  .handler(async ({ data }) => {
    let start: Date;
    let end = new Date();
    end.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (data.period) {
      case "yesterday":
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(today);
        end.setMilliseconds(-1);
        break;
      case "last7days":
        start = new Date(today);
        start.setDate(start.getDate() - 7);
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
        break;
      case "thisYear":
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case "custom":
        start = data.startDate ? new Date(data.startDate) : today;
        if (data.endDate) {
          end = new Date(data.endDate);
          end.setHours(23, 59, 59, 999);
        }
        break;
      case "today":
      default:
        start = today;
        break;
    }

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Comparação com período anterior (mesmo intervalo de dias antes do 'start')
    const diff = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - diff - 1);
    const prevEnd = new Date(start.getTime() - 1);
    const prevStartISO = prevStart.toISOString();
    const prevEndISO = prevEnd.toISOString();

    const [currentData, previousData] = await Promise.all([
      fetchPeriodStats(startISO, endISO),
      fetchPeriodStats(prevStartISO, prevEndISO),
    ]);

    // Calcular faturamento por dia para o gráfico
    const { data: dailyChart } = await sb
      .from("orders")
      .select("total, created_at")
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .not("payment_confirmed_at", "is", null);

    const chartDataMap: Record<string, number> = {};
    (dailyChart ?? []).forEach((o: any) => {
      const date = o.created_at.slice(0, 10);
      chartDataMap[date] = (chartDataMap[date] ?? 0) + Number(o.total || 0);
    });

    const chartData = Object.entries(chartDataMap)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Faturamento por categoria
    const { data: categoryData, error: catErr } = await sb
      .from("order_items")
      .select("quantity, unit_price, name, menu_items(name, menu_categories(name)), order:orders!inner(payment_confirmed_at)")
      .gte("orders.created_at", startISO)
      .lte("orders.created_at", endISO)
      .not("orders.payment_confirmed_at", "is", null);

    if (catErr) throw catErr;

    const categoriesMap: Record<string, number> = {};
    const itemsMap: Record<string, { name: string, qty: number, revenue: number }> = {};

    (categoryData ?? []).forEach((item: any) => {
      const catName = item.menu_items?.menu_categories?.name || "Outros";
      const total = Number(item.quantity || 0) * Number(item.unit_price || 0);
      categoriesMap[catName] = (categoriesMap[catName] ?? 0) + total;
      
      const itemName = item.menu_items?.name || item.name || "Item Desconhecido";
      if (!itemsMap[itemName]) {
        itemsMap[itemName] = { name: itemName, qty: 0, revenue: 0 };
      }
      itemsMap[itemName].qty += Number(item.quantity || 0);
      itemsMap[itemName].revenue += total;
    });

    const categoriesChart = Object.entries(categoriesMap).map(([name, value]) => ({ name, value }));
    const topItems = Object.values(itemsMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(item => ({
        ...item,
        percent: currentData.revenue > 0 ? (item.revenue / currentData.revenue) * 100 : 0
      }));

    // Faturamento por turno
    const { data: shiftsRevenue } = await sb
      .from("shift_reports")
      .select("total_revenue, shift_type")
      .gte("opened_at", startISO)
      .lte("opened_at", endISO);

    const shiftTypeMap: Record<string, number> = {};
    (shiftsRevenue ?? []).forEach((s: any) => {
      shiftTypeMap[s.shift_type] = (shiftTypeMap[s.shift_type] ?? 0) + Number(s.total_revenue || 0);
    });
    const shiftsChart = Object.entries(shiftTypeMap).map(([name, value]) => ({ name, value }));

    // Pedidos por hora
    const { data: hourlyOrders } = await sb
      .from("orders")
      .select("created_at")
      .gte("created_at", startISO)
      .lte("created_at", endISO);
    
    const hourlyMap: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourlyMap[i] = 0;
    (hourlyOrders ?? []).forEach((o: any) => {
      const hour = new Date(o.created_at).getHours();
      hourlyMap[hour] = (hourlyMap[hour] ?? 0) + 1;
    });
    const hourlyChart = Object.entries(hourlyMap).map(([hour, count]) => ({ hour: `${hour}h`, count }));

    return {
      overview: {
        revenue: currentData.revenue,
        prevRevenue: previousData.revenue,
        orders: currentData.orders,
        prevOrders: previousData.orders,
        ticketMedia: currentData.orders > 0 ? currentData.revenue / currentData.orders : 0,
        prevTicketMedia: previousData.orders > 0 ? previousData.revenue / previousData.orders : 0,
        mainPayment: currentData.mainPayment,
      },
      charts: {
        revenueTimeline: chartData,
        categories: categoriesChart,
        shifts: shiftsChart,
        hourly: hourlyChart,
      },
      topItems,
      indicators: {
        totalDeliveryFees: currentData.deliveryFees,
        totalDiscounts: 0, // se houver campo de desconto futuramente
      }
    };
  });

async function fetchPeriodStats(start: string, end: string) {
  const { data: orders, error } = await sb
    .from("orders")
    .select("total, delivery_fee, confirmed_payment_method, payment_method")
    .gte("created_at", start)
    .lte("created_at", end)
    .not("payment_confirmed_at", "is", null);

  if (error) throw error;

  let revenue = 0;
  let deliveryFees = 0;
  const paymentMap: Record<string, number> = {};

  (orders ?? []).forEach((o: any) => {
    revenue += Number(o.total || 0);
    deliveryFees += Number(o.delivery_fee || 0);
    const method = o.confirmed_payment_method || o.payment_method || "Outros";
    paymentMap[method] = (paymentMap[method] ?? 0) + 1;
  });

  const mainPayment = Object.entries(paymentMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  return {
    revenue,
    orders: orders?.length || 0,
    deliveryFees,
    mainPayment,
  };
}
