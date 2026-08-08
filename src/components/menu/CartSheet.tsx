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
import { useAvisoLoja, DEFAULT_AVISO } from "@/lib/store-hours";

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
  const { data: aviso } = useAvisoLoja();
  const store = getStoreStatus(horarios);
  const deliveryBlocked = horarios.length > 0 && !store.deliveryToday;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhoodId, setNeighborhoodId] = useState<string>("");
  const [payment, setPayment] = useState<string>("");
  const [changeFor, setChangeFor] = useState<string>("");
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
      if (store.openService === null)
        throw new Error("Não é possível realizar pedidos com a loja fechada.");
      if (deliveryBlocked)
        throw new Error(`Não fazemos delivery ${store.todayLabel.toLowerCase()}. Atendimento somente presencial hoje.`);
      if (!name.trim()) throw new Error("Preencha seu nome.");
      if (!phone.trim()) throw new Error("Informe seu telefone/WhatsApp.");
      if (!street.trim()) throw new Error("Informe o endereço.");
      if (!number.trim()) throw new Error("Informe o número da residência.");
      if (!neighborhoodId) throw new Error("Selecione o bairro.");
      if (!payment) throw new Error("Selecione a forma de pagamento.");
      if (!notes.trim()) throw new Error("Preencha as observações e ponto de referência.");
      if (payment === "dinheiro") {
        if (!changeFor) throw new Error("Informe quanto o cliente irá pagar.");
        if (Number(changeFor) < total) throw new Error("VALOR INSUFICIENTE. O valor deve ser igual ou maior que o total.");
      }

      const paymentNote =
        payment === "dinheiro"
          ? Number(changeFor) > total
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
          street: street.trim(),
          number: number.trim(),
          neighborhoodId,
          paymentMethod: payment as never,
          changeFor: payment === "dinheiro" ? Number(changeFor) : null,
          notes: combinedNotes || null,
          items: items.map((i) => ({
            menuItemId: (i.menuItemId ?? i.id.split(":")[0]) as string,
            name: i.name,
            quantity: i.quantity,
            extras: i.extras || null,
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
                disabled={items.length === 0 || deliveryBlocked || store.openService === null}
                onClick={() => setStep("checkout")}
              >
                {store.openService === null ? "Loja fechada" : deliveryBlocked ? "Delivery indisponível hoje" : "Continuar"}
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

              <div className="grid grid-cols-[1fr,80px] gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="street">Endereço *</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    maxLength={150}
                    placeholder="Ex: Rua das Flores"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="number">Número *</Label>
                  <Input
                    id="number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    maxLength={20}
                    placeholder="123"
                    required
                  />
                </div>
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
                  <div className="grid gap-1">
                    <Label htmlFor="change">CLIENTE PAGA COM *</Label>
                    <Input
                      id="change"
                      type="number"
                      step="0.01"
                      min={0}
                      value={changeFor}
                      onChange={(e) => setChangeFor(e.target.value)}
                      placeholder="Ex: 200,00"
                      className="font-bold text-lg"
                      required
                    />
                    {changeFor && Number(changeFor) > total && (
                      <p className="text-sm font-bold text-primary mt-1">
                        TROCO: {formatBRL(Number(changeFor) - total)}
                      </p>
                    )}
                    {changeFor && Number(changeFor) < total && (
                      <p className="text-sm font-bold text-destructive mt-1">
                        VALOR INSUFICIENTE
                      </p>
                    )}
                  </div>
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
            <h3 className="text-xl font-black">{aviso?.order_confirmation_message || DEFAULT_AVISO.order_confirmation_message}</h3>
            <p className="text-sm text-muted-foreground">
              Tempo estimado: <b>{aviso?.order_estimated_time || DEFAULT_AVISO.order_estimated_time}</b>
            </p>
            <Button className="mt-2 w-full" onClick={reset}>
              Fechar
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}