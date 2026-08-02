import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type CustomerProfile = { full_name: string | null; phone: string | null };

/** Sessão do cliente (somente browser). */
export function useCustomerSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export async function fetchMyProfile(userId: string): Promise<CustomerProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", userId)
    .maybeSingle();
  return (data as CustomerProfile) ?? null;
}

export const ORDER_STATUS_STEPS = [
  { key: "received", label: "Pedido recebido", hint: "Chegou na nossa cozinha 🔥" },
  { key: "preparing", label: "Em preparo", hint: "Na brasa, feito na hora" },
  { key: "ready", label: "Saiu para entrega", hint: "O motoboy já está a caminho" },
  { key: "delivered", label: "Entregue", hint: "Bom apetite! 🍢" },
] as const;