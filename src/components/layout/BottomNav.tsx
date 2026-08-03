import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, UtensilsCrossed, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

function TabButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 outline-none"
    >
      <span
        className={cn(
          "absolute top-0 h-[3px] w-8 rounded-full transition-all duration-300",
          active ? "bg-primary opacity-100" : "opacity-0",
        )}
      />
      <span
        className={cn(
          "grid place-items-center transition-all duration-200 group-active:scale-90",
          active ? "text-primary -translate-y-0.5" : "text-white/60",
        )}
      >
        {children}
      </span>
      <span
        className={cn(
          "max-w-full truncate text-[11px] font-semibold leading-none transition-colors duration-200",
          active ? "text-primary" : "text-white/60",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function BottomNav() {
  const navigate = useNavigate();
  const { count, setSheetOpen } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });

  const isHome = pathname === "/" && hash !== "cardapio";
  const isMenu = pathname === "/" && hash === "cardapio";

  const goHome = () => navigate({ to: "/", hash: "" });
  const goMenu = () => {
    if (pathname === "/") {
      document.getElementById("cardapio")?.scrollIntoView({ behavior: "smooth" });
      navigate({ to: "/", hash: "cardapio", replace: true });
    } else {
      navigate({ to: "/", hash: "cardapio" });
    }
  };

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#1A1A1A]/90 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex h-[82px] max-w-3xl items-stretch px-6">
        <TabButton active={isHome} label="Início" onClick={goHome}>
          <Home className="h-[22px] w-[22px]" strokeWidth={1.9} />
        </TabButton>

        <div className="relative flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="-mt-7 flex h-[72px] w-[72px] flex-col items-center justify-center gap-1 rounded-full bg-[#D90429] text-white shadow-[0_12px_28px_-10px_rgba(217,4,41,0.9)] ring-4 ring-[#1A1A1A]/90 transition-transform duration-150 active:scale-90"
          >
            <ShoppingBag className="h-6 w-6" strokeWidth={2.1} />
            <span className="text-[10px] font-bold leading-none">Meu Pedido</span>
            {count > 0 && (
              <span className="absolute -right-0.5 -top-8 grid h-6 min-w-6 place-items-center rounded-full border-2 border-[#1A1A1A] bg-[#D90429] px-1 text-[11px] font-black text-white">
                {count}
              </span>
            )}
          </button>
        </div>

        <TabButton active={isMenu} label="Cardápio" onClick={goMenu}>
          <UtensilsCrossed className="h-[22px] w-[22px]" strokeWidth={1.9} />
        </TabButton>
      </div>
    </nav>
  );
}

/** Espaço para o conteúdo não ficar coberto pela barra fixa. */
export function BottomNavSpacer() {
  return <div aria-hidden className="h-[82px]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />;
}
