import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { normalizeCouponCode } from "@/lib/coupons";

type Coupon = { id: string; code: string; percent: number; is_active: boolean };
const sb = supabase as any;
const noAuto = { autoCorrect: "off", autoCapitalize: "characters", spellCheck: false } as const;

export function CouponsPanel() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);

  const { data: coupons = [] } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await sb.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-coupons"] });

  const save = useMutation({
    mutationFn: async () => {
      const c = normalizeCouponCode(code);
      const p = Number(percent.replace(",", "."));
      if (!c) throw new Error("Informe a palavra do cupom.");
      if (!(p > 0 && p <= 100)) throw new Error("O desconto deve ser entre 1% e 100%.");
      const q = editId
        ? sb.from("coupons").update({ code: c, percent: p }).eq("id", editId)
        : sb.from("coupons").insert({ code: c, percent: p });
      const { error } = await q;
      if (error) throw new Error(error.code === "23505" ? "Já existe um cupom com essa palavra." : error.message);
    },
    onSuccess: () => {
      toast.success(editId ? "Cupom atualizado" : "Cupom criado");
      setCode(""); setPercent(""); setEditId(null); refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = async (c: Coupon) => {
    const { error } = await sb.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(!c.is_active ? "Cupom ativado" : "Cupom desativado");
    refresh();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await sb.from("coupons").delete().eq("id", toDelete.id);
    if (error) toast.error(error.message); else { toast.success("Cupom excluído"); refresh(); }
    setToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        <div className="grid gap-1">
          <Label>Palavra do cupom</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ex: NATAL10" maxLength={40} {...noAuto} />
        </div>
        <div className="grid gap-1">
          <Label>Desconto (%)</Label>
          <Input value={percent} onChange={(e) => setPercent(e.target.value)} inputMode="decimal" placeholder="10" autoCorrect="off" spellCheck={false} />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{editId ? "Salvar" : "Criar cupom"}</Button>
          {editId && <Button variant="outline" onClick={() => { setEditId(null); setCode(""); setPercent(""); }}>Cancelar</Button>}
        </div>
      </div>

      <div className="space-y-2">
        {coupons.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cupom criado.</p>}
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <div>
              <p className="font-black">{c.code}</p>
              <p className="text-sm text-muted-foreground">{Number(c.percent)}% de desconto · {c.is_active ? "Ativo" : "Desativado"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
              <Button size="icon" variant="ghost" onClick={() => { setEditId(c.id); setCode(c.code); setPercent(String(c.percent)); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setToDelete(c)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom {toDelete?.code}?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
