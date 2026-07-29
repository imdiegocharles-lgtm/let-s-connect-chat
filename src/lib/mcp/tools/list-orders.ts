import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_orders",
  title: "Listar pedidos",
  description: "Lista os pedidos mais recentes do delivery, opcionalmente filtrados por status.",
  inputSchema: {
    status: z.string().optional().describe("Filtra por status do pedido (ex.: pendente, preparando, entregue)."),
    limit: z.number().optional().describe("Quantidade máxima de pedidos a retornar (padrão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;
    const max = Math.min(Math.max(Math.trunc(limit ?? 20), 1), 100);
    let query = supabaseForUser(ctx)
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(max);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    return error ? errorResult(error.message) : jsonResult(data);
  },
});