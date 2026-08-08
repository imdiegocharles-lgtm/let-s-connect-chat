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
  selectCP860: [0x1b, 0x74, 0x03], // Command to select CP860 on most ESC/POS printers
};

const CP860_MAP: Record<string, number> = {
  'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ã': 0x84, 'à': 0x85,
  'Á': 0x86, 'ç': 0x87, 'ê': 0x88, 'Ê': 0x89, 'è': 0x8A, 'Í': 0x8B,
  'Ô': 0x8C, 'ì': 0x8D, 'Ã': 0x8E, 'Â': 0x8F, 'É': 0x90, 'À': 0x91,
  'È': 0x92, 'ô': 0x93, 'õ': 0x94, 'ò': 0x95, 'Ú': 0x96, 'ù': 0x97,
  'Ì': 0x98, 'Õ': 0x99, 'Ü': 0x9A, 'Ù': 0x9D, 'Ó': 0x9F,
  'á': 0xA0, 'í': 0xA1, 'ó': 0xA2, 'ú': 0xA3, 'ñ': 0xA4, 'Ñ': 0xA5,
  'ª': 0xA6, 'º': 0xA7, '¿': 0xA8, 'Ò': 0xA9,
};

function encode(str: string): number[] {
  const bytes: number[] = [];
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code < 128) {
      bytes.push(code);
    } else if (CP860_MAP[ch] !== undefined) {
      bytes.push(CP860_MAP[ch]);
    } else {
      bytes.push(0x3F); // '?' para caracteres não suportados
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
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
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
  out.push(...COMMANDS.selectCP860);
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
    body: new Blob([bytes.buffer as ArrayBuffer]),
  });

  if (!res.ok) {
    throw new Error(`Erro ${res.status}: ${await res.text().catch(() => "desconhecido")}`);
  }
}