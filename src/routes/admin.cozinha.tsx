import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { Loader2, LogOut, ArrowLeft, Printer, Volume2, VolumeX } from "lucide-react";
import { sendToLocalPrinter } from "@/lib/receipt";
import { playBeep } from "@/lib/sound";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;

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

export const Route = createFileRoute("/admin/cozinha")({
  head: () => ({
    meta: [
      { title: "Cozinha — Família Amaral" },
      { name: "description", content: "Tela de cozinha com pedidos em tempo real e impressão de cupons." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: KitchenPage,
});

function KitchenPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "unauth" | "not-admin">("loading");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setStatus("unauth");
      await supabase.rpc("claim_admin_if_whitelisted");
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      setStatus(isAdmin ? "ok" : "not-admin");
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
  if (status === "not-admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-bold">Acesso negado</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sua conta não tem permissão de administrador.</p>
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Painel
            </Link>
            <h1 className="text-lg sm:text-xl font-bold">Cozinha — Pedidos</h1>
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
            <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
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
                Entregues hoje
                <Badge variant="secondary">{doneOrders.length}</Badge>
              </h2>
              <div className="space-y-4">
                {doneOrders.slice(0, 20).map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatus={(s) => updateStatus.mutate({ id: order.id, status: s })}
                    onPrint={() => printOne(order)}
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
        )}
      </main>
    </div>
  );
}

function OrderCard({
  order,
  onStatus,
  onPrint,
  isPending,
  compact,
}: {
  order: Order & { order_items: OrderItem[] };
  onStatus: (status: Order["status"]) => void;
  onPrint: () => void;
  isPending: boolean;
  compact?: boolean;
}) {
  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const nextStatus = STATUS_FLOW[currentIndex + 1];

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
      </div>
    </Card>
  );
}
