import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerSession, ORDER_STATUS_STEPS } from "@/lib/customer-auth";
import { formatBRL } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Loader2, LogOut, ShoppingBag } from "lucide-react";
import logoAsset from "@/assets/logo-familia-amaral-4k.png.asset.json";

export const Route = createFileRoute("/meus-pedidos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meus pedidos — Família Amaral Churrasquinho" },
      {
        name: "description",
        content:
          "Acompanhe em tempo real o preparo e a entrega dos seus pedidos da Família Amaral.",
      },
      { property: "og:title", content: "Meus pedidos — Família Amaral" },
      {
        property: "og:description",
        content: "Status do seu churrasquinho, atualizado em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeusPedidos,
});

type OrderRow = {
  id: string;
  order_number: number;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  neighborhood: string | null;
  customer_address: string | null;
  payment_method: string | null;
  created_at: string;
  order_items: { id: string; name: string; quantity: number; price: number }[];
};

async function fetchMyOrders(userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total, subtotal, delivery_fee, neighborhood, customer_address, payment_method, created_at, order_items(id, name, quantity, price)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as unknown as OrderRow[];
}

function MeusPedidos() {
  const { user, loading } = useCustomerSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/conta", replace: true });
  }, [loading, user, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: () => fetchMyOrders(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("my-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["my-orders", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (loading || (user && isLoading))
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logoAsset.url}
              alt="Família Amaral"
              className="h-10 w-10 rounded-full ring-2 ring-primary/30"
            />
            <span className="text-sm font-black uppercase tracking-wide">Meus pedidos</span>
          </Link>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar ao cardápio
        </Link>

        {!orders?.length && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-bold">Você ainda não fez nenhum pedido</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Que tal um espeto na brasa agora?
            </p>
            <Button asChild className="mt-5">
              <Link to="/">Ver cardápio</Link>
            </Button>
          </div>
        )}

        {orders?.map((order) => {
          const stepIndex = ORDER_STATUS_STEPS.findIndex((s) => s.key === order.status);
          return (
            <article
              key={order.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-3">
                <div>
                  <p className="text-sm font-black">Pedido #{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <p className="text-lg font-black text-primary">{formatBRL(Number(order.total))}</p>
              </div>

              <ol className="space-y-3 px-5 py-4">
                {ORDER_STATUS_STEPS.map((step, i) => {
                  const done = stepIndex >= 0 && i <= stepIndex;
                  const current = i === stepIndex;
                  return (
                    <li key={step.key} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-black ${
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <div>
                        <p
                          className={`text-sm font-bold ${current ? "text-primary" : done ? "" : "text-muted-foreground"}`}
                        >
                          {step.label}
                          {current && (
                            <span className="ml-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-primary align-middle" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{step.hint}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="border-t border-border px-5 py-4">
                <ul className="space-y-1 text-sm">
                  {order.order_items?.map((it) => (
                    <li key={it.id} className="flex justify-between gap-3">
                      <span>
                        {it.quantity}× {it.name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatBRL(Number(it.price) * it.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatBRL(Number(order.subtotal))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entrega {order.neighborhood ? `· ${order.neighborhood}` : ""}</span>
                    <span>{formatBRL(Number(order.delivery_fee))}</span>
                  </div>
                  {order.customer_address && <p className="pt-1">{order.customer_address}</p>}
                </div>
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}