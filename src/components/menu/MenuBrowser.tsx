import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, useCart } from "@/lib/cart";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Category = {
  id: string;
  name: string;
  sort_order: number;
  available_lunch: boolean;
  available_dinner: boolean;
};
type Item = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
};

type Settings = {
  lunch_start: string;
  lunch_end: string;
  dinner_start: string;
  dinner_end: string;
};

async function fetchMenu() {
  const [{ data: cats, error: cErr }, { data: items, error: iErr }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, sort_order, available_lunch, available_dinner")
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("id, category_id, name, description, price, image_url, is_available, sort_order")
      .eq("is_available", true)
      .order("sort_order"),
  ]);
  if (cErr) throw cErr;
  if (iErr) throw iErr;
  const { data: settings } = await (supabase as any)
    .from("system_settings")
    .select("lunch_start, lunch_end, dinner_start, dinner_end")
    .eq("id", 1)
    .maybeSingle();
  return {
    cats: (cats ?? []) as unknown as Category[],
    items: (items ?? []) as Item[],
    settings: (settings ?? {
      lunch_start: "11:00",
      lunch_end: "14:30",
      dinner_start: "18:00",
      dinner_end: "23:59",
    }) as Settings,
  };
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function currentWindow(s: Settings): "lunch" | "dinner" | "closed" {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  if (cur >= toMin(s.lunch_start) && cur <= toMin(s.lunch_end)) return "lunch";
  if (cur >= toMin(s.dinner_start) && cur <= toMin(s.dinner_end)) return "dinner";
  return "closed";
}

export function MenuBrowser() {
  const { data, isLoading, error } = useQuery({ queryKey: ["menu"], queryFn: fetchMenu });
  const { add } = useCart();
  const [pendingCompleto, setPendingCompleto] = useState<Item | null>(null);

  if (isLoading)
    return <p className="py-10 text-center text-sm text-muted-foreground">Carregando cardápio…</p>;
  if (error || !data)
    return <p className="py-10 text-center text-sm text-destructive">Não foi possível carregar o cardápio.</p>;

  const svcWindow = currentWindow(data.settings);
  const completosCatId = data.cats.find((c) => c.name.toLowerCase() === "completos")?.id;
  const displayName = (name: string) =>
    name.toLowerCase() === "completos" ? "🏆 O MAIS PEDIDO" : name;

  const grouped = data.cats
    .filter((c) =>
      svcWindow === "lunch" ? c.available_lunch : svcWindow === "dinner" ? c.available_dinner : false,
    )
    .map((c) => ({ ...c, items: data.items.filter((i) => i.category_id === c.id) }))
    .filter((c) => c.items.length)
    .sort((a, b) => {
      if (a.id === completosCatId) return -1;
      if (b.id === completosCatId) return 1;
      return a.sort_order - b.sort_order;
    });

  const espetosCatId = data.cats.find((c) => c.name.toLowerCase() === "espetos")?.id;
  const skewerOptions = data.items.filter(
    (i) => i.category_id === espetosCatId && Number(i.price) === 15,
  );

  const handleAdd = (item: Item) => {
    if (item.category_id === completosCatId) {
      setPendingCompleto(item);
      return;
    }
    add({ id: item.id, name: item.name, price: Number(item.price) });
  };

  const confirmCompleto = (skewer: Item) => {
    if (!pendingCompleto) return;
    add({
      id: `${pendingCompleto.id}:${skewer.id}`,
      name: `${pendingCompleto.name} (Espeto: ${skewer.name})`,
      price: Number(pendingCompleto.price),
    });
    setPendingCompleto(null);
  };

  return (
    <div className="space-y-12">
      {svcWindow === "closed" && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 text-center">
          <p className="text-lg font-black text-primary">Estamos fechados no momento</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Almoço: {data.settings.lunch_start.slice(0,5)}–{data.settings.lunch_end.slice(0,5)} · Churrasco: {data.settings.dinner_start.slice(0,5)}–{data.settings.dinner_end.slice(0,5)}
          </p>
        </div>
      )}
      {/* Category nav */}
      <nav className="sticky top-[64px] z-30 -mx-4 overflow-x-auto border-y border-border bg-background/95 px-4 py-3 backdrop-blur">
        <ul className="flex gap-2">
          {grouped.map((c) => (
            <li key={c.id}>
              <a
                href={`#cat-${c.id}`}
                className="inline-flex whitespace-nowrap rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
              >
                {displayName(c.name)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {grouped.map((cat) => (
        <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-32">
          <h2 className="text-2xl font-black md:text-3xl">{displayName(cat.name)}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {cat.items.map((item) => {
              const isBestseller =
                cat.id === completosCatId &&
                /(salpic|maionese)/i.test(item.name);
              return (
              <article
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-md"
              >
                <div className="min-w-0">
                  <h3 className="font-bold leading-tight">{item.name}</h3>
                  {isBestseller && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary">
                      🏆 Campeão de Vendas
                    </span>
                  )}
                  {item.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  )}
                  <p className="mt-2 text-lg font-black text-primary">{formatBRL(item.price)}</p>
                </div>
                <button
                  onClick={() => handleAdd(item)}
                  aria-label={`Adicionar ${item.name}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow transition hover:brightness-110"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </article>
              );
            })}
          </div>
        </section>
      ))}

      <Dialog open={!!pendingCompleto} onOpenChange={(v) => !v && setPendingCompleto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escolha seu espeto</DialogTitle>
            <DialogDescription>
              O {pendingCompleto?.name} acompanha um espeto de R$ 15,00 à sua escolha, sem alterar o
              valor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
            {skewerOptions.map((s) => (
              <button
                key={s.id}
                onClick={() => confirmCompleto(s)}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5"
              >
                <span className="font-semibold">{s.name}</span>
                <span className="text-sm text-muted-foreground">Incluso</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}