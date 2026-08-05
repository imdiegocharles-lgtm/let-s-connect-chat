import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  buildDailyReportBytes,
  buildShiftReportBytes,
  sendBytesToPrinter,
  money,
  PAYMENT_LABELS,
} from "@/lib/report";
import {
  getDailyReport,
  getShiftReports,
  markPrinted,
  todayISO,
  type ComboLine,
  type ItemLine,
  type MotoboyLine,
} from "@/lib/reports-service";
import { sendDailyReportEmail } from "@/lib/daily-report-email.functions";

const hhmm = (v?: string | null) =>
  v ? new Date(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";

const shiftLabel = (t: string) => (t === "almoco" ? "Almoço / Dia" : "Churrasco / Noite");

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 text-sm ${strong ? "font-bold" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <h4 className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function PaymentsBlock({ totals }: { totals: Record<string, number> | null | undefined }) {
  const entries = Object.entries(totals ?? {});
  if (!entries.length) return null;
  return (
    <Block title="Formas de pagamento">
      {entries.map(([k, v]) => (
        <Row key={k} label={PAYMENT_LABELS[k] ?? k} value={money(Number(v))} />
      ))}
    </Block>
  );
}

function ItemsBlock({ items }: { items: ItemLine[] | null | undefined }) {
  const list = items ?? [];
  if (!list.length) return null;
  const groups = [...new Set(list.map((i) => i.group))];
  return (
    <Block title="Itens vendidos">
      {groups.map((g) => (
        <div key={g} className="mb-2">
          <p className="text-xs font-bold">{g}</p>
          {list
            .filter((i) => i.group === g)
            .map((i) => (
              <Row key={`${g}-${i.name}`} label={i.name} value={`${i.quantity}x`} />
            ))}
        </div>
      ))}
    </Block>
  );
}

function CombosBlock({ combos }: { combos: ComboLine[] | null | undefined }) {
  const list = combos ?? [];
  if (!list.length) return null;
  return (
    <Block title="Espetos inclusos nos completos">
      {list.map((c) => (
        <div key={c.combo} className="mb-2">
          <Row label={c.combo} value={`${c.total}x`} strong />
          {(c.skewers ?? []).map((s) => (
            <Row key={s.name} label={`• ${s.name}`} value={`${s.quantity}x`} />
          ))}
        </div>
      ))}
    </Block>
  );
}

function MotoboysBlock({
  motoboys,
  revenue,
}: {
  motoboys: MotoboyLine[] | null | undefined;
  revenue: number;
}) {
  const list = motoboys ?? [];
  if (!list.length) return null;
  const total = list.reduce((s, m) => s + Number(m.daily_rate ?? 0), 0);
  return (
    <Block title="Motoboys">
      {list.map((m) => (
        <Row
          key={m.name}
          label={`${m.name} — ${m.deliveries} corrida(s)`}
          value={money(Number(m.daily_rate ?? 0))}
        />
      ))}
      <Row label="Total diárias" value={money(total)} strong />
      <Row label="Líquido (faturado − diárias)" value={money(revenue - total)} strong />
    </Block>
  );
}

export function ReportsViewer() {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const [agentUrl] = useState(
    () =>
      (typeof window !== "undefined" && localStorage.getItem("familia-amaral-printer-url")) ||
      "http://localhost:8080/print",
  );
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const { data: shiftReports = [], isLoading } = useQuery({
    queryKey: ["shift-reports", date],
    queryFn: () => getShiftReports(date),
  });
  const { data: daily } = useQuery({
    queryKey: ["daily-report", date],
    queryFn: () => getDailyReport(date),
  });

  const printShift = async (r: any) => {
    try {
      await sendBytesToPrinter(agentUrl, buildShiftReportBytes(r));
      await markPrinted("shift_reports", r.id);
      qc.invalidateQueries({ queryKey: ["shift-reports", date] });
      toast.success("Relatório de turno enviado para a impressora");
    } catch (e: any) {
      toast.error(`Falha ao imprimir: ${e.message}`);
    }
  };

  const printDaily = async () => {
    if (!daily) return;
    try {
      await sendBytesToPrinter(agentUrl, buildDailyReportBytes(daily as any));
      await markPrinted("daily_reports", (daily as any).id);
      qc.invalidateQueries({ queryKey: ["daily-report", date] });
      toast.success("Relatório do dia enviado para a impressora");
    } catch (e: any) {
      toast.error(`Falha ao imprimir: ${e.message}`);
    }
  };

  const emailDaily = useMutation({
    mutationFn: async () => (await sendDailyReportEmail({ data: { date } })) as any,
    onSuccess: (res: any) => {
      if (res?.reason === "no_recipients")
        toast.info("Cadastre e-mails em Admin → Configurações para receber o relatório.");
      else toast.success(`Relatório enviado por e-mail (${res?.sent ?? 0}).`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div>
          <Label htmlFor="report-date">Data do relatório</Label>
          <Input
            id="report-date"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="w-48"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Consulte qualquer dia já fechado com todos os detalhes.
        </p>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-bold">Relatórios de turno</h2>
            <div className="space-y-4">
              {shiftReports.map((r: any) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{shiftLabel(r.shift_type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {hhmm(r.opened_at)} às {hhmm(r.closed_at)} · {r.operator_name ?? "—"}
                      </p>
                    </div>
                    <p className="text-lg font-black text-primary">{money(Number(r.total_revenue))}</p>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Row label="Pedidos pagos" value={String(r.orders_count)} />
                    <Row label="Caixa inicial" value={money(Number(r.opening_cash))} />
                    <Row label="Taxas de entrega" value={money(Number(r.delivery_fees))} />
                  </div>
                  {open[r.id] && (
                    <>
                      <PaymentsBlock totals={r.totals_by_payment} />
                      <ItemsBlock items={r.items_summary} />
                      <CombosBlock combos={r.combos_summary} />
                      <MotoboysBlock
                        motoboys={r.motoboys_summary}
                        revenue={Number(r.total_revenue)}
                      />
                    </>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}
                    >
                      {open[r.id] ? "Ocultar detalhes" : "Ver detalhes"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => printShift(r)}>
                      <Printer className="mr-2 h-4 w-4" /> Reimprimir
                    </Button>
                  </div>
                </Card>
              ))}
              {shiftReports.length === 0 && (
                <Card className="p-8 text-center text-muted-foreground">
                  Nenhum turno finalizado nesta data.
                </Card>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold">Relatório do dia</h2>
            <Card className="p-4">
              {daily ? (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold">Consolidado</p>
                      <p className="text-xs text-muted-foreground">
                        {(daily as any).shifts_count} turnos · {(daily as any).orders_count} pedidos
                      </p>
                    </div>
                    <p className="text-xl font-black text-primary">
                      {money(Number((daily as any).total_revenue))}
                    </p>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Row label="Taxas de entrega" value={money(Number((daily as any).delivery_fees))} />
                  </div>
                  <PaymentsBlock totals={(daily as any).totals_by_payment} />
                  <Block title="Turnos">
                    {((daily as any).shifts_summary ?? []).map((s: any, i: number) => (
                      <div key={i} className="mb-2">
                        <Row
                          label={`${shiftLabel(s.shift_type)} — ${s.operator_name ?? "—"}`}
                          value={money(Number(s.total_revenue))}
                          strong
                        />
                        <Row
                          label={`${hhmm(s.opened_at)} às ${hhmm(s.closed_at)}`}
                          value={`${s.orders_count} pedidos`}
                        />
                      </div>
                    ))}
                  </Block>
                  <ItemsBlock items={(daily as any).items_summary} />
                  <CombosBlock combos={(daily as any).combos_summary} />
                  <MotoboysBlock
                    motoboys={(daily as any).motoboys_summary}
                    revenue={Number((daily as any).total_revenue)}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={printDaily}>
                      <Printer className="mr-2 h-4 w-4" /> Reimprimir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={emailDaily.isPending}
                      onClick={() => emailDaily.mutate()}
                    >
                      {emailDaily.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Reenviar por e-mail
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum relatório do dia gerado nesta data. Ele é gerado no Painel Operacional após os
                  dois turnos serem finalizados.
                </p>
              )}
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}