import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hasMyRole } from "./roles";

const deleteOrderSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(5, "O motivo deve ter pelo menos 5 caracteres"),
});

export const deleteOrder = createServerFn({ method: "POST" })
  .inputValidator(deleteOrderSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    // Check permissions
    const isAdmin = await hasMyRole("admin");
    const isOperator = await hasMyRole("operator");
    
    if (!isAdmin && !isOperator) {
      throw new Error("Acesso negado. Apenas administradores ou operadores podem excluir pedidos.");
    }

    const { error } = await sb
      .from("orders")
      .update({
        deleted_at: new Date().toISOString(),
        deletion_reason: data.reason,
      })
      .eq("id", data.orderId);

    if (error) throw new Error("Erro ao excluir pedido: " + error.message);

    return { success: true };
  });
