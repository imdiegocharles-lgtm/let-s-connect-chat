import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/logo-familia-amaral-4k.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

const searchSchema = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/conta")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Minha conta — Família Amaral Churrasquinho" },
      {
        name: "description",
        content:
          "Entre ou crie sua conta na Família Amaral para fazer pedidos e acompanhar a entrega em tempo real.",
      },
      { property: "og:title", content: "Minha conta — Família Amaral" },
      {
        property: "og:description",
        content: "Acompanhe seus pedidos da Família Amaral em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContaPage,
});

function ContaPage() {
  const navigate = useNavigate();
  const { next } = useSearch({ from: "/conta" });
  const safeNext = next && /^\/(?!\/)/.test(next) ? next : "/meus-pedidos";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: safeNext, replace: true });
    });
  }, [navigate, safeNext]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (name.trim().length < 2) throw new Error("Informe seu nome.");
        if (phone.trim().length < 8) throw new Error("Informe seu WhatsApp.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim(), phone: phone.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.message("Conta criada! Faça login para continuar.");
          setMode("login");
          return;
        }
        toast.success(`Bem-vindo, ${name.trim().split(" ")[0]}!`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
      navigate({ to: safeNext, replace: true });
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      toast.error(
        /invalid login/i.test(msg)
          ? "E-mail ou senha incorretos."
          : /already registered|already exists/i.test(msg)
            ? "Este e-mail já tem conta. Faça login."
            : msg || "Não foi possível continuar.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="relative overflow-hidden px-4 pb-24 pt-10 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />
        <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1 self-start text-xs font-semibold text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar ao cardápio
          </Link>
          <img
            src={logoAsset.url}
            alt="Família Amaral Churrasquinho"
            className="h-24 w-24 rounded-full ring-4 ring-white/25"
          />
          <h1 className="mt-4 text-2xl font-black uppercase tracking-wide">
            {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Da nossa cozinha direto pra sua casa — acompanhe cada etapa do pedido.
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-16 max-w-md px-4 pb-16">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">WhatsApp *</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(21) 9 0000-0000"
                    maxLength={20}
                    required
                  />
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-bold text-primary hover:underline"
            >
              {mode === "login" ? "Criar agora" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}