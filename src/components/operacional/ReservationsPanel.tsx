import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

/* --------------------------- RESERVATIONS --------------------------- */

const LOCATION_LABELS: Record<string, string> = {
  varanda: "Varanda",
  salao: "Salão",
  segundo_andar: "Segundo Andar (AC)",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pendente: { label: "🟡 Pendente", className: "bg-yellow-100 text-yellow-800" },
  confirmada: { label: "🟢 Confirmada", className: "bg-green-100 text-green-800" },
  cancelada: { label: "🔴 Cancelada", className: "bg-red-100 text-red-800" },
};

export function ReservationsPanel({ agentUrl }: { agentUrl: string }) {
  const qc = useQueryClient();
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["kitchen-reservations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (v: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("reservations").update({ status: v.status }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["kitchen-reservations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("reservations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reserva excluída");
      qc.invalidateQueries({ queryKey: ["kitchen-reservations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (data ?? []).filter((r: any) => {
    if (searchName && !r.customer_name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (searchPhone && !r.phone.includes(searchPhone)) return false;
    if (filterDate && r.reservation_date !== filterDate) return false;
    return true;
  });

  const printReservation = async (r: any) => {
    try {
      const { sendReservationToLocalPrinter } = await import("@/lib/receipt");
      await sendReservationToLocalPrinter(agentUrl, r);
      toast.success("Reserva enviada para impressora");
    } catch (e: any) {
      toast.error(`Falha ao imprimir: ${e.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Buscar por nome</Label>
          <Input value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="Nome do cliente" autoCapitalize="none" autoCorrect="off" spellCheck="false" />
        </div>
        <div>
          <Label>Buscar por telefone</Label>
          <Input value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} placeholder="Telefone" autoCapitalize="none" autoCorrect="off" spellCheck="false" />
        </div>
        <div>
          <Label>Filtrar por data</Label>
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
      </Card>

      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : isError ? (
        <p role="alert" className="text-sm text-destructive">Não foi possível carregar as reservas.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r: any) => {
            const s = STATUS_LABELS[r.status] ?? STATUS_LABELS.pendente;
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.customer_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>{s.label}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      📞 {r.phone} · 👥 {r.people_count} pessoas · 📍 {LOCATION_LABELS[r.location] ?? r.location}
                    </div>
                    <div className="text-sm">
                      📅 <strong>Data da reserva:</strong>{" "}
                      {new Date(r.reservation_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Solicitado em {new Date(r.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => printReservation(r)}>
                      🖨️ Imprimir
                    </Button>
                    <Select value={r.status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">🟡 Pendente</SelectItem>
                        <SelectItem value="confirmada">🟢 Confirmada</SelectItem>
                        <SelectItem value="cancelada">🔴 Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive" aria-label={`Excluir reserva de ${r.customer_name}`}><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir reserva de {r.customer_name}?</AlertDialogTitle>
                          <AlertDialogDescription>O local ficará disponível para outra reserva nesta data. Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del.mutate(r.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma reserva encontrada.</p>
          )}
        </div>
      )}
    </div>
  );
}

