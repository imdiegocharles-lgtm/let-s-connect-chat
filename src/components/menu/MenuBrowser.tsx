import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, useCart } from "@/lib/cart";
import {
  formatSchedule,
  getStoreStatus,
  useHorarios,
  useAvisoLoja,
  DEFAULT_AVISO,
} from "@/lib/store-hours";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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
  is_completo_skewer_option: boolean;
  requires_skewer_choice: boolean;
  has_side_dish: boolean;
};

async function fetchMenu() {
  const [{ data: cats, error: cErr }, { data: items, error: iErr }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, sort_order, available_lunch, available_dinner")
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id, category_id, name, description, price, image_url, is_available, sort_order, is_completo_skewer_option, requires_skewer_choice, has_side_dish",
      )
      .eq("is_available", true)
      .order("price", { ascending: true })
      .order("name", { ascending: true }),
  ]);
  if (cErr) throw cErr;
  if (iErr) throw iErr;
  return {
    cats: (cats ?? []) as unknown as Category[],
    items: (items ?? []) as Item[],
  };
}

/** normaliza nomes de categoria: remove emojis, acentos, pontuação e caixa */
function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .toLowerCase();
}

export function MenuBrowser() {
  const { data, isLoading, error } = useQuery({ queryKey: ["menu"], queryFn: fetchMenu });
  const { data: horarios = [], isLoading: hoursLoading } = useHorarios();
  const { data: aviso = DEFAULT_AVISO } = useAvisoLoja();
  const { add } = useCart();
  const [pendingCompleto, setPendingCompleto] = useState<Item | null>(null);
  const [pendingSideDish, setPendingSideDish] = useState<Item | null>(null);

  const { data: sides = [] } = useQuery({
    queryKey: ["active-sides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acompanhamentos")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || hoursLoading)
    return <p className="py-10 text-center text-sm text-muted-foreground">Carregando cardápio…</p>;
  if (error || !data)
    return <p className="py-10 text-center text-sm text-destructive">Não foi possível carregar o cardápio.</p>;

  const store = getStoreStatus(horarios);
  const svcWindow: "lunch" | "dinner" | "closed" =
    store.openService === "almoco" ? "lunch" : store.openService === "churrasquinho" ? "dinner" : "closed";
  // Categoria dos "Completos" (O MAIS PEDIDO): busca flexível, com fallback
  // pelos próprios itens ("Completo com Maionese/Salpicão").
  const completosCatId =
    data.cats.find((c) => {
      const n = norm(c.name);
      return n.includes("completo") || n.includes("mais pedido");
    })?.id ??
    data.items.find((i) => norm(i.name).startsWith("completo"))?.category_id;
  const displayName = (name: string) => name;

  const grouped = data.cats
    .filter((c) => {
      // Se estiver aberto, filtra pelo turno atual
      if (svcWindow === "lunch") return c.available_lunch;
      if (svcWindow === "dinner") return c.available_dinner;
      // Se estiver fechado, mostra tudo o que estiver disponível em algum turno
      return c.available_lunch || c.available_dinner;
    })
    .map((c) => ({ ...c, items: data.items.filter((i) => i.category_id === c.id) }))
    .filter((c) => c.items.length)
    .sort((a, b) => {
      if (a.id === completosCatId) return -1;
      if (b.id === completosCatId) return 1;
      return a.sort_order - b.sort_order;
    });

  // Opções de espeto: marcadas item a item no Admin ("Aparece na escolha seu espeto").
  const skewerOptions = data.items
    .filter((i) => i.is_completo_skewer_option)
    .sort((a, b) => Number(a.price) - Number(b.price) || a.name.localeCompare(b.name, "pt-BR"));

  const handleAdd = (item: Item) => {
    if (svcWindow === "closed") {
      toast.error("Estamos fechados no momento. Não é possível adicionar itens ao pedido.");
      return;
    }
    // Vinculado ao PRODUTO: vale em qualquer seção onde ele apareça.
    if (item.requires_skewer_choice && skewerOptions.length > 0) {
      setPendingCompleto(item);
      return;
    }
    if (item.has_side_dish && sides.length > 0) {
      setPendingSideDish(item);
      return;
    }
    add({ id: item.id, menuItemId: item.id, name: item.name, price: Number(item.price) });
  };

  const confirmSideDish = (side: { id: string; name: string }) => {
    if (!pendingSideDish) return;
    add({
      id: `${pendingSideDish.id}:side:${side.id}`,
      menuItemId: pendingSideDish.id,
      name: `${pendingSideDish.name} (Acompanhamento: ${side.name})`,
      price: Number(pendingSideDish.price),
      extras: { acompanhamento: side.name, acompanhamento_id: side.id },
    });
    setPendingSideDish(null);
  };

  const confirmCompleto = (skewer: Item) => {
    if (!pendingCompleto) return;
    add({
      id: `${pendingCompleto.id}:${skewer.id}`,
      menuItemId: pendingCompleto.id,
      name: `${pendingCompleto.name} (Espeto: ${skewer.name})`,
      price: Number(pendingCompleto.price),
      extras: { espeto: skewer.name, espeto_id: skewer.id },
    });
    setPendingCompleto(null);
  };

  return (
    <div className="space-y-12">
      {svcWindow === "closed" && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 text-center">
          <p className="text-lg font-black text-primary">
            {aviso.titulo_fechado || DEFAULT_AVISO.titulo_fechado}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
            {aviso.horarios_modo === "manual" && aviso.horarios_texto.trim()
              ? aviso.horarios_texto
              : `Almoço: ${formatSchedule(horarios, "almoco") || "—"} · Churrasquinho: ${
                  formatSchedule(horarios, "churrasquinho") || "—"
                }`}
          </p>
        </div>
      )}
      {svcWindow !== "closed" && !store.deliveryToday && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 text-center">
          <p className="text-lg font-black text-primary">Sem delivery hoje ({store.todayLabel})</p>
          <p className="mt-1 text-sm text-muted-foreground">
            O atendimento hoje é somente presencial na loja. Você pode ver o cardápio, mas não é
            possível finalizar pedidos para entrega.
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
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cat.items.map((item) => {
              const isBestseller =
                cat.id === completosCatId &&
                /(salpic|maionese)/i.test(item.name);
              return (
              <article
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/50 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-4xl opacity-30">🍢</div>
                  )}
                  {isBestseller && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary-foreground shadow">
                      🏆 Campeão
                    </span>
                  )}
                </div>
                <div className="flex flex-1 items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <h3 className="font-bold leading-tight">{item.name}</h3>
                    {item.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    )}
                    <p className="mt-2 text-lg font-black text-primary">{formatBRL(item.price)}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(item)}
                    aria-label={`Adicionar ${item.name}`}
                    disabled={svcWindow === "closed"}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </article>
              );
            })}
          </div>
        </section>
      ))}

      <Dialog open={!!pendingCompleto} onOpenChange={(v) => !v && setPendingCompleto(null)}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Escolha seu espeto</DialogTitle>
            <DialogDescription>
              O {pendingCompleto?.name} acompanha um espeto à sua escolha, sem alterar o valor do
              prato. Escolha uma opção para continuar.
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

      <Dialog open={!!pendingSideDish} onOpenChange={(v) => !v && setPendingSideDish(null)}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Escolha seu acompanhamento</DialogTitle>
            <DialogDescription>
              O {pendingSideDish?.name} exige a escolha de um acompanhamento, sem custo adicional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
            {sides.map((s) => (
              <button
                key={s.id}
                onClick={() => confirmSideDish(s)}
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