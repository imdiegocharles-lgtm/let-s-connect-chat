import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(8).max(30),
  street: z.string().trim().min(1).max(300),
  number: z.string().trim().min(1).max(50),
  neighborhoodId: z.string().uuid(),
  paymentMethod: z.enum(["dinheiro", "credito", "debito", "sodexo", "alelo", "pix"]),
  changeFor: z.number().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        name: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(100),
        extras: z.record(z.string(), z.any()).nullable().optional(),
      }),
    )
    .min(1)
    .max(60),
});

/** Cria um pedido de convidado (sem login). Preços e taxas vêm do banco. */
export const createGuestOrder = createServerFn({ method: "POST" })
  .inputValidator(schema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    // Check if there is an open shift
    const { data: openShift, error: sErr } = await sb
      .from("shifts")
      .select("id, shift_type")
      .is("closed_at", null)
      .limit(1)
      .maybeSingle();
    
    if (sErr) throw new Error("Erro ao verificar turno: " + sErr.message);
    if (!openShift) throw new Error("Estamos fechados no momento. Por favor, tente fazer seu pedido mais tarde, quando estivermos online.");


    const { data: hood, error: hErr } = await sb
      .from("neighborhoods")
      .select("name, fee_almoco, fee_noite")
      .eq("id", data.neighborhoodId)
      .maybeSingle();
    if (hErr) throw new Error(hErr.message);
    if (!hood) throw new Error("Bairro inválido.");

    const ids = [...new Set(data.items.map((i) => i.menuItemId))];
    const { data: menuItems, error: mErr } = await sb
      .from("menu_items")
      .select("id, price, is_available")
      .in("id", ids);
    if (mErr) throw new Error(mErr.message);

    const byId = new Map<string, { price: number; is_available: boolean }>(
      (menuItems ?? []).map((m: any) => [m.id, { price: Number(m.price), is_available: m.is_available }]),
    );

    let subtotal = 0;
    const itemsPayload = data.items.map((i) => {
      const mi = byId.get(i.menuItemId);
      if (!mi) throw new Error("Item do cardápio não encontrado.");
      if (!mi.is_available) throw new Error(`"${i.name}" está indisponível no momento.`);
      subtotal += mi.price * i.quantity;
      return { 
        menu_item_id: i.menuItemId, 
        name: i.name, 
        price: mi.price, 
        quantity: i.quantity,
        extras: i.extras || null
      };
    });

    const deliveryFee = Number(hood.fee ?? 0);
    const total = subtotal + deliveryFee;

    const { data: order, error: oErr } = await sb
      .from("orders")
      .insert({
        user_id: null,
        customer_name: data.name,
        customer_phone: data.phone,
        customer_address: `${data.street}, ${data.number}`,
        customer_street: data.street,
        customer_number: data.number,
        delivery_type: "delivery",
        neighborhood: hood.name,
        delivery_fee: deliveryFee,
        subtotal,
        total,
        payment_method: data.paymentMethod,
        change_for: data.paymentMethod === "dinheiro" ? (data.changeFor ?? null) : null,
        notes: data.notes || null,
        status: "received",
      })
      .select("id, order_number")
      .single();
    if (oErr) throw new Error(oErr.message);

    const { error: iErr } = await sb
      .from("order_items")
      .insert(itemsPayload.map((i) => ({ ...i, order_id: order.id })));
    if (iErr) throw new Error(iErr.message);

    return { orderNumber: order.order_number as number, total, deliveryFee, subtotal };
  });