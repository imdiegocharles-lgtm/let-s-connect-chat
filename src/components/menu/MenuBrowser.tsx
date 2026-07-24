import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, useCart } from "@/lib/cart";
import { Plus } from "lucide-react";

type Category = { id: string; name: string; sort_order: number };
type Item = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  sort_order: number;
};

async function fetchMenu() {
  const [{ data: cats, error: cErr }, { data: items, error: iErr }] = await Promise.all([
    supabase.from("menu_categories").select("id, name, sort_order").order("sort_order"),
    supabase
      .from("menu_items")
      .select("id, category_id, name, description, price, is_available, sort_order")
      .eq("is_available", true)
      .order("sort_order"),
  ]);
  if (cErr) throw cErr;
  if (iErr) throw iErr;
  return { cats: (cats ?? []) as Category[], items: (items ?? []) as Item[] };
}

export function MenuBrowser() {
  const { data, isLoading, error } = useQuery({ queryKey: ["menu"], queryFn: fetchMenu });
  const { add } = useCart();

  if (isLoading)
    return <p className="py-10 text-center text-sm text-muted-foreground">Carregando cardápio…</p>;
  if (error || !data)
    return <p className="py-10 text-center text-sm text-destructive">Não foi possível carregar o cardápio.</p>;

  const grouped = data.cats
    .map((c) => ({ ...c, items: data.items.filter((i) => i.category_id === c.id) }))
    .filter((c) => c.items.length);

  return (
    <div className="space-y-12">
      {/* Category nav */}
      <nav className="sticky top-[64px] z-30 -mx-4 overflow-x-auto border-y border-border bg-background/95 px-4 py-3 backdrop-blur">
        <ul className="flex gap-2">
          {grouped.map((c) => (
            <li key={c.id}>
              <a
                href={`#cat-${c.id}`}
                className="inline-flex whitespace-nowrap rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
              >
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {grouped.map((cat) => (
        <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-32">
          <h2 className="text-2xl font-black md:text-3xl">{cat.name}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {cat.items.map((item) => (
              <article
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-md"
              >
                <div className="min-w-0">
                  <h3 className="font-bold leading-tight">{item.name}</h3>
                  {item.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  )}
                  <p className="mt-2 text-lg font-black text-primary">{formatBRL(item.price)}</p>
                </div>
                <button
                  onClick={() =>
                    add({ id: item.id, name: item.name, price: Number(item.price) })
                  }
                  aria-label={`Adicionar ${item.name}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow transition hover:brightness-110"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}