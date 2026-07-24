import { createFileRoute } from "@tanstack/react-router";
import logoAsset from "@/assets/logo-familia-amaral.jpeg.asset.json";
import {
  Clock,
  MapPin,
  Bike,
  Star,
  Instagram,
  Phone,
  ShoppingBag,
  Flame,
  ShieldCheck,
} from "lucide-react";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { CartSheet } from "@/components/menu/CartSheet";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
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
            <div className="leading-tight">
              <p className="text-sm font-black uppercase tracking-wide">Família Amaral</p>
              <p className="text-[11px] text-muted-foreground">Churrasquinho & Restaurante</p>
            </div>
          </div>
          <a
            href="#pedido"
            className="hidden items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:brightness-110 sm:inline-flex"
          >
            <ShoppingBag className="h-4 w-4" />
            Fazer Pedido
          </a>
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
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 text-base font-bold text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:scale-[1.02] hover:brightness-110"
              >
                <ShoppingBag className="h-5 w-5" />
                Fazer Pedido Agora
              </a>
              <a
                href="#contato"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                <Phone className="h-5 w-5" />
                Falar no WhatsApp
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-white/80">
              <Info icon={<Clock className="h-4 w-4" />} label="30–45 min" sub="Tempo médio" />
              <Info icon={<Bike className="h-4 w-4" />} label="A partir de R$ 5" sub="Taxa de entrega" />
              <Info icon={<Star className="h-4 w-4 fill-current" />} label="4.9" sub="Avaliação" />
            </div>
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
          <Strip icon={<Clock className="h-5 w-5 text-primary" />} title="Aberto agora" sub="Ter–Dom · 18h às 23h" />
          <Strip icon={<Bike className="h-5 w-5 text-primary" />} title="Entrega rápida" sub="Bairros próximos · 30–45 min" />
          <Strip icon={<ShieldCheck className="h-5 w-5 text-primary" />} title="Pedido seguro" sub="Sem cadastro, direto pelo site" />
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
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
          <ContactCard icon={<Phone className="h-5 w-5" />} title="WhatsApp" value="Em breve" />
          <ContactCard icon={<Instagram className="h-5 w-5" />} title="Instagram" value="@familiaamaral" />
          <ContactCard icon={<MapPin className="h-5 w-5" />} title="Endereço" value="Em breve" />
        </div>
      </section>

      {/* Rodapé */}
      <footer className="bg-black py-8 text-center text-sm text-white/60">
        <div className="mx-auto max-w-6xl px-4">
          <p className="font-bold text-white">Família Amaral · Churrasquinho & Restaurante</p>
          <p className="mt-1">© {new Date().getFullYear()} · Todos os direitos reservados.</p>
        </div>
      </footer>
      <CartSheet />
    </div>
  );
}

function Info({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10">{icon}</span>
      <div className="leading-tight">
        <p className="font-bold">{label}</p>
        <p className="text-xs text-white/60">{sub}</p>
      </div>
    </div>
  );
}

function Strip({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
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

function ContactCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <p className="text-xs font-bold uppercase tracking-widest">{title}</p>
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
