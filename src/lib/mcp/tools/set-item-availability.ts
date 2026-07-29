import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "set_item_availability",
  title: "Alterar disponibilidade de item",
  description: "Marca um item do cardápio como disponível ou indisponível.",
  inputSchema: {
    item_id: z.string().describe("ID do item do cardápio."),
    is_available: z.boolean().describe("true para disponível, false para esgotado."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ item_id, is_available }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;
    const { data, error } = await supabaseForUser(ctx)
      .from("menu_items")
      .update({ is_available })
      .eq("id", item_id)
      .select("id,name,is_available");
    if (error) return errorResult(error.message);
    if (!data?.length) return errorResult("Item não encontrado ou sem permissão.");
    return jsonResult(data[0]);
  },
});