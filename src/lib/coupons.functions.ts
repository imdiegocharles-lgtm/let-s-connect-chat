import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeCouponCode } from "./coupons";

/** Verifica se um cupom existe e está ativo. Retorna só o necessário. */
export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string().trim().min(1).max(40) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = normalizeCouponCode(data.code);
    const { data: c } = await (supabaseAdmin as any)
      .from("coupons")
      .select("code, percent, is_active")
      .ilike("code", code)
      .maybeSingle();
    if (!c || !c.is_active) return { valid: false as const, code, percent: 0 };
    return { valid: true as const, code: String(c.code).toUpperCase(), percent: Number(c.percent) };
  });
