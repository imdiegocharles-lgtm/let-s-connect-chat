import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ShieldCheck, ChefHat } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  role: z.enum(["admin", "cozinha"]).optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Acesso Administrativo — Família Amaral" },
      { name: "description", content: "Acesso ao painel administrativo do restaurante Família Amaral." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Acesso — Família Amaral" },
      { property: "og:description", content: "Painel administrativo." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const requestedRole = search.role ?? "admin";
  const nextPath = search.next && /^\/(?!\/)/.test(search.next) ? search.next : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const role = await resolveRole();
      if (nextPath) {
        window.location.href = nextPath;
        return;
      }
      navigate({ to: role === "operator" ? "/operacional" : "/admin" });
    })();
  }, [navigate, nextPath]);

  async function resolveRole(): Promise<"admin" | "operator" | "none"> {
    const roles = await getMyRoles();
    if (roles.includes("admin")) return "admin";
    if (roles.includes("operator")) return "operator";
    return "none";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const role = await resolveRole();
      if (role === "none") {
        toast.error("Sua conta não tem permissão de acesso.");
        await supabase.auth.signOut();
        return;
      }
      if (requestedRole === "admin" && role !== "admin") {
        toast.error("Esta conta não é de administrador.");
        await supabase.auth.signOut();
        return;
      }
      if (requestedRole === "cozinha" && role !== "operator" && role !== "admin") {
        toast.error("Esta conta não é da cozinha.");
        await supabase.auth.signOut();
        return;
      }
      if (nextPath) {
        window.location.href = nextPath;
        return;
      }
      navigate({ to: role === "operator" ? "/operacional" : "/admin" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  const isCozinha = requestedRole === "cozinha";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <div className="flex items-center gap-2">
          {isCozinha ? <ChefHat className="h-6 w-6 text-primary" /> : <ShieldCheck className="h-6 w-6 text-primary" />}
          <h1 className="text-2xl font-bold text-foreground">
            {isCozinha ? "Login Cozinha" : "Login Administrativo"}
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {isCozinha
            ? "Entre com sua conta da cozinha (criada pelo administrador)."
            : "Entre com sua conta de administrador."}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}