import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, LogOut, Printer, Volume2, VolumeX, Play, Square, CheckCircle2 } from "lucide-react";
import { sendToLocalPrinter } from "@/lib/receipt";
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
  head: () => ({
    meta: [
      { title: "Painel Operacional — Família Amaral" },
      { name: "description", content: "Tela de cozinha com pedidos em tempo real e impressão de cupons." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: KitchenPage,
});

function KitchenPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "unauth" | "denied">("loading");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setStatus("unauth");
      await supabase.rpc("claim_role_if_whitelisted" as never);
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      const { data: isOp } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "operator" as never });
      setStatus(isAdmin || isOp ? "ok" : "denied");
    })();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (status === "unauth") {
    navigate({ to: "/auth" });
    return null;
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
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as (Order & { order_items: OrderItem[] })[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Order["status"] }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kitchen-orders"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const confirmPayment = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: string }) => {
      const { error } = await (supabase as any)
        .from("orders")
        .update({
          confirmed_payment_method: method,
          payment_confirmed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
      setConfirmPayFor(null);
      toast.success("Pagamento confirmado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const printOne = async (order: Order & { order_items: OrderItem[] }) => {
    try {
      await sendToLocalPrinter(agentUrl, order, order.order_items);
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
      customer_address: "Rua de Teste, 123 - Apto 1",
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
    };
    const testItems: OrderItem[] = [
      { id: "1", order_id: "test", menu_item_id: "1", name: "Espeto de Carne", price: 12.9, quantity: 3, extras: null, created_at: "" },
      { id: "2", order_id: "test", menu_item_id: "2", name: "Batata Completa", price: 35, quantity: 1, extras: null, created_at: "" },
    ];
    try {
      await sendToLocalPrinter(agentUrl, testOrder, testItems);
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
              <Label htmlFor="agentUrl" className="text-xs whitespace-nowrap">Impressora (agente)</Label>
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
            {activeShift ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCloseShiftModal(true)}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Square className="h-4 w-4 mr-2" /> Fechar turno
              </Button>
            ) : (
              <Button size="sm" onClick={() => setOpenShiftModal(true)}>
                <Play className="h-4 w-4 mr-2" /> Abrir turno
              </Button>
            )}
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
              <TabsTrigger value="menu">Cardápio</TabsTrigger>
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
            <TabsContent value="menu" className="mt-4">
              <MenuAvailabilityPanel />
            </TabsContent>
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
        onClose={() => setCloseShiftModal(false)}
        onClosed={() => {
          setCloseShiftModal(false);
          refetchShift();
          qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
        }}
      />
      <ConfirmPaymentDialog
        order={confirmPayFor}
        onClose={() => setConfirmPayFor(null)}
        onConfirm={(method) =>
          confirmPayFor && confirmPayment.mutate({ id: confirmPayFor.id, method })
        }
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
}: {
  order: Order & { order_items: OrderItem[] };
  onStatus: (status: Order["status"]) => void;
  onPrint: () => void;
  onConfirmPayment: () => void;
  isPending: boolean;
  compact?: boolean;
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
        <p><span className="font-semibold">Endereço:</span> {order.customer_address}</p>
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

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onPrint}>
          <Printer className="h-4 w-4 mr-2" /> Reimprimir
        </Button>
        {nextStatus && (
          <Button
            size="sm"
            onClick={() => onStatus(nextStatus)}
            disabled={isPending}
            className={STATUS_COLORS[nextStatus] ?? ""}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mover para {STATUS_LABELS[nextStatus].toLowerCase()}
          </Button>
        )}
        {needsPayConfirm && (
          <Button size="sm" onClick={onConfirmPayment} className="bg-amber-500 hover:bg-amber-600">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar pagamento
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
  onClose,
  onClosed,
}: {
  open: boolean;
  shift: Shift | null;
  canClose: boolean;
  pendingActive: number;
  awaitingPayment: number;
  onClose: () => void;
  onClosed: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!shift) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("shifts")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", shift.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Turno fechado");
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
  onClose,
  onConfirm,
  isPending,
}: {
  order: Order | null;
  onClose: () => void;
  onConfirm: (method: string) => void;
  isPending: boolean;
}) {
  const [method, setMethod] = useState<string>("dinheiro");
  useEffect(() => {
    if (order) setMethod(order.payment_method ?? "dinheiro");
  }, [order]);
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
          <Button onClick={() => onConfirm(method)} disabled={isPending}>
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
          .order("sort_order"),
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
