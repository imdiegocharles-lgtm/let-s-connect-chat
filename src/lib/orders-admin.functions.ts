import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    orderId: z.string().uuid(),
    reason: z.string().trim().min(5, "O motivo deve ter pelo menos 5 caracteres"),
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
