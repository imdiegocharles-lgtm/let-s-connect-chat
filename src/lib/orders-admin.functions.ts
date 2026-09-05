import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Define/atualiza a senha exclusiva de exclusão de pedidos (somente admin). */
export const setDeletionPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ password: z.string().min(4, "A senha deve ter pelo menos 4 caracteres") }))
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (!role) throw new Error("Apenas administradores podem definir a senha de exclusão.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await sha256Hex(data.password);
    const { error } = await (supabaseAdmin as any)
      .from("system_settings")
      .update({ deletion_password_hash: hash })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { success: true };
  });

/** Informa se já existe uma senha de exclusão configurada. */
export const hasDeletionPassword = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("system_settings")
      .select("deletion_password_hash")
      .eq("id", 1)
      .maybeSingle();
    return { configured: !!data?.deletion_password_hash };
  });

async function assertStaff(supabase: any, userId: string) {
  const { data: role, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "operator"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível verificar seu acesso: ${error.message}`);
  if (!role) throw new Error("Acesso negado.");
}

async function assertDeletionPassword(password: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as any)
    .from("system_settings")
    .select("deletion_password_hash")
    .eq("id", 1)
    .maybeSingle();
  const stored = data?.deletion_password_hash as string | null | undefined;
  if (!stored) {
    throw new Error("Nenhuma senha administrativa foi configurada. Defina-a no painel administrativo.");
  }
  if ((await sha256Hex(password)) !== stored) throw new Error("Senha incorreta.");
}

/** Valida a senha administrativa (mesma usada na exclusão) para liberar o desconto. */
export const verifyDeletionPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ password: z.string().min(1, "Informe a senha") }))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    await assertDeletionPassword(data.password);
    return { valid: true };
  });

/** Aplica um desconto ao pedido; exige novamente a senha administrativa. */
export const applyOrderDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      orderId: z.string().uuid(),
      amount: z.number().min(0),
      reason: z.string().trim().max(200),
      password: z.string().min(1, "Informe a senha"),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    await assertDeletionPassword(data.password);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: oErr } = await (supabaseAdmin as any)
      .from("orders")
      .select("total")
      .eq("id", data.orderId)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Pedido não encontrado.");
    if (data.amount > Number(order.total)) {
      throw new Error("O desconto não pode ser maior que o total do pedido.");
    }
    if (data.amount > 0 && data.reason.length < 3) {
      throw new Error("Informe o motivo do desconto.");
    }

    const { error } = await (supabaseAdmin as any)
      .from("orders")
      .update({
        discount_amount: data.amount,
        discount_reason: data.amount > 0 ? data.reason : null,
        discount_authorized_by: data.amount > 0 ? context.userId : null,
        discount_authorized_at: data.amount > 0 ? new Date().toISOString() : null,
      })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { success: true };
  });


export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    orderId: z.string().uuid(),
    reason: z.string().trim().min(5, "O motivo deve ter pelo menos 5 caracteres"),
    password: z.string().min(1, "Informe a senha de exclusão"),
  }))
  .handler(async ({ data, context }) => {
    const { data: role, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "operator"])
      .limit(1)
      .maybeSingle();

    if (roleError) throw new Error(`Não foi possível verificar seu acesso: ${roleError.message}`);
    if (!role) {
      throw new Error("Acesso negado. Apenas administradores ou operadores podem excluir pedidos.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings } = await (supabaseAdmin as any)
      .from("system_settings")
      .select("deletion_password_hash")
      .eq("id", 1)
      .maybeSingle();

    const stored = settings?.deletion_password_hash as string | null | undefined;
    if (!stored) {
      throw new Error("Nenhuma senha de exclusão foi configurada. Defina-a no painel administrativo.");
    }
    if ((await sha256Hex(data.password)) !== stored) {
      throw new Error("Senha de exclusão incorreta.");
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        deleted_at: new Date().toISOString(),
        deletion_reason: data.reason,
      })
      .eq("id", data.orderId);

    if (error) throw new Error("Erro ao excluir pedido: " + error.message);

    return { success: true };
  });
