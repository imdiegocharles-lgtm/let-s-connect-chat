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
