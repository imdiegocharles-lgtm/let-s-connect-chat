import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "operator";

/**
 * Reads the roles of the currently signed-in user (own rows only, enforced by RLS).
 * Retries once on network/backend failure and throws if it still fails, so callers
 * can show "tente novamente" instead of treating an admin as "sem permissão".
 */
export async function getMyRoles(): Promise<AppRole[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.role as AppRole);
    } catch (err) {
      lastError = err;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
    }
  }
  throw new Error(
    lastError instanceof Error
      ? `Não foi possível verificar seu acesso: ${lastError.message}`
      : "Não foi possível verificar seu acesso.",
  );
}

export async function hasMyRole(role: AppRole): Promise<boolean> {
  return (await getMyRoles()).includes(role);
}
