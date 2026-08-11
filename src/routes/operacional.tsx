import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles, hasMyRole } from "@/lib/roles";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, LogOut, Printer, Volume2, VolumeX, Play, Square, CheckCircle2, Info, Trash2 } from "lucide-react";
import { sendToLocalPrinter } from "@/lib/receipt";
import {
  buildDailyReportBytes,
  buildShiftReportBytes,
  sendBytesToPrinter,
  money,
  PAYMENT_LABELS as REPORT_PAYMENT_LABELS,
} from "@/lib/report";
import {
  createDailyReport,
  createShiftReport,
  getDailyReport,
  getShiftReports,
  markPrinted,
  todayISO,
} from "@/lib/reports-service";
import { sendDailyReportEmail } from "@/lib/daily-report-email.functions";
import { sendShiftReportEmail } from "@/lib/shift-report-email.functions";
import { deleteOrder } from "@/lib/orders-admin.functions";

import { MotoboysPanel } from "@/components/operacional/MotoboysPanel";
import { playBeep } from "@/lib/sound";
import type { Tables } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";




type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;
type Shift = {
  id: string;
  shift_type: string;
  operator_id: string | null;
  operator_name: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
};

const STATUS_FLOW: Order["status"][] = ["received", "preparing", "ready", "delivered"];
const STATUS_LABELS: Record<string, string> = {
  received: "Recebido",
  preparing: "Em preparo",
  ready: "Pronto",
  delivered: "Entregue",
};
const STATUS_COLORS: Record<string, string> = {
  received: "bg-yellow-500 hover:bg-yellow-600",
  preparing: "bg-blue-500 hover:bg-blue-600",
  ready: "bg-green-500 hover:bg-green-600",
  delivered: "bg-muted text-muted-foreground",
};
const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  credito: "Cartão de Crédito",
  debito: "Cartão de Débito",
  sodexo: "Vale-refeição Sodexo",
  alelo: "Vale-refeição Alelo",
  pix: "Pix (na entrega)",
};

export const Route = createFileRoute("/operacional")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel Operacional — Família Amaral" },
      { name: "description", content: "Tela de cozinha com pedidos em tempo real e impressão de cupons." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: KitchenPage,
  errorComponent: OperacionalError,
  notFoundComponent: () => <OperacionalError />,
});

function OperacionalError({ error, reset }: { error?: Error; reset?: () => void }) {
  if (error) console.error(error);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="p-8 max-w-md text-center">
        <h2 className="text-xl font-bold">Não foi possível carregar o painel</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Houve uma falha temporária. Tente novamente — seus dados de turno e pedidos estão salvos.
        </p>
        {error?.message && (
          <p className="mt-2 text-xs text-muted-foreground break-words">{error.message}</p>
        )}
        <div className="mt-4 flex justify-center gap-2">
          <Button
            onClick={() => {
              reset?.();
              if (typeof window !== "undefined") window.location.reload();
            }}
          >
            Tentar novamente
          </Button>
          <Button variant="outline" onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }}>
            Ir para o site
          </Button>
        </div>
      </Card>
    </div>
  );
}

function KitchenPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "unauth" | "denied">("loading");

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return setStatus("unauth");
        const roles = await getMyRoles();
        setStatus(roles.includes("admin") || roles.includes("operator") ? "ok" : "denied");
      } catch (e) {
        console.error(e);
        setStatus("denied");
      }
    })();
  }, []);

  useEffect(() => {
    if (status === "unauth") navigate({ to: "/auth" });
  }, [status, navigate]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (status === "unauth") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-bold">Acesso negado</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sua conta não tem permissão para o painel operacional.</p>
          <Button className="mt-4" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>
            Sair
          </Button>
        </Card>
      </div>
    );
  }

  return <KitchenDashboard />;
}

function KitchenDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [agentUrl, setAgentUrl] = useState("http://localhost:8080/print");
  const [autoPrint, setAutoPrint] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [confirmPayFor, setConfirmPayFor] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [lastMotoboyId, setLastMotoboyId] = useState<string | null>(null);
  const sendShiftEmail = useServerFn(sendShiftReportEmail);
  const deleteOrderFn = useServerFn(deleteOrder);


  const { data: perms } = useQuery({
    queryKey: ["my-kitchen-perms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      // Admins get all permissions by default
      const isAdmin = await hasMyRole("admin");
      if (isAdmin) {
        return {
          can_open_close_shift: true,
          can_confirm_payment: true,
          can_manage_menu: true,
          can_update_order_status: true,
        };
      }
      const { data } = await (supabase as any)
        .from("kitchen_permissions")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      return (
        data ?? {
          can_open_close_shift: true,
          can_confirm_payment: true,
          can_manage_menu: true,
          can_update_order_status: true,
        }
      );
    },
  });
  const p = perms ?? {
    can_open_close_shift: false,
    can_confirm_payment: false,
    can_manage_menu: false,
    can_update_order_status: false,
  };

  useEffect(() => {
    const saved = localStorage.getItem("familia-amaral-printer-url");
    if (saved) setAgentUrl(saved);
    setAutoPrint(localStorage.getItem("familia-amaral-auto-print") === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("familia-amaral-printer-url", agentUrl);
  }, [agentUrl]);

  useEffect(() => {
    localStorage.setItem("familia-amaral-auto-print", String(autoPrint));
  }, [autoPrint]);

  const { data: activeShift, refetch: refetchShift } = useQuery({
    queryKey: ["active-shift"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shifts")
        .select("*")
        .is("closed_at", null)
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Shift | null;
    },
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["kitchen-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as (Order & { order_items: OrderItem[] })[];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["system_settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Order["status"] }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["kitchen-orders"] });
      const previous = qc.getQueryData(["kitchen-orders"]);
      qc.setQueryData(["kitchen-orders"], (old: (Order & { order_items: OrderItem[] })[] = []) =>
        old.map((o) => (o.id === id ? { ...o, status } : o)),
      );
      return { previous };
    },
    onError: (e: any, _vars, ctx: any) => {
      if (ctx?.previous) qc.setQueryData(["kitchen-orders"], ctx.previous);
      toast.error(e.message);
    },
    onSuccess: (_data, { id, status }) => {
      if (status === "delivered") {
        const list = (qc.getQueryData(["kitchen-orders"]) ?? []) as (Order & {
          order_items: OrderItem[];
        })[];
        const target = list.find((o) => o.id === id);
        if (target && !(target as any).payment_confirmed_at && p.can_confirm_payment) {
          setConfirmPayFor({ ...target, status: "delivered" });
        }
      }
      qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });

  const confirmPayment = useMutation({
    mutationFn: async ({ id, method, motoboyId }: { id: string; method: string; motoboyId?: string | null }) => {
      const { error } = await (supabase as any)
        .from("orders")
        .update({
          confirmed_payment_method: method,
          payment_confirmed_at: new Date().toISOString(),
          motoboy_id: motoboyId ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
      qc.invalidateQueries({ queryKey: ["shift-motoboy-deliveries"] });
      setConfirmPayFor(null);
      toast.success("Pagamento confirmado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const printOne = async (order: Order & { order_items: OrderItem[] }) => {
    try {
      await sendToLocalPrinter(agentUrl, order, order.order_items, settings);
      toast.success(`Cupom #${order.order_number} enviado para impressora`);
    } catch (e: any) {
      toast.error(`Não foi possível imprimir: ${e.message}`);
    }
  };

  const testPrinter = async () => {
    const testOrder: Order = {
      id: "test",
      order_number: 0,
      customer_name: "Teste de impressão",
      customer_phone: "(21) 99999-9999",
      customer_address: "Rua de Teste, 123",
      customer_street: "Rua de Teste",
      customer_number: "123",
      delivery_type: "delivery",
      neighborhood: "Centro",
      payment_method: "dinheiro",
      change_for: 100,
      notes: "Sem cebola, ponto da carne bem passado",
      status: "received",
      subtotal: 89.9,
      delivery_fee: 5,
      total: 94.9,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      shift_id: null,
      confirmed_payment_method: null,
      payment_confirmed_at: null,
      motoboy_id: null,
      user_id: null,
      deleted_at: null,
      deletion_reason: null,
    };
    const testItems: OrderItem[] = [
      { id: "1", order_id: "test", menu_item_id: "1", name: "Espeto de Carne", price: 12.9, quantity: 3, extras: null, created_at: "" },
      { id: "2", order_id: "test", menu_item_id: "2", name: "Batata Completa", price: 35, quantity: 1, extras: null, created_at: "" },
    ];
    try {
      await sendToLocalPrinter(agentUrl, testOrder, testItems, settings);
      toast.success("Teste enviado para a impressora");
    } catch (e: any) {
      toast.error(`Falha no teste: ${e.message}`);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          const newOrder = payload.new as Order;
          const { data: items } = await supabase.from("order_items").select("*").eq("order_id", newOrder.id);
          const fullOrder = { ...newOrder, order_items: items ?? [] } as Order & { order_items: OrderItem[] };

          qc.setQueryData(["kitchen-orders"], (old: (Order & { order_items: OrderItem[] })[] = []) => {
            if (old.some((o) => o.id === fullOrder.id)) return old;
            return [fullOrder, ...old];
          });

          if (soundOn) {
            playBeep();
          }

          if (autoPrint) {
            await printOne(fullOrder);
          } else {
            toast.info(`Novo pedido #${fullOrder.order_number} recebido!`);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as Order;
          qc.setQueryData(["kitchen-orders"], (old: (Order & { order_items: OrderItem[] })[] = []) =>
            old.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, autoPrint, soundOn, agentUrl]);

  const activeOrders = useMemo(() => orders.filter((o) => o.status !== "delivered"), [orders]);
  const doneOrders = useMemo(() => orders.filter((o) => o.status === "delivered"), [orders]);

  // Faturamento (só pagamentos confirmados) — do turno ativo
  const shiftOrders = useMemo(
    () => (activeShift ? orders.filter((o: any) => o.shift_id === activeShift.id) : []),
    [orders, activeShift],
  );
  const shiftRevenue = useMemo(
    () =>
      shiftOrders
        .filter((o: any) => o.payment_confirmed_at)
        .reduce((s, o) => s + Number(o.total), 0),
    [shiftOrders],
  );
  const awaitingPayment = useMemo(
    () =>
      shiftOrders.filter(
        (o: any) => o.status === "delivered" && !o.payment_confirmed_at,
      ),
    [shiftOrders],
  );
  const pendingActive = useMemo(
    () => shiftOrders.filter((o) => o.status !== "delivered"),
    [shiftOrders],
  );
  const canCloseShift = pendingActive.length === 0 && awaitingPayment.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-bold">Painel Operacional — Pedidos</h1>
            {activeShift ? (
              <Badge className="bg-green-600 hover:bg-green-600">
                Turno {activeShift.shift_type === "almoco" ? "Almoço" : "Noite"} aberto
              </Badge>
            ) : (
              <Badge variant="destructive">Nenhum turno aberto</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="agentUrl" className="text-xs whitespace-nowrap">Impressora (agente)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Configuração de Impressão</h4>
                      <p className="text-sm text-muted-foreground">
                        Para imprimir diretamente na Elgin i9, você precisa de um "Agente de Impressão" rodando no seu computador.
                      </p>
                      <ul className="text-xs space-y-1 list-disc pl-4">
                        <li>O site envia os dados (ESC/POS) para o endereço ao lado.</li>
                        <li>O agente recebe esses dados e os repassa para a impressora USB/Rede.</li>
                        <li>O endereço padrão é <strong>http://localhost:8080/print</strong>.</li>
                        <li>Certifique-se de que o driver da Elgin está instalado no Windows/Linux.</li>
                      </ul>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Input
                id="agentUrl"
                value={agentUrl}
                onChange={(e) => setAgentUrl(e.target.value)}
                className="h-8 w-48 sm:w-64 text-xs"
                placeholder="http://localhost:8080/print"
              />
              <Button size="sm" variant="outline" onClick={testPrinter}>Testar</Button>
            </div>
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <Switch id="autoPrint" checked={autoPrint} onCheckedChange={setAutoPrint} />
              <Label htmlFor="autoPrint" className="text-xs">Imprimir auto</Label>
            </div>
            <Button size="icon" variant="outline" onClick={() => setSoundOn((v) => !v)} aria-label={soundOn ? "Som ligado" : "Som desligado"}>
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            {p.can_open_close_shift && activeShift ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCloseShiftModal(true)}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Square className="h-4 w-4 mr-2" /> Fechar turno
              </Button>
            ) : p.can_open_close_shift ? (
              <Button size="sm" onClick={() => setOpenShiftModal(true)}>
                <Play className="h-4 w-4 mr-2" /> Abrir turno
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
        {activeShift && (
          <div className="mx-auto max-w-7xl px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <StatChip label="Operador" value={activeShift.operator_name ?? "—"} />
            <StatChip
              label="Aberto às"
              value={new Date(activeShift.opened_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            />
            <StatChip
              label="Caixa inicial"
              value={Number(activeShift.opening_cash).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            />
            <StatChip
              label="Faturado (confirmado)"
              value={shiftRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              highlight
            />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Pedidos</TabsTrigger>
              <TabsTrigger value="motoboys">Motoboys</TabsTrigger>
              <TabsTrigger value="reports">Relatórios</TabsTrigger>
              {p.can_manage_menu && <TabsTrigger value="menu">Cardápio</TabsTrigger>}
            </TabsList>
            <TabsContent value="orders" className="mt-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <section>
                  <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                    Pedidos ativos
                    <Badge variant="secondary">{activeOrders.length}</Badge>
                  </h2>
                  <div className="space-y-4">
                    {activeOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatus={(s) => updateStatus.mutate({ id: order.id, status: s })}
                        onPrint={() => printOne(order)}
                        onConfirmPayment={() => setConfirmPayFor(order)}
                        isPending={updateStatus.isPending}
                        canUpdateStatus={p.can_update_order_status}
                        canConfirmPayment={p.can_confirm_payment}
                      />
                    ))}
                    {activeOrders.length === 0 && (
                      <Card className="p-8 text-center text-muted-foreground">
                        Nenhum pedido ativo no momento.
                      </Card>
                    )}
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                    Entregues
                    <Badge variant="secondary">{doneOrders.length}</Badge>
                    {awaitingPayment.length > 0 && (
                      <Badge className="bg-amber-500 hover:bg-amber-500">
                        {awaitingPayment.length} aguardando pagamento
                      </Badge>
                    )}
                  </h2>
                  <div className="space-y-4">
                    {doneOrders.slice(0, 20).map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatus={(s) => updateStatus.mutate({ id: order.id, status: s })}
                        onPrint={() => printOne(order)}
                        onConfirmPayment={() => setConfirmPayFor(order)}
                        isPending={updateStatus.isPending}
                        compact
                        canUpdateStatus={p.can_update_order_status}
                        canConfirmPayment={p.can_confirm_payment}
                      />
                    ))}
                    {doneOrders.length === 0 && (
                      <Card className="p-8 text-center text-muted-foreground">
                        Nenhum pedido entregue ainda.
                      </Card>
                    )}
                  </div>
                </section>
              </div>
            </TabsContent>
            <TabsContent value="motoboys" className="mt-4">
              <MotoboysPanel activeShiftId={activeShift?.id ?? null} />
            </TabsContent>
            <TabsContent value="reports" className="mt-4">
              <ReportsPanel agentUrl={agentUrl} />
            </TabsContent>
            {p.can_manage_menu && (
              <TabsContent value="menu" className="mt-4">
                <MenuAvailabilityPanel />
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>

      <OpenShiftDialog
        open={openShiftModal}
        onClose={() => setOpenShiftModal(false)}
        onOpened={() => {
          setOpenShiftModal(false);
          refetchShift();
        }}
      />
      <CloseShiftDialog
        open={closeShiftModal}
        shift={activeShift ?? null}
        canClose={canCloseShift}
        pendingActive={pendingActive.length}
        awaitingPayment={awaitingPayment.length}
        agentUrl={agentUrl}
        onClose={() => setCloseShiftModal(false)}
        sendShiftEmail={sendShiftEmail}

        onClosed={() => {
          setCloseShiftModal(false);
          refetchShift();
          qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
          qc.invalidateQueries({ queryKey: ["shift-reports"] });
          qc.invalidateQueries({ queryKey: ["daily-report"] });
        }}
      />
      <ConfirmPaymentDialog
        order={confirmPayFor}
        shiftId={activeShift?.id ?? null}
        lastMotoboyId={lastMotoboyId}
        onClose={() => setConfirmPayFor(null)}
        onConfirm={(method, motoboyId) => {
          if (!confirmPayFor) return;
          setLastMotoboyId(motoboyId);
          confirmPayment.mutate({ id: confirmPayFor.id, method, motoboyId });
        }}
        isPending={confirmPayment.isPending}
      />
    </div>
  );
}

function OrderCard({
  order,
  onStatus,
  onPrint,
  onConfirmPayment,
  isPending,
  compact,
  canUpdateStatus = true,
  canConfirmPayment = true,
}: {
  order: Order & { order_items: OrderItem[] };
  onStatus: (status: Order["status"]) => void;
  onPrint: () => void;
  onConfirmPayment: () => void;
  isPending: boolean;
  compact?: boolean;
  canUpdateStatus?: boolean;
  canConfirmPayment?: boolean;
}) {
  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const nextStatus = STATUS_FLOW[currentIndex + 1];
  const anyOrder = order as any;
  const needsPayConfirm =
    order.status === "delivered" && !anyOrder.payment_confirmed_at;
  const payConfirmed = !!anyOrder.payment_confirmed_at;

  return (
    <Card className={`p-4 ${compact ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black">#{String(order.order_number).padStart(4, "0")}</h3>
            <Badge className={STATUS_COLORS[order.status] ?? "bg-muted"}>{STATUS_LABELS[order.status]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-primary">{order.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
        </div>
      </div>

      <div className="space-y-1 text-sm mb-3">
        <p><span className="font-semibold">Cliente:</span> {order.customer_name}</p>
        <p><span className="font-semibold">Telefone:</span> {order.customer_phone}</p>
        {order.delivery_type === "delivery" ? (
          <>
        <p><span className="font-semibold">Endereço:</span> {order.customer_street ? `${order.customer_street}, ${order.customer_number}` : order.customer_address}</p>
            <p><span className="font-semibold">Bairro:</span> {order.neighborhood}</p>
          </>
        ) : (
          <p><span className="font-semibold">Entrega:</span> Retirada no local</p>
        )}
        <p><span className="font-semibold">Pagamento:</span> {PAYMENT_LABELS[order.payment_method ?? ""] ?? order.payment_method}</p>
        {order.change_for ? <p><span className="font-semibold">Troco para:</span> R$ {order.change_for.toFixed(2).replace(".", ",")}</p> : null}
      </div>

      <div className="border-t pt-3 mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Itens</p>
        <ul className="space-y-1 text-sm">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>{item.quantity}x {item.name}</span>
              <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between text-sm mt-2 pt-2 border-t">
          <span>Subtotal</span>
          <span>R$ {order.subtotal.toFixed(2).replace(".", ",")}</span>
        </div>
        {order.delivery_type === "delivery" && (
          <div className="flex justify-between text-sm">
            <span>Entrega</span>
            <span>R$ {order.delivery_fee.toFixed(2).replace(".", ",")}</span>
          </div>
        )}
      </div>

      {order.notes && (
        <div className="bg-muted rounded-md p-2 text-sm mb-3">
          <span className="font-semibold">Obs:</span> {order.notes}
        </div>
      )}

      {needsPayConfirm && (
        <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
          Aguardando confirmação de pagamento (motoboy retornou?).
        </div>
      )}
      {payConfirmed && (
        <div className="mb-3 rounded-md border border-green-500/40 bg-green-500/10 p-2 text-xs">
          Pagamento confirmado: {PAYMENT_LABELS[anyOrder.confirmed_payment_method] ?? anyOrder.confirmed_payment_method}
        </div>
      )}

      {canUpdateStatus && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Etapa do pedido
          </p>
          <div className="flex items-stretch gap-1">
            {STATUS_FLOW.map((s, i) => {
              const done = i <= currentIndex;
              const clickable = i > currentIndex;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!clickable || isPending}
                  onClick={() => clickable && onStatus(s)}
                  className={`flex-1 rounded-md border px-1 py-1.5 text-[11px] font-semibold leading-tight transition-colors ${
                    done
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  } ${clickable ? "cursor-pointer" : "cursor-default"}`}
                >
                  {STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Toque em qualquer etapa à frente para avançar direto.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onPrint}
          className="border-primary/50 hover:bg-primary/10 font-bold"
        >
          <Printer className="h-4 w-4 mr-2" /> REIMPRIMIR
        </Button>
        {nextStatus && canUpdateStatus && (
          <Button
            size="sm"
            onClick={() => onStatus(nextStatus)}
            disabled={isPending}
            className={`font-black uppercase tracking-tight ${STATUS_COLORS[nextStatus] ?? ""}`}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {STATUS_LABELS[nextStatus]}
          </Button>
        )}
        {needsPayConfirm && canConfirmPayment && (
          <Button size="sm" onClick={onConfirmPayment} className="bg-amber-600 hover:bg-amber-700 font-black uppercase">
            <CheckCircle2 className="h-4 w-4 mr-2" /> CONFIRMAR PAGAMENTO
          </Button>
        )}
      </div>
    </Card>
  );
}

function StatChip({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        highlight ? "border-primary/50 bg-primary/10" : "border-border bg-muted/40"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function OpenShiftDialog({
  open,
  onClose,
  onOpened,
}: {
  open: boolean;
  onClose: () => void;
  onOpened: () => void;
}) {
  const [type, setType] = useState<"almoco" | "noite">("almoco");
  const [cash, setCash] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const hour = new Date().getHours();
    setType(hour >= 11 && hour < 16 ? "almoco" : "noite");
    setCash("");
    (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? "";
      setOperatorName(email.split("@")[0] ?? "Operador");
    })();
  }, [open]);

  const submit = async () => {
    const cashNum = Number(cash.replace(",", "."));
    if (Number.isNaN(cashNum) || cashNum < 0) {
      toast.error("Informe um valor de caixa válido");
      return;
    }
    if (!operatorName.trim()) {
      toast.error("Informe o nome do operador");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    // Evita dois turnos abertos ao mesmo tempo (clique duplo / aba aberta em outro lugar)
    const { data: existing } = await (supabase as any)
      .from("shifts")
      .select("id, shift_type")
      .is("closed_at", null)
      .limit(1)
      .maybeSingle();
    if (existing) {
      setSaving(false);
      toast.error(
        `Já existe um turno aberto (${existing.shift_type === "almoco" ? "Almoço" : "Noite"}). Feche-o antes de abrir outro.`,
      );
      onOpened();
      return;
    }
    const { error } = await (supabase as any).from("shifts").insert({
      shift_type: type,
      opening_cash: cashNum,
      operator_id: userData.user?.id,
      operator_name: operatorName.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Turno aberto");
    onOpened();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir turno</DialogTitle>
          <DialogDescription>
            Registre o operador, o tipo do turno e o valor inicial do caixa.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Operador</Label>
            <Input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Tipo de turno</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="almoco">Almoço</SelectItem>
                <SelectItem value="noite">Noite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Caixa inicial (R$)</Label>
            <Input
              inputMode="decimal"
              placeholder="0,00"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Abrir turno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseShiftDialog({
  open,
  shift,
  canClose,
  pendingActive,
  awaitingPayment,
  agentUrl,
  onClose,
  onClosed,
  sendShiftEmail,
}: {
  open: boolean;
  shift: Shift | null;
  canClose: boolean;
  pendingActive: number;
  awaitingPayment: number;
  agentUrl: string;
  onClose: () => void;
  onClosed: () => void;
  sendShiftEmail: (input: { data: { shiftId: string } }) => Promise<any>;
}) {

  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!shift) return;
    setSaving(true);
    const closedAt = new Date().toISOString();
    const { error } = await (supabase as any)
      .from("shifts")
      .update({ closed_at: closedAt })
      .eq("id", shift.id);
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    // Gera e imprime automaticamente o relatório do turno
    try {
      const report: any = await createShiftReport({ ...shift, closed_at: closedAt });
      try {
        await sendBytesToPrinter(agentUrl, buildShiftReportBytes(report));
        await markPrinted("shift_reports", report.id);
        toast.success("Turno fechado — relatório enviado para a impressora");
      } catch (e: any) {
        toast.warning(
          `Turno fechado. Relatório salvo, mas a impressão falhou: ${e.message}. Reimprima na aba Relatórios.`,
        );
      }
    } catch (e: any) {
      toast.warning(`Turno fechado, mas não foi possível gerar o relatório: ${e.message}`);
    }

    // Envia e-mail automático
    try {
      const res: any = await sendShiftEmail({ data: { shiftId: shift.id } });
      if (res?.reason === "no_recipients") {
        console.log("Nenhum e-mail configurado para relatórios.");
      } else if (res?.sent > 0) {
        toast.success(`Relatório de turno enviado por e-mail (${res.sent}).`);
      }
    } catch (e: any) {
      console.error("Erro ao enviar e-mail de turno:", e);
    }

    setSaving(false);

    onClosed();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fechar turno</DialogTitle>
          <DialogDescription>
            {canClose
              ? "Todos os pedidos foram entregues e pagos. Confirma o fechamento?"
              : "Não é possível fechar o turno com pendências."}
          </DialogDescription>
        </DialogHeader>
        {!canClose && (
          <ul className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm space-y-1">
            {pendingActive > 0 && (
              <li>• {pendingActive} pedido(s) ainda em andamento (não entregues).</li>
            )}
            {awaitingPayment > 0 && (
              <li>• {awaitingPayment} pedido(s) entregues aguardando confirmação de pagamento.</li>
            )}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!canClose || saving} variant="destructive">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Fechar turno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmPaymentDialog({
  order,
  shiftId,
  lastMotoboyId,
  onClose,
  onConfirm,
  isPending,
}: {
  order: Order | null;
  shiftId: string | null;
  lastMotoboyId?: string | null;
  onClose: () => void;
  onConfirm: (method: string, motoboyId: string | null) => void;
  isPending: boolean;
}) {
  const [method, setMethod] = useState<string>("dinheiro");
  const [motoboyId, setMotoboyId] = useState<string>("none");
  useEffect(() => {
    if (order) setMethod(order.payment_method ?? "dinheiro");
    if (order)
      setMotoboyId(((order as any).motoboy_id as string) ?? lastMotoboyId ?? "none");
  }, [order, lastMotoboyId]);

  const { data: shiftMotoboys } = useQuery({
    queryKey: ["shift-motoboys", shiftId],
    enabled: !!shiftId && !!order,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shift_motoboys")
        .select("motoboy_id, motoboys(name)")
        .eq("shift_id", shiftId);
      if (error) throw error;
      return (data ?? []) as { motoboy_id: string; motoboys: { name: string } | null }[];
    },
  });

  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar pagamento</DialogTitle>
          <DialogDescription>
            Registre a forma real recebida pelo motoboy. Só entra no faturamento após confirmar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Forma de pagamento recebida</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Motoboy da entrega</Label>
            <Select value={motoboyId} onValueChange={setMotoboyId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informar</SelectItem>
                {(shiftMotoboys ?? []).map((m) => (
                  <SelectItem key={m.motoboy_id} value={m.motoboy_id}>
                    {m.motoboys?.name ?? "Motoboy"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(shiftMotoboys ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum motoboy escalado no turno — cadastre na aba Motoboys.
              </p>
            )}
          </div>
          {order && (
            <p className="text-sm text-muted-foreground">
              Total do pedido:{" "}
              <strong>
                {Number(order.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </strong>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(method, motoboyId === "none" ? null : motoboyId)}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MenuAvailabilityPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["op-menu"],
    queryFn: async () => {
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from("menu_categories").select("id, name, sort_order").order("sort_order"),
        supabase
          .from("menu_items")
          .select("id, category_id, name, is_available, price, sort_order")
          .order("price", { ascending: true })
          .order("name", { ascending: true }),
      ]);
      return { cats: cats ?? [], items: items ?? [] };
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-menu"] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const filteredItems = q
    ? data.items.filter((i: any) => i.name.toLowerCase().includes(q))
    : data.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Input
          placeholder="Buscar produto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          Desligue para marcar como indisponível (some do cardápio do cliente).
        </p>
      </div>
      {data.cats.map((cat: any) => {
        const catItems = filteredItems.filter((i: any) => i.category_id === cat.id);
        if (!catItems.length) return null;
        return (
          <section key={cat.id}>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {cat.name}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {catItems.map((item: any) => (
                <Card key={item.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(item.price).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        item.is_available ? "text-green-600" : "text-muted-foreground"
                      }`}
                    >
                      {item.is_available ? "Disponível" : "Indisponível"}
                    </span>
                    <Switch
                      checked={item.is_available}
                      onCheckedChange={(v) => toggle.mutate({ id: item.id, value: v })}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ReportsPanel({ agentUrl }: { agentUrl: string }) {
  const qc = useQueryClient();
  // Se for logo após a meia-noite (até as 06:00), padrão é ver o dia anterior
  const [date, setDate] = useState(() => {
    const now = new Date();
    if (now.getHours() < 6) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split("T")[0];
    }
    return todayISO();
  });

  const { data: shiftReports = [], isLoading } = useQuery({
    queryKey: ["shift-reports", date],
    queryFn: () => getShiftReports(date),
  });
  const { data: daily } = useQuery({
    queryKey: ["daily-report", date],
    queryFn: () => getDailyReport(date),
  });

  const types = new Set(shiftReports.map((r: any) => r.shift_type));
  const bothClosed = types.has("almoco") && types.has("noite");

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

  const generateDaily = useMutation({
    mutationFn: async () => {
      const report: any = await createDailyReport(date);
      try {
        await sendBytesToPrinter(agentUrl, buildDailyReportBytes(report));
        await markPrinted("daily_reports", report.id);
      } catch (e: any) {
        toast.warning(`Relatório do dia gerado, mas a impressão falhou: ${e.message}`);
      }
      try {
        const res: any = await sendDailyReportEmail({ data: { date } });
        if (res?.reason === "no_recipients") {
          toast.info("Cadastre e-mails em Admin → Configurações para receber o relatório.");
        } else if (res?.sent > 0) {
          toast.success(`Relatório enviado por e-mail (${res.sent}).`);
        }
      } catch (e: any) {
        toast.warning(`Relatório gerado, mas o envio por e-mail falhou: ${e.message}`);
      }
      return report;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-report", date] });
      toast.success("Relatório do dia gerado e impresso");
    },
    onError: (e: any) => toast.error(e.message),
  });

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Relatórios do Dia</h3>
            <p className="text-sm text-muted-foreground">Visualize e feche o dia consolidado.</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="rep-date" className="sr-only">Data</Label>
            <Input
              id="rep-date"
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-bold mb-3">Relatórios de turno</h2>
        <div className="space-y-4">
          {shiftReports.map((r: any) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {r.shift_type === "almoco" ? "Almoço / Dia" : "Churrasco / Noite"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.opened_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} às{" "}
                    {new Date(r.closed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                    {r.operator_name ?? "—"}
                  </p>
                </div>
                <p className="text-lg font-black text-primary">{money(Number(r.total_revenue))}</p>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Pedidos pagos</span>
                  <span>{r.orders_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Caixa inicial</span>
                  <span>{money(Number(r.opening_cash))}</span>
                </div>
                {Object.entries(r.totals_by_payment ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-muted-foreground">
                    <span>{REPORT_PAYMENT_LABELS[k] ?? k}</span>
                    <span>{money(Number(v))}</span>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => printShift(r)}>
                <Printer className="h-4 w-4 mr-2" /> Reimprimir turno
              </Button>
            </Card>
          ))}
          {shiftReports.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhum turno finalizado nesta data. O relatório é gerado e impresso automaticamente ao fechar o turno.
            </Card>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Relatório do dia</h2>
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
              <div className="mt-3 space-y-1 text-sm">
                {Object.entries((daily as any).totals_by_payment ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-muted-foreground">
                    <span>{REPORT_PAYMENT_LABELS[k] ?? k}</span>
                    <span>{money(Number(v))}</span>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" className="mt-3" onClick={printDaily}>
                <Printer className="h-4 w-4 mr-2" /> Reimprimir relatório do dia
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                O relatório do dia só pode ser gerado depois que os dois turnos (almoço e noite) forem
                finalizados.
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>{types.has("almoco") ? "✅" : "⬜"} Turno almoço / dia finalizado</li>
                <li>{types.has("noite") ? "✅" : "⬜"} Turno churrasco / noite finalizado</li>
              </ul>
              <Button
                className="mt-4"
                disabled={!bothClosed || generateDaily.isPending}
                onClick={() => generateDaily.mutate()}
              >
                {generateDaily.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar e imprimir relatório do dia
              </Button>
            </>
          )}
        </Card>
      </section>
      </div>
    </div>
  );
}
