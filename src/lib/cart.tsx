import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  /** id real do item no cardápio (menu_items.id) — o `id` pode ser composto (combo+espeto) */
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  extras?: Record<string, unknown> | null;
};

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  subtotal: number;
  count: number;
  /** controle do painel lateral do carrinho (usado pelo menu inferior) */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "familia-amaral-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const value = useMemo<CartCtx>(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    return {
      items,
      subtotal,
      count,
      sheetOpen,
      setSheetOpen,
      add: (item) =>
        setItems((prev) => {
          const existing = prev.find((p) => p.id === item.id);
          if (existing)
            return prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p));
          return [...prev, { ...item, quantity: 1 }];
        }),
      inc: (id) => setItems((p) => p.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i))),
      dec: (id) =>
        setItems((p) =>
          p
            .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
            .filter((i) => i.quantity > 0),
        ),
      remove: (id) => setItems((p) => p.filter((i) => i.id !== id)),
      clear: () => setItems([]),
    };
  }, [items, sheetOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });