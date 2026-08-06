import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  credito: "Cartao de Credito",
  debito: "Cartao de Debito",
  sodexo: "Vale-refeicao Sodexo",
  alelo: "Vale-refeicao Alelo",
  pix: "Pix (na entrega)",
};

const dateBR = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

/** Envia o relatório de turno por e-mail para os endereços cadastrados nas configurações. */
export const sendShiftReportEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ shiftId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

    const { data: report, error } = await (supabaseAdmin as any)
      .from("shift_reports")
      .select("*")
      .eq("shift_id", data.shiftId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!report) throw new Error("Relatório de turno não encontrado.");

    const { data: settings } = await (supabaseAdmin as any)
      .from("system_settings")
      .select("report_emails")
      .limit(1)
      .maybeSingle();

    const recipients: string[] = (settings?.report_emails ?? []).filter(Boolean);
    if (recipients.length === 0) {
      return { sent: 0, skipped: [] as string[], reason: "no_recipients" as const };
    }

    const templateData = {
      reportDate: dateBR(report.report_date),
      shiftType: report.shift_type,
      operatorName: report.operator_name,
      openedAt: report.opened_at,
      closedAt: report.closed_at,
      openingCash: Number(report.opening_cash ?? 0),
      ordersCount: report.orders_count ?? 0,
      totalRevenue: Number(report.total_revenue ?? 0),
      deliveryFees: Number(report.delivery_fees ?? 0),
      items: report.items_summary ?? [],
      combos: report.combos_summary ?? [],
      motoboys: report.motoboys_summary ?? [],
      payments: Object.entries(report.totals_by_payment ?? {})
        .filter(([, v]) => Number(v) > 0)
        .map(([k, v]) => ({ label: PAYMENT_LABELS[k] ?? k, value: Number(v) })),
    };

    console.log(`[Email] Enviando relatório de turno ${report.id} para ${recipients.length} destinatários`);

    let sent = 0;
    const skipped: string[] = [];
    for (const to of recipients) {
      try {
        const result = await sendTemplateEmail("shift-report", to, {
          templateData,
          idempotencyKey: `shift-report-${report.id}-${to}-${Date.now()}`,
        });
        if (result.sent) {
          sent += 1;
        } else {
          console.warn(`[Email] Destinatário suprimido: ${to}`);
          skipped.push(to);
        }
      } catch (err) {
        console.error(`[Email] Erro ao enviar para ${to}:`, err);
        skipped.push(to);
      }
    }

    console.log(`[Email] Concluído: ${sent} enviados, ${skipped.length} falhas/supressões`);

    await (supabaseAdmin as any)
      .from("shift_reports")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", report.id);

    return { sent, skipped, reason: null };
  });
