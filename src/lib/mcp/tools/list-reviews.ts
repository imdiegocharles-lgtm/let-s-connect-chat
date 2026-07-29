import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_reviews",
  title: "Listar avaliações",
  description: "Lista as avaliações anônimas recebidas pelo restaurante.",
  inputSchema: {
    limit: z.number().optional().describe("Quantidade máxima de avaliações (padrão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;
    const max = Math.min(Math.max(Math.trunc(limit ?? 20), 1), 100);
    const { data, error } = await supabaseForUser(ctx)
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(max);
    return error ? errorResult(error.message) : jsonResult(data);
  },
});