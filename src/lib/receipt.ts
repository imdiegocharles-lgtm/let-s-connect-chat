import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;

export type ReceiptSettings = {
  receipt_show_logo: boolean;
  receipt_header_bold: boolean;
  receipt_items_bold: boolean;
  receipt_footer_bold: boolean;
  receipt_extra_spacing: boolean;
  receipt_qty_double_size: boolean;
  receipt_font_size: number;
  official_logo_bw_url?: string | null;
  receipt_order_sections?: string[] | null;
};

const COMMANDS = {
  init: [0x1b, 0x40],
  lf: [0x0a],
  center: [0x1b, 0x61, 0x01],
  left: [0x1b, 0x61, 0x00],
  boldOn: [0x1b, 0x45, 0x01],
  boldOff: [0x1b, 0x45, 0x00],
  doubleWidthOn: [0x1b, 0x21, 0x20],
  doubleWidthOff: [0x1b, 0x21, 0x00],
  doubleHeightOn: [0x1b, 0x21, 0x10],
  doubleHeightOff: [0x1b, 0x21, 0x00],
  doubleSizeOn: [0x1b, 0x21, 0x30], // Double width + double height
  doubleSizeOff: [0x1b, 0x21, 0x00],
  selectCP860: [0x1b, 0x74, 0x03],
  cut: [0x1d, 0x56, 0x42, 0x00],
  beep: [0x1b, 0x42, 0x03, 0x01],
  reverseOn: [0x1d, 0x42, 0x01],
  reverseOff: [0x1d, 0x42, 0x00],
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
      bytes.push(0x3F); // '?'
    }
  }
  return bytes;
}

function line(text = "", bold = false, double = false, reverse = false): number[] {
  const res: number[] = [];
  if (bold) res.push(...COMMANDS.boldOn);
  if (double) res.push(...COMMANDS.doubleWidthOn);
  if (reverse) res.push(...COMMANDS.reverseOn);
  res.push(...encode(text));
  if (reverse) res.push(...COMMANDS.reverseOff);
  if (double) res.push(...COMMANDS.doubleWidthOff);
  if (bold) res.push(...COMMANDS.boldOff);
  res.push(...COMMANDS.lf);
  return res;
}

function padLine(left: string, right: string, width = 48): string {
  const dots = Math.max(0, width - left.length - right.length);
  return left + " ".repeat(dots) + right;
}

function formatMoney(n: number): string {
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const timeStr = d.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', timeZone: "America/Sao_Paulo" });
  return `DATA: ${dateStr}   HORA: ${timeStr}`;
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "DINHEIRO",
  credito: "CARTÃO DE CRÉDITO",
  debito: "CARTÃO DE DÉBITO",
  sodexo: "SODEXO",
  alelo: "ALELO",
  pix: "PIX (ENTREGA)",
};

export function buildReceiptBytes(
  order: Order, 
  items: OrderItem[], 
  settings?: ReceiptSettings
): Uint8Array {
  const out: number[] = [];
  const s = settings || {
    receipt_show_logo: true,
    receipt_header_bold: true,
    receipt_items_bold: true,
    receipt_footer_bold: true,
    receipt_extra_spacing: true,
    receipt_qty_double_size: true,
    receipt_font_size: 1,
    receipt_order_sections: ["header", "order_info", "customer", "items", "totals", "payment", "notes"],
  };

  const sections = s.receipt_order_sections || ["header", "order_info", "customer", "items", "totals", "payment", "notes"];

  out.push(...COMMANDS.init);
  out.push(...COMMANDS.selectCP860);

  sections.forEach(section => {
    switch (section) {
      case "header":
        out.push(...COMMANDS.center);
        if (s.receipt_show_logo) {
          out.push(...line("FAMILIA AMARAL", true, s.receipt_font_size > 1));
          out.push(...line("CHURRASQUINHO & RESTAURANTE", true));
        }
        out.push(...line("------------------------------------------------", s.receipt_header_bold));
        break;

      case "order_info":
        out.push(...COMMANDS.left);
        out.push(...line(`PEDIDO #${String(order.order_number).padStart(4, "0")}`, true, true));
        out.push(...line(formatDate(order.created_at), s.receipt_header_bold));
        out.push(...line("------------------------------------------------", s.receipt_header_bold));
        break;

      case "customer":
        out.push(...COMMANDS.left);
        out.push(...line(" CLIENTE", true, true));
        out.push(...line(`  NOME: ${order.customer_name.toUpperCase()}`, s.receipt_header_bold));
        out.push(...line(`  FONE: ${order.customer_phone}`, s.receipt_header_bold));
        if (order.delivery_type === "delivery") {
          out.push(...line(`  END: ${order.customer_address?.toUpperCase() ?? ""}`, s.receipt_header_bold));
          out.push(...line(`  BAIRRO: ${order.neighborhood?.toUpperCase() ?? ""}`, s.receipt_header_bold));
        } else {
          out.push(...line("  >>> RETIRADA NO LOCAL <<<", true));
        }
        out.push(...line("------------------------------------------------", s.receipt_header_bold));
        break;

      case "items":
        out.push(...COMMANDS.left);
        out.push(...line(" ITENS DO PEDIDO", true, true));
        out.push(...line("")); 

        for (const item of items) {
          const name = item.name.toUpperCase();
          const total = formatMoney(item.price * item.quantity);
          
          if (s.receipt_qty_double_size) {
            out.push(...COMMANDS.left);
            out.push(...COMMANDS.doubleSizeOn);
            out.push(...encode(`${item.quantity}X `));
            out.push(...COMMANDS.doubleSizeOff);
            
            out.push(...COMMANDS.boldOn);
            out.push(...encode(name));
            out.push(...COMMANDS.boldOff);
            out.push(...COMMANDS.lf);
            
            out.push(...line(padLine("", total, 48), s.receipt_items_bold));
          } else {
            const qty = `${item.quantity}X `.toUpperCase();
            out.push(...line(padLine(qty + name, total, 48), s.receipt_items_bold));
          }
          
          if (item.extras) {
            const extras = item.extras as any;
            if (extras.espeto) {
              const espetoName = extras.espeto.toUpperCase();
              if (s.receipt_qty_double_size) {
                out.push(...COMMANDS.left);
                out.push(...COMMANDS.doubleSizeOn);
                out.push(...encode(" 1X "));
                out.push(...COMMANDS.doubleSizeOff);
                out.push(...line(`ESPETO: ${espetoName}`, s.receipt_items_bold));
              } else {
                out.push(...line(`   1X ESPETO: ${espetoName}`, s.receipt_items_bold));
              }
            }
            if (extras.acompanhamento) {
              out.push(...line(`   [ ACOMPANHAMENTO: ${extras.acompanhamento.toUpperCase()} ]`, s.receipt_items_bold));
            }
            if (extras.pergunta && extras.escolha) {
              out.push(...line(`   [ ${extras.pergunta.toUpperCase()}: ${extras.escolha.toUpperCase()} ]`, s.receipt_items_bold));
            }
          }

          if (s.receipt_extra_spacing) {
            out.push(...line(""));
          }
        }
        out.push(...line("------------------------------------------------", s.receipt_footer_bold));
        break;

      case "totals":
        out.push(...COMMANDS.left);
        out.push(...line(padLine("SUBTOTAL", formatMoney(order.subtotal), 48), s.receipt_footer_bold));
        if (order.delivery_type === "delivery") {
          out.push(...line(padLine("TAXA DE ENTREGA", formatMoney(order.delivery_fee), 48), s.receipt_footer_bold));
        }
        out.push(...line(padLine("TOTAL DO PEDIDO", formatMoney(order.total), 48), true, true));
        out.push(...line("------------------------------------------------", s.receipt_footer_bold));
        break;

      case "payment":
        out.push(...COMMANDS.left);
        out.push(...line(" PAGAMENTO", true, true));
        const method = PAYMENT_LABELS[order.payment_method ?? ""] ?? (order.payment_method ?? "-").toUpperCase();
        out.push(...line(method, true, true, true));
        
        if (order.payment_method === "dinheiro" && order.change_for) {
          const changeAmount = Number(order.change_for) - order.total;
          out.push(...line("------------------------------------------------", s.receipt_footer_bold));
          out.push(...line(padLine("VALOR EM DINHEIRO", formatMoney(Number(order.change_for)), 48), s.receipt_footer_bold));
          out.push(...line(""));
          out.push(...line(padLine(" TROCO:", formatMoney(changeAmount), 32), true, true, true));
        }
        out.push(...line("------------------------------------------------", s.receipt_footer_bold));
        break;

      case "notes":
        if (order.notes) {
          out.push(...COMMANDS.left);
          out.push(...line(" OBSERVACOES", true, true));
          out.push(...line(order.notes.toUpperCase(), true));
          out.push(...line("------------------------------------------------", true));
        }
        break;
    }
  });

  out.push(...line(""));
  out.push(...line(""));
  out.push(...COMMANDS.cut);

  return new Uint8Array(out);
}

export function receiptToBase64(order: Order, items: OrderItem[], settings?: ReceiptSettings): string {
  const bytes = buildReceiptBytes(order, items, settings);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/* ----------------------------- RESERVAS ----------------------------- */

export type ReservationReceipt = {
  id?: string;
  customer_name: string;
  phone: string;
  people_count: number;
  location: string;
  reservation_date: string;
  status?: string | null;
  created_at?: string | null;
};

const RESERVATION_LOCATIONS: Record<string, string> = {
  varanda: "VARANDA",
  salao: "SALÃO",
  segundo_andar: "SEGUNDO ANDAR (AR-CONDICIONADO)",
};

const RESERVATION_STATUS: Record<string, string> = {
  pendente: "PENDENTE",
  confirmada: "CONFIRMADA",
  cancelada: "CANCELADA",
};

export function buildReservationBytes(r: ReservationReceipt): Uint8Array {
  const out: number[] = [];
  out.push(...COMMANDS.init);
  out.push(...COMMANDS.selectCP860);

  out.push(...COMMANDS.center);
  out.push(...line("FAMILIA AMARAL", true, true));
  out.push(...line("CHURRASQUINHO & RESTAURANTE", true));
  out.push(...line(""));
  out.push(...line("*** RESERVA ***", true, true, true));
  out.push(...line("------------------------------------------------", true));

  out.push(...COMMANDS.left);
  const dataBR = new Date(`${r.reservation_date}T00:00:00`).toLocaleDateString("pt-BR");
  out.push(...line(" DATA DA RESERVA", true));
  out.push(...line(dataBR, true, true));
  out.push(...line("------------------------------------------------", true));

  out.push(...line(" CLIENTE", true, true));
  out.push(...line(`  NOME: ${r.customer_name.toUpperCase()}`, true));
  out.push(...line(`  FONE: ${r.phone}`, true));
  out.push(...line("------------------------------------------------", true));

  out.push(...line(" DETALHES", true, true));
  out.push(...COMMANDS.doubleSizeOn);
  out.push(...encode(`${r.people_count} PESSOAS`));
  out.push(...COMMANDS.doubleSizeOff);
  out.push(...COMMANDS.lf);
  out.push(...line(`  LOCAL: ${RESERVATION_LOCATIONS[r.location] ?? r.location.toUpperCase()}`, true));
  if (r.status) {
    out.push(...line(`  STATUS: ${RESERVATION_STATUS[r.status] ?? r.status.toUpperCase()}`, true));
  }
  out.push(...line("------------------------------------------------", true));

  if (r.created_at) {
    out.push(...line(formatDate(r.created_at)));
  }
  out.push(...line("RESERVA VALIDA ATE AS 19:30H", true));

  out.push(...line(""));
  out.push(...line(""));
  out.push(...COMMANDS.cut);
  return new Uint8Array(out);
}

export async function sendReservationToLocalPrinter(
  agentUrl: string,
  reservation: ReservationReceipt,
  timeoutMs = 8000,
): Promise<void> {
  const bytes = buildReservationBytes(reservation);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(agentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Blob([bytes.buffer as ArrayBuffer]),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Erro ${res.status}: ${await res.text().catch(() => "desconhecido")}`);
    }
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error("Tempo esgotado: o agente de impressão não respondeu (verifique se está aberto no PC).");
    }
    if (e instanceof TypeError) {
      throw new Error("Sem conexão com o agente de impressão (verifique o endereço e se o programa está aberto).");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function sendToLocalPrinter(
  agentUrl: string,
  order: Order,
  items: OrderItem[],
  settings?: ReceiptSettings,
  timeoutMs = 8000,
): Promise<void> {
  const bytes = buildReceiptBytes(order, items, settings);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(agentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Blob([bytes.buffer as ArrayBuffer]),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Erro ${res.status}: ${await res.text().catch(() => "desconhecido")}`);
    }
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error("Tempo esgotado: o agente de impressão não respondeu (verifique se está aberto no PC).");
    }
    if (e instanceof TypeError) {
      throw new Error("Sem conexão com o agente de impressão (verifique o endereço e se o programa está aberto).");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}