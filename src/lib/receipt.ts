import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;

const COMMANDS = {
  init: [0x1b, 0x40],
  lf: [0x0a],
  center: [0x1b, 0x61, 0x01],
  left: [0x1b, 0x61, 0x00],
  boldOn: [0x1b, 0x45, 0x01],
  boldOff: [0x1b, 0x45, 0x00],
  doubleWidth: [0x1b, 0x21, 0x20],
  normal: [0x1b, 0x21, 0x00],
  cut: [0x1d, 0x56, 0x42, 0x00],
  beep: [0x1b, 0x42, 0x03, 0x01],
};

function encode(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 128) {
      bytes.push(code);
    } else {
      // UTF-8 encode
      const utf8 = encodeURIComponent(str[i]);
      const parts = utf8.slice(1).split("%");
      for (const p of parts) {
        if (p) bytes.push(parseInt(p, 16));
      }
    }
  }
  return bytes;
}

function line(text = ""): number[] {
  return encode(text).concat(COMMANDS.lf);
}

function padLine(left: string, right: string, width = 48): string {
  const dots = Math.max(0, width - left.length - right.length);
  return left + ".".repeat(dots) + right;
}

function formatMoney(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  credito: "Cartão de Crédito",
  debito: "Cartão de Débito",
  sodexo: "Vale-refeição Sodexo",
  alelo: "Vale-refeição Alelo",
  pix: "Pix (na entrega)",
};

export function buildReceiptBytes(order: Order, items: OrderItem[]): Uint8Array {
  const out: number[] = [];

  out.push(...COMMANDS.init);
  out.push(...COMMANDS.center);
  out.push(...COMMANDS.boldOn);
  out.push(...COMMANDS.doubleWidth);
  out.push(...line("FAMILIA AMARAL"));
  out.push(...COMMANDS.normal);
  out.push(...COMMANDS.boldOff);
  out.push(...line("Churrasquinho & Restaurante"));
  out.push(...line("------------------------------"));
  out.push(...COMMANDS.left);

  out.push(...COMMANDS.boldOn);
  out.push(...line(`PEDIDO #${String(order.order_number).padStart(4, "0")}`));
  out.push(...COMMANDS.boldOff);
  out.push(...line(`Data: ${formatDate(order.created_at)}`));
  out.push(...line(""));

  out.push(...COMMANDS.boldOn);
  out.push(...line("CLIENTE"));
  out.push(...COMMANDS.boldOff);
  out.push(...line(order.customer_name));
  out.push(...line(order.customer_phone));
  if (order.delivery_type === "delivery") {
    out.push(...line(order.customer_address ?? ""));
    out.push(...line(`Bairro: ${order.neighborhood ?? ""}`));
  } else {
    out.push(...line("RETIRADA NO LOCAL"));
  }
  out.push(...line(""));

  out.push(...COMMANDS.boldOn);
  out.push(...line("ITENS"));
  out.push(...COMMANDS.boldOff);
  for (const item of items) {
    const qty = `${item.quantity}x `;
    const name = item.name;
    const total = formatMoney(item.price * item.quantity);
    const left = qty + name;
    out.push(...line(padLine(left, total, 48)));
  }
  out.push(...line("------------------------------"));

  out.push(...line(padLine("Subtotal", formatMoney(order.subtotal), 48)));
  if (order.delivery_type === "delivery") {
    out.push(...line(padLine("Taxa de entrega", formatMoney(order.delivery_fee), 48)));
  }
  out.push(...COMMANDS.boldOn);
  out.push(...line(padLine("TOTAL", formatMoney(order.total), 48)));
  out.push(...COMMANDS.boldOff);
  out.push(...line(""));

  out.push(...COMMANDS.boldOn);
  out.push(...line("PAGAMENTO"));
  out.push(...COMMANDS.boldOff);
  out.push(...line(PAYMENT_LABELS[order.payment_method ?? ""] ?? order.payment_method ?? "-"));
  if (order.payment_method === "dinheiro" && order.change_for) {
    out.push(...line(`Troco para: ${formatMoney(order.change_for)}`));
  }
  out.push(...line(""));

  if (order.notes) {
    out.push(...COMMANDS.boldOn);
    out.push(...line("OBSERVACOES"));
    out.push(...COMMANDS.boldOff);
    out.push(...line(order.notes));
    out.push(...line(""));
  }

  out.push(...COMMANDS.center);
  out.push(...line("Obrigado pela preferencia!"));
  out.push(...line("Familia Amaral"));
  out.push(...line(""));
  out.push(...line(""));
  out.push(...COMMANDS.cut);

  return new Uint8Array(out);
}

export function receiptToBase64(order: Order, items: OrderItem[]): string {
  const bytes = buildReceiptBytes(order, items);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function sendToLocalPrinter(
  agentUrl: string,
  order: Order,
  items: OrderItem[],
): Promise<void> {
  const bytes = buildReceiptBytes(order, items);

  const res = await fetch(agentUrl, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: bytes.buffer,
  });

  if (!res.ok) {
    throw new Error(`Erro ${res.status}: ${await res.text().catch(() => "desconhecido")}`);
  }
}
