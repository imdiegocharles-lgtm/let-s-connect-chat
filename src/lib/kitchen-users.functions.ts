import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Perms = {
  can_open_close_shift: boolean;
  can_confirm_payment: boolean;
  can_manage_menu: boolean;
  can_update_order_status: boolean;
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado");
}

export const listKitchenUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "operator");
    if (rErr) throw new Error(rErr.message);

    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) return [] as any[];

    const { data: perms } = await supabaseAdmin
      .from("kitchen_permissions")
      .select("*")
      .in("user_id", ids);
    const permMap = new Map((perms ?? []).map((p: any) => [p.user_id, p]));

    const users = await Promise.all(
      ids.map(async (id: string) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        return {
          id,
          email: data.user?.email ?? "",
          created_at: data.user?.created_at ?? null,
          permissions:
            permMap.get(id) ?? {
              can_open_close_shift: true,
              can_confirm_payment: true,
              can_manage_menu: true,
              can_update_order_status: true,
            },
        };
      }),
    );
    return users;
  });

export const createKitchenUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      password: string;
      permissions: Perms;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "operator" });
    if (rErr) throw new Error(rErr.message);

    const { error: pErr } = await supabaseAdmin
      .from("kitchen_permissions")
      .insert({ user_id: uid, ...data.permissions });
    if (pErr) throw new Error(pErr.message);

    return { id: uid };
  });

export const updateKitchenPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; permissions: Perms }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("kitchen_permissions")
      .upsert({ user_id: data.user_id, ...data.permissions });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteKitchenUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateKitchenPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; password: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });