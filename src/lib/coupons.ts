/** Valor do desconto de um cupom percentual sobre o total do pedido (itens + entrega). */
export function couponDiscount(total: number, percent: number): number {
  if (!(total > 0) || !(percent > 0)) return 0;
  const p = Math.min(percent, 100);
  return Math.round(total * p) / 100;
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export type CouponLine = {
  order_number: number;
  customer_name: string;
  coupon_code: string;
  discount: number;
};
