import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "operator";

/** Reads the roles of the currently signed-in user (own rows only, enforced by RLS). */
export async function getMyRoles(): Promise<AppRole[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id);
  if (error) return [];
  return (data ?? []).map((r) => r.role as AppRole);
}

export async function hasMyRole(role: AppRole): Promise<boolean> {
  return (await getMyRoles()).includes(role);
}
