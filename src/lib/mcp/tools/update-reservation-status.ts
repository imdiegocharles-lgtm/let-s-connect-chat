import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_reservation_status",
  title: "Atualizar status da reserva",
  description: "Confirma, cancela ou volta uma reserva para pendente.",
  inputSchema: {
    reservation_id: z.string().describe("ID da reserva."),
    status: z.enum(["pendente", "confirmada", "cancelada"]).describe("Novo status da reserva."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ reservation_id, status }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;
    const { data, error } = await supabaseForUser(ctx)
      .from("reservations")
      .update({ status })
      .eq("id", reservation_id)
      .select("id,customer_name,reservation_date,status");
    if (error) return errorResult(error.message);
    if (!data?.length) return errorResult("Reserva não encontrada ou sem permissão.");
    return jsonResult(data[0]);
  },
});