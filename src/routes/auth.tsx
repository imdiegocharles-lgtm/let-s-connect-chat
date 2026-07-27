import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const role = await resolveRole();
      navigate({ to: role === "operator" ? "/operacional" : "/admin" });
    })();
  }, [navigate]);

  async function resolveRole(): Promise<"admin" | "operator" | "none"> {
    const { data } = await supabase.rpc("claim_role_if_whitelisted");
    if (data === "admin" || data === "operator") return data;
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) return "none";
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (isAdmin) return "admin";
    const { data: isOp } = await supabase.rpc("has_role", { _user_id: uid, _role: "operator" });
    if (isOp) return "operator";
    return "none";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        toast.success("Conta criada! Entrando...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const role = await resolveRole();
      if (role === "none") {
        toast.error("Sua conta não tem permissão de acesso.");
        await supabase.auth.signOut();
        return;
      }
      navigate({ to: role === "operator" ? "/operacional" : "/admin" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login" ? "Entre com sua conta de administrador" : "Crie sua conta de administrador"}
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
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 text-sm text-primary hover:underline"
        >
          {mode === "login" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </Card>
    </div>
  );
}