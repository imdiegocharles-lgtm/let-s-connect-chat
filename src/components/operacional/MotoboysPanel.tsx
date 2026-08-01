import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Bike } from "lucide-react";

type Motoboy = { id: string; name: string; daily_rate: number; is_active: boolean };

export function MotoboysPanel({ activeShiftId }: { activeShiftId?: string | null }) {
  const qc = useQueryClient();

  const { data: motoboys, isLoading } = useQuery({
    queryKey: ["motoboys"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("motoboys").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Motoboy[];
    },
  });

  const { data: scale } = useQuery({
    queryKey: ["shift-motoboys", activeShiftId],
    enabled: !!activeShiftId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shift_motoboys")
        .select("id, motoboy_id")
        .eq("shift_id", activeShiftId);
      if (error) throw error;
      return (data ?? []) as { id: string; motoboy_id: string }[];
    },
  });

  const { data: deliveries } = useQuery({
    queryKey: ["shift-motoboy-deliveries", activeShiftId],
    enabled: !!activeShiftId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("motoboy_id")
        .eq("shift_id", activeShiftId)
        .not("motoboy_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const o of data ?? []) counts[o.motoboy_id] = (counts[o.motoboy_id] ?? 0) + 1;
      return counts;
    },
  });

  const toggleScale = useMutation({
    mutationFn: async ({ motoboyId, on }: { motoboyId: string; on: boolean }) => {
      if (!activeShiftId) throw new Error("Nenhum turno aberto");
      if (on) {
        const { error } = await (supabase as any)
          .from("shift_motoboys")
          .insert({ shift_id: activeShiftId, motoboy_id: motoboyId });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("shift_motoboys")
          .delete()
          .eq("shift_id", activeShiftId)
          .eq("motoboy_id", motoboyId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shift-motoboys", activeShiftId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const scaled = new Set((scale ?? []).map((s) => s.motoboy_id));
  const totalDiarias = (motoboys ?? [])
    .filter((m) => scaled.has(m.id))
    .reduce((s, m) => s + Number(m.daily_rate ?? 0), 0);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bike className="h-5 w-5 text-primary" /> Motoboys
          </h2>
          <p className="text-xs text-muted-foreground">
            {activeShiftId
              ? `Escalados no turno: diárias de R$ ${totalDiarias.toFixed(2).replace(".", ",")}`
              : "Abra um turno para escalar os motoboys do dia."}
          </p>
        </div>
        <MotoboyDialog trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo motoboy</Button>} />
      </div>

      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <div className="grid gap-2">
          {(motoboys ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum motoboy cadastrado ainda.</p>
          )}
          {(motoboys ?? []).map((m) => (
            <Card key={m.id} className="p-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {m.name}
                  {!m.is_active && <Badge variant="outline">inativo</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  Diária: R$ {Number(m.daily_rate).toFixed(2).replace(".", ",")}
                  {activeShiftId ? ` • ${deliveries?.[m.id] ?? 0} entregas neste turno` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {activeShiftId && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">No turno</Label>
                    <Switch
                      checked={scaled.has(m.id)}
                      onCheckedChange={(v) => toggleScale.mutate({ motoboyId: m.id, on: v })}
                    />
                  </div>
                )}
                <MotoboyDialog
                  motoboy={m}
                  trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MotoboyDialog({ motoboy, trigger }: { motoboy?: Motoboy; trigger: React.ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(motoboy?.name ?? "");
  const [rate, setRate] = useState(motoboy?.daily_rate?.toString() ?? "");
  const [active, setActive] = useState(motoboy?.is_active ?? true);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        daily_rate: Number(rate.replace(",", ".")) || 0,
        is_active: active,
      };
      if (motoboy) {
        const { error } = await (supabase as any).from("motoboys").update(payload).eq("id", motoboy.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("motoboys").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Motoboy salvo");
      qc.invalidateQueries({ queryKey: ["motoboys"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setName(motoboy?.name ?? "");
          setRate(motoboy?.daily_rate?.toString() ?? "");
          setActive(motoboy?.is_active ?? true);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{motoboy ? "Editar motoboy" : "Novo motoboy"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <Label>Diária (R$)</Label>
            <Input inputMode="decimal" placeholder="0,00" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            <Label>Ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}