import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/logo-familia-amaral-4k.png.asset.json";

import {
  Clock,
  MapPin,
  Bike,
  Star,
  Phone,
  ShoppingBag,
  Flame,
  Navigation,
  CalendarDays,
  Camera as Instagram,
} from "lucide-react";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { ReservationDialog } from "@/components/reservations/ReservationDialog";
import { ReviewDialog } from "@/components/reviews/ReviewDialog";
import {
  formatSchedule,
  getStoreStatus,
  useConfigEntrega,
  useHorarios,
  useAvisoLoja,
  DEFAULT_AVISO,
} from "@/lib/store-hours";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { data: horarios = [] } = useHorarios();
  const { data: activeShift } = useQuery({
    queryKey: ["active-shift-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("id")
        .is("closed_at", null)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: entrega } = useConfigEntrega();
  const { data: aviso = DEFAULT_AVISO } = useAvisoLoja();
  const store = getStoreStatus(horarios, !!activeShift);
  const deliveryBlocked = horarios.length > 0 && !store.deliveryToday;


  const handleOrderClick = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("cardapio")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={logoAsset.url}
              alt="Família Amaral"
              className="h-11 w-11 rounded-full ring-2 ring-primary/30"
            />
            <p className="text-sm font-black uppercase tracking-wide leading-tight">Família Amaral</p>
          </div>
          <div className="flex items-center gap-2">
            <ReservationDialog
              trigger={
                <button className="hidden sm:inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/20">
                  <CalendarDays className="h-4 w-4" />
                  Faça sua Reserva
                </button>
              }
            />
            <a
              href="#cardapio"
              onClick={handleOrderClick}
              className="hidden items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:brightness-110 sm:inline-flex"
            >
              <ShoppingBag className="h-4 w-4" />
              Ver Cardápio
            </a>
          </div>
        </div>
        <div className="sm:hidden mx-auto max-w-6xl px-4 pb-3 flex flex-col items-stretch gap-1">
          <ReservationDialog
            trigger={
              <button className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
                <CalendarDays className="h-4 w-4" />
                Faça sua Reserva
              </button>
            }
          />
          <p className="text-[11px] text-center text-muted-foreground">
            Reservas disponíveis apenas para grupos a partir de 10 pessoas.
          </p>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,white,transparent_35%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur">
              <Flame className="h-3.5 w-3.5" /> Feito na brasa, entregue quentinho
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
              O sabor da <span className="text-primary-foreground/90 [text-shadow:0_0_30px_hsl(0_80%_60%/0.6)]">Família Amaral</span> na sua casa.
            </h1>
            <p className="mt-4 max-w-lg text-base text-white/80 md:text-lg">
              Churrasquinho, porções e pratos preparados com carinho. Peça em poucos cliques e receba com agilidade.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                id="pedido"
                href="#cardapio"
                onClick={handleOrderClick}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 text-base font-bold text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:scale-[1.02] hover:brightness-110"
              >
                <ShoppingBag className="h-5 w-5" />
                Ver Cardápio
              </a>
              <a
                href="https://www.instagram.com/churrasquinhofamiliaamaral?igsh=bDM0a3diaDM5eTFo&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                <Instagram className="h-5 w-5" />
                Siga no Instagram
              </a>
              <a
                href="https://share.google/WxLpMadUsMXgePEe6"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                <Navigation className="h-5 w-5" />
                Como Chegar
              </a>
            </div>
            {deliveryBlocked && (
              <p className="mt-4 inline-flex rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90">
                Hoje ({store.todayLabel}) não temos delivery — atendimento somente presencial na loja.
              </p>
            )}
          </div>

          <div className="relative mx-auto flex items-center justify-center">
            <div className="absolute h-72 w-72 rounded-full bg-primary/40 blur-3xl md:h-96 md:w-96" />
            <img
              src={logoAsset.url}
              alt="Logo Família Amaral"
              className="relative h-64 w-64 rounded-full object-cover shadow-2xl ring-4 ring-white/20 md:h-80 md:w-80 animate-scale-in"
            />
          </div>
        </div>
      </section>

      {/* Quick info strip */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:grid-cols-3">
          <Strip
            icon={<Clock className="h-5 w-5 text-primary" />}
            title={aviso.home_horario_titulo?.trim() || DEFAULT_AVISO.home_horario_titulo}
            sub={
              aviso.home_horario_texto?.trim() ? (
                <span className="whitespace-pre-line">{aviso.home_horario_texto}</span>
              ) : (
                formatSchedule(horarios, "churrasquinho") || "Consulte nossos horários"
              )
            }
          />
          <Strip
            icon={<Bike className="h-5 w-5 text-primary" />}
            title={
              entrega
                ? `Entrega em ${entrega.prazo_minimo_minutos}–${entrega.prazo_maximo_minutos} min`
                : "Entrega rápida"
            }
            sub={entrega?.texto_observacao ?? ""}
          />
          <Strip
            icon={<Star className="h-5 w-5 text-primary" />}
            title="Avaliação 4.9"
            sub={
              <ReviewDialog
                trigger={
                  <button className="underline decoration-dotted underline-offset-2 hover:text-foreground">
                    Avaliar o restaurante
                  </button>
                }
              />
            }
          />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-6 text-xs text-muted-foreground">
          Taxa de entrega a partir de R$ 4,00, conforme o bairro.
        </div>
      </section>

      {/* Placeholder cardápio */}
      <section id="cardapio" className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Cardápio</p>
            <h2 className="mt-1 text-3xl font-black md:text-4xl">Peça pelo cardápio</h2>
          </div>
        </div>
        <div className="mt-8">
          <MenuBrowser />
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="border-t border-border bg-secondary text-secondary-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2">
          <ContactCard icon={<Phone className="h-5 w-5" />} title="WhatsApp" value="Fale conosco" href="https://wa.me/message/5ZD6GFWUIAMZA1" />
          <ContactCard icon={<MapPin className="h-5 w-5" />} title="Endereço" value="Rua Monteiro Lobato, 18 – Estrela do Norte – São Gonçalo/RJ" />
        </div>
      </section>

      {/* Rodapé */}
      <footer className="bg-black py-8 text-center text-sm text-white/60">
        <div className="mx-auto max-w-6xl px-4">
          <p className="font-bold text-white">Família Amaral · Churrasquinho & Restaurante</p>
          <p className="mt-1">© {new Date().getFullYear()} · Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function Strip({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">{icon}</span>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function ContactCard({ icon, title, value, href }: { icon: React.ReactNode; title: string; value: string; href?: string }) {
  const content = (
    <>
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <p className="text-xs font-bold uppercase tracking-widest">{title}</p>
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
      >
        {content}
      </a>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      {content}
    </div>
  );
}
