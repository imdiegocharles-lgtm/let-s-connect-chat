import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, useCart } from "@/lib/cart";
import {
  formatSchedule,
  getStoreStatus,
  useHorarios,
  useAvisoLoja,
  useIsShiftOpen,
  DEFAULT_AVISO,
} from "@/lib/store-hours";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
  has_extra_question: boolean;
  extra_question_text: string | null;
  extra_question_options: string[] | null;
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
        "id, category_id, name, description, price, image_url, is_available, sort_order, is_completo_skewer_option, requires_skewer_choice, has_side_dish, has_extra_question, extra_question_text, extra_question_options",
      )
      .eq("is_available", true)
      .order("price", { ascending: true })
      .order("name", { ascending: true }),
  ]);
  if (cErr) throw cErr;
  if (iErr) throw iErr;
  return {
    cats: (cats ?? []) as unknown as Category[],
    items: (items ?? []) as any[],
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
  const [pendingExtra, setPendingExtra] = useState<Item | null>(null);
  const [selectedSkewerId, setSelectedSkewerId] = useState<string>("");

  const {
    data: isShiftOpen,
    isLoading: shiftLoading,
    error: shiftError,
  } = useIsShiftOpen();


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

  if (isLoading || hoursLoading || shiftLoading)
    return <p className="py-10 text-center text-sm text-muted-foreground">Carregando cardápio…</p>;
  if (error || !data)
    return <p className="py-10 text-center text-sm text-destructive">Não foi possível carregar o cardápio.</p>;

  const store = getStoreStatus(horarios, isShiftOpen === true);
  const svcWindow: "lunch" | "dinner" | "closed" =
    store.openService === "almoco" ? "lunch" : store.openService === "churrasquinho" ? "dinner" : "closed";
  const isActuallyClosed = !store.hasActiveShift;


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
    if (!store.hasActiveShift) {
      toast.error("Estamos fechados no momento, em breve estaremos online.");
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
    if (item.has_extra_question && (item.extra_question_options?.length ?? 0) > 0) {
      setPendingExtra(item);
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

  const confirmExtra = (option: string) => {
    if (!pendingExtra) return;
    add({
      id: `${pendingExtra.id}:extra:${option}`,
      menuItemId: pendingExtra.id,
      name: `${pendingExtra.name} (${pendingExtra.extra_question_text || "Opção"}: ${option})`,
      price: Number(pendingExtra.price),
      extras: { 
        pergunta: pendingExtra.extra_question_text || "Opção", 
        escolha: option 
      },
    });
    setPendingExtra(null);
  };

  return (
    <div className="space-y-12">
      {shiftError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-center">
          <p className="text-lg font-black text-destructive">Não foi possível verificar se a loja está aberta</p>
          <p className="mt-1 text-sm text-muted-foreground">Atualize a página ou tente novamente em instantes.</p>
        </div>
      )}
      {isActuallyClosed && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 text-center">
          <p className="text-lg font-black text-primary">
            {!store.hasActiveShift && svcWindow !== "closed" 
              ? (aviso.titulo_fechado || "Estamos fechados no momento, em breve estaremos online")
              : (aviso.titulo_fechado || DEFAULT_AVISO.titulo_fechado)}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
            {aviso.horarios_modo === "manual" && aviso.horarios_texto.trim()
              ? aviso.horarios_texto
              : (aviso.home_horario_texto || `Almoço: ${formatSchedule(horarios, "almoco") || "—"} · Churrasquinho: ${
                  formatSchedule(horarios, "churrasquinho") || "—"
                }`)}
          </p>
        </div>
      )}

      {/* Category nav */}
      <nav className="sticky top-[69px] z-30 -mx-4 overflow-x-auto overscroll-x-contain border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:top-[64px]">
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
        <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-[136px] sm:scroll-mt-32">
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
                    disabled={isActuallyClosed}
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

      <Dialog 
        open={!!pendingCompleto} 
        onOpenChange={(v) => {
          if (!v) {
            setPendingCompleto(null);
            setSelectedSkewerId("");
          }
        }}
      >
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Escolha seu espeto</DialogTitle>
            <DialogDescription>
              O {pendingCompleto?.name} acompanha um espeto à sua escolha, sem alterar o valor do
              prato. Escolha uma opção para continuar.
            </DialogDescription>
          </DialogHeader>
          
          <RadioGroup 
            value={selectedSkewerId} 
            onValueChange={setSelectedSkewerId}
            className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 py-2"
          >
            {skewerOptions.map((s) => (
              <Label
                key={s.id}
                htmlFor={s.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-4 cursor-pointer transition-all ${
                  selectedSkewerId === s.id 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={s.id} id={s.id} />
                  <span className="font-bold text-base">{s.name}</span>
                </div>
              </Label>
            ))}
          </RadioGroup>

          <div className="mt-4 flex flex-col gap-2">
            <Button 
              className="w-full font-bold h-12 text-lg" 
              disabled={!selectedSkewerId}
              onClick={() => {
                const skewer = skewerOptions.find(s => s.id === selectedSkewerId);
                if (skewer) confirmCompleto(skewer);
                setSelectedSkewerId("");
              }}
            >
              Confirmar Escolha
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={() => {
                setPendingCompleto(null);
                setSelectedSkewerId("");
              }}
            >
              Cancelar
            </Button>
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

      <Dialog open={!!pendingExtra} onOpenChange={(v) => !v && setPendingExtra(null)}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{pendingExtra?.extra_question_text || "Pergunta Extra"}</DialogTitle>
            <DialogDescription>
              Selecione uma das opções abaixo para adicionar o item ao seu carrinho.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
            {pendingExtra?.extra_question_options?.map((option) => (
              <button
                key={option}
                onClick={() => confirmExtra(option)}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5"
              >
                <span className="font-semibold">{option}</span>
                <span className="text-sm text-muted-foreground italic">Selecionar</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}