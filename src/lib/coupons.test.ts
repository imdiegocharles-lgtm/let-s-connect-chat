import { describe, it, expect } from "vitest";
import { couponDiscount, normalizeCouponCode } from "./coupons";

describe("cupom", () => {
  it("10% sobre R$ 50 dá R$ 5", () => {
    expect(couponDiscount(50, 10)).toBe(5);
  });
  it("nunca passa de 100%", () => {
    expect(couponDiscount(40, 150)).toBe(40);
  });
  it("maiúsculas/minúsculas não importam", () => {
    expect(normalizeCouponCode(" natal10 ")).toBe("NATAL10");
  });
});
