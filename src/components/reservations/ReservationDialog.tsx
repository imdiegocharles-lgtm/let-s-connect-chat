import { useState } from "react";
import { Calendar as CalendarIcon, Users, Phone, MapPin, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Location = "varanda" | "salao" | "segundo_andar";

export function ReservationDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [name, setName] = useState("");
  const [people, setPeople] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<Location | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function reset() {
    setDate(undefined); setName(""); setPeople(""); setPhone(""); setLocation("");
    setSuccess(false);
  }

  async function submit() {
    const count = Number(people);
    if (!name.trim()) return toast.error("Informe o nome completo");
    if (!Number.isFinite(count) || count < 10) {
      return toast.error(
        "As reservas são destinadas exclusivamente para grupos com no mínimo 10 pessoas. Para grupos menores, o atendimento será realizado por ordem de chegada, sem necessidade de reserva.",
        { duration: 8000 },
      );
    }
    if (!phone.trim()) return toast.error("Informe o WhatsApp para contato");
    if (!location) return toast.error("Escolha o local da reserva");
    if (!date) return toast.error("Selecione uma data disponível");

    setSubmitting(true);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const { error } = await supabase.from("reservations" as any).insert({
      customer_name: name.trim(),
      phone: phone.trim(),
      people_count: count,
      location,
      reservation_date: iso,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setSuccess(true);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" /> Faça sua Reserva
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary text-2xl">✓</div>
            <p className="text-sm">
              Recebemos sua solicitação de reserva com sucesso! Em breve, nossa equipe analisará a disponibilidade e retornará pelo WhatsApp informado para confirmar todos os detalhes da sua reserva.
            </p>
            <Button onClick={() => setOpen(false)} className="mt-2">Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Reservas disponíveis apenas para grupos a partir de 10 pessoas. Sextas-feiras e domingos não estão disponíveis.
            </p>

            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={ptBR}
                disabled={(d) => {
                  const day = d.getDay();
                  return d < today || day === 0 || day === 5;
                }}
                initialFocus
                className="p-3 pointer-events-auto rounded-md border"
              />
            </div>

            {date && (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <Label>Nome completo *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Users className="h-3 w-3" /> Quantidade de pessoas * (mín. 10)</Label>
                  <Input type="number" min={10} value={people} onChange={(e) => setPeople(e.target.value)} placeholder="10" />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> WhatsApp para contato *</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(21) 99999-9999" />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Local da reserva *</Label>
                  <Select value={location} onValueChange={(v) => setLocation(v as Location)}>
                    <SelectTrigger><SelectValue placeholder="Escolha o local" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="varanda">Varanda</SelectItem>
                      <SelectItem value="salao">Salão</SelectItem>
                      <SelectItem value="segundo_andar">Segundo Andar (Ambiente fechado com ar-condicionado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-muted-foreground border-l-2 border-primary/50 pl-2">
                  Sua reserva permanecerá válida até às 19:30h. Após esse horário, ela será cancelada automaticamente.
                </p>

                <Button className="w-full" onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar Reserva
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}