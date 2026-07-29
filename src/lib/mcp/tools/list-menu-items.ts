import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_menu_items",
  title: "Listar itens do cardápio",
  description: "Lista os itens do cardápio com preço, categoria e disponibilidade.",
  inputSchema: {
    only_unavailable: z.boolean().optional().describe("Se verdadeiro, retorna apenas itens indisponíveis."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ only_unavailable }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;
    let query = supabaseForUser(ctx)
      .from("menu_items")
      .select("id,name,description,price,is_available,category_id")
      .order("name");
    if (only_unavailable) query = query.eq("is_available", false);
    const { data, error } = await query;
    return error ? errorResult(error.message) : jsonResult(data);
  },
});