import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_reservations",
  title: "Listar reservas",
  description: "Lista as reservas do restaurante, opcionalmente filtradas por status.",
  inputSchema: {
    status: z.enum(["pendente", "confirmada", "cancelada"]).optional().describe("Filtra pelo status da reserva."),
    limit: z.number().optional().describe("Quantidade máxima de reservas (padrão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;
    const max = Math.min(Math.max(Math.trunc(limit ?? 20), 1), 100);
    let query = supabaseForUser(ctx)
      .from("reservations")
      .select("*")
      .order("reservation_date", { ascending: true })
      .limit(max);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    return error ? errorResult(error.message) : jsonResult(data);
  },
});