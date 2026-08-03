import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, useCart } from "@/lib/cart";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Minus, Plus, Trash2, CheckCircle2, CalendarX2 } from "lucide-react";
import { getStoreStatus, useHorarios } from "@/lib/store-hours";
import { createGuestOrder } from "@/lib/orders.functions";

type Neighborhood = { id: string; name: string; fee: number };

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "credito", label: "Cartão de Crédito" },
  { value: "debito", label: "Cartão de Débito" },
  { value: "sodexo", label: "Vale-refeição Sodexo" },
  { value: "alelo", label: "Vale-refeição Alelo" },
  { value: "pix", label: "Pix (na entrega)" },
];

export function CartSheet() {
  const { items, inc, dec, remove, subtotal, clear, sheetOpen, setSheetOpen } = useCart();
  const [step, setStep] = useState<"cart" | "checkout" | "done">("cart");
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const { data: horarios = [] } = useHorarios();
  const store = getStoreStatus(horarios);
  const deliveryBlocked = horarios.length > 0 && !store.deliveryToday;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhoodId, setNeighborhoodId] = useState<string>("");
  const [payment, setPayment] = useState<string>("");
  const [changeFor, setChangeFor] = useState<string>("");
  const [needsChange, setNeedsChange] = useState<"sim" | "nao">("nao");
  const [notes, setNotes] = useState("");

  const { data: neighborhoods = [] } = useQuery({
    queryKey: ["neighborhoods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neighborhoods")
        .select("id, name, fee")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Neighborhood[];
    },
  });

  const neighborhood = neighborhoods.find((n) => n.id === neighborhoodId);
  const deliveryFee = Number(neighborhood?.fee ?? 0);
  const total = subtotal + deliveryFee;

  const paymentLabel = useMemo(
    () => PAYMENT_METHODS.find((p) => p.value === payment)?.label ?? "",
    [payment],
  );

  const submit = useMutation({
    mutationFn: async () => {
      if (deliveryBlocked)
        throw new Error(`Não fazemos delivery ${store.todayLabel.toLowerCase()}. Atendimento somente presencial hoje.`);
      if (!name.trim()) throw new Error("Preencha seu nome.");
      if (!phone.trim()) throw new Error("Informe seu telefone/WhatsApp.");
      if (!address.trim()) throw new Error("Informe o endereço com número.");
      if (!neighborhoodId) throw new Error("Selecione o bairro.");
      if (!payment) throw new Error("Selecione a forma de pagamento.");
      if (!notes.trim()) throw new Error("Preencha as observações e ponto de referência.");
      if (payment === "dinheiro" && needsChange === "sim" && Number(changeFor) <= total)
        throw new Error("O troco deve ser maior que o total.");

      const paymentNote =
        payment === "dinheiro"
          ? needsChange === "sim"
            ? `Dinheiro · Troco para ${formatBRL(Number(changeFor))}`
            : "Dinheiro · Sem troco"
          : paymentLabel;

      const combinedNotes = [notes.trim(), `Pagamento: ${paymentNote}`]
        .filter(Boolean)
        .join(" | ");

      const res = await createGuestOrder({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          neighborhoodId,
          paymentMethod: payment as never,
          changeFor: payment === "dinheiro" && needsChange === "sim" ? Number(changeFor) : null,
          notes: combinedNotes || null,
          items: items.map((i) => ({
            menuItemId: (i.menuItemId ?? i.id.split(":")[0]) as string,
            name: i.name,
            quantity: i.quantity,
          })),
        },
      });

      return res.orderNumber;
    },
    onSuccess: (num) => {
      setOrderNumber(num);
      setStep("done");
      clear();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = () => {
    setStep("cart");
    setOrderNumber(null);
    setSheetOpen(false);
  };

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(v) => {
        setSheetOpen(v);
        if (!v) setTimeout(() => setStep("cart"), 300);
      }}
    >
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle>
            {step === "cart" && "Seu pedido"}
            {step === "checkout" && "Finalizar pedido"}
            {step === "done" && "Pedido enviado!"}
          </SheetTitle>
        </SheetHeader>

        {step === "cart" && (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {deliveryBlocked && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <CalendarX2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p>
                    <b>Sem delivery {store.todayLabel.toLowerCase()}.</b> Hoje o atendimento é somente
                    presencial na loja. Te esperamos lá! 🍢
                  </p>
                </div>
              )}
              {items.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Seu carrinho está vazio. Explore o cardápio 🍢
                </p>
              ) : (
                <ul className="space-y-3">
                  {items.map((i) => (
                    <li key={i.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                      <div className="flex-1">
                        <p className="font-semibold">{i.name}</p>
                        <p className="text-sm text-muted-foreground">{formatBRL(i.price)}</p>
                        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border">
                          <button onClick={() => dec(i.id)} className="grid h-8 w-8 place-items-center">
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-6 text-center text-sm font-bold">{i.quantity}</span>
                          <button onClick={() => inc(i.id)} className="grid h-8 w-8 place-items-center">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatBRL(i.price * i.quantity)}</p>
                        <button
                          onClick={() => remove(i.id)}
                          className="mt-2 text-muted-foreground hover:text-destructive"
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-border p-4">
              <div className="mb-3 flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-bold">{formatBRL(subtotal)}</span>
              </div>
              <Button
                className="w-full"
                size="lg"
                disabled={items.length === 0 || deliveryBlocked}
                onClick={() => setStep("checkout")}
              >
                {deliveryBlocked ? "Delivery indisponível hoje" : "Continuar"}
              </Button>
            </div>
          </>
        )}

        {step === "checkout" && (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">WhatsApp / Telefone *</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(21) 9 0000-0000"
                  maxLength={20}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Endereço com número (rua, número, complemento) *</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder="Ex: Rua das Flores, 123 - apto 2"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Bairro *</Label>
                <Select value={neighborhoodId} onValueChange={setNeighborhoodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o bairro" />
                  </SelectTrigger>
                  <SelectContent>
                    {neighborhoods.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name} — {formatBRL(n.fee)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Forma de pagamento *</Label>
                <Select value={payment} onValueChange={setPayment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {payment === "dinheiro" && (
                <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-3">
                  <Label>Precisa de troco?</Label>
                  <RadioGroup
                    value={needsChange}
                    onValueChange={(v) => setNeedsChange(v as "sim" | "nao")}
                    className="flex gap-4"
                  >
                    <label className="flex cursor-pointer items-center gap-2">
                      <RadioGroupItem value="nao" /> Não
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <RadioGroupItem value="sim" /> Sim
                    </label>
                  </RadioGroup>
                  {needsChange === "sim" && (
                    <div className="grid gap-1">
                      <Label htmlFor="change">Troco para quanto?</Label>
                      <Input
                        id="change"
                        type="number"
                        step="0.01"
                        min={0}
                        value={changeFor}
                        onChange={(e) => setChangeFor(e.target.value)}
                        placeholder="Ex: 100"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="notes">Observações e Ponto de Referência *</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={400}
                  rows={2}
                  placeholder="Ex: sem cebola, próximo à padaria…"
                  required
                />
              </div>

              <div className="space-y-1 rounded-lg border border-border bg-card p-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatBRL(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa de entrega</span>
                  <span>{formatBRL(deliveryFee)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-black">
                  <span>Total</span>
                  <span className="text-primary">{formatBRL(total)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 border-t border-border p-4">
              <Button variant="outline" onClick={() => setStep("cart")}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={submit.isPending}
                onClick={() => submit.mutate()}
              >
                {submit.isPending ? "Enviando…" : `Confirmar pedido · ${formatBRL(total)}`}
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-primary" />
            <h3 className="text-xl font-black">Pedido recebido!</h3>
            <p className="text-sm text-muted-foreground">
              Seu pedido foi enviado para a cozinha. Tempo estimado: <b>30 a 45 minutos</b>.
            </p>
            {orderNumber != null && (
              <p className="text-xs text-muted-foreground">
                Nº do pedido: <span className="font-mono font-bold">#{orderNumber}</span>
              </p>
            )}
            <Button className="mt-2 w-full" onClick={reset}>
              Fechar
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}