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
const CP860_MAP = {
    'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ã': 0x84, 'à': 0x85,
    'Á': 0x86, 'ç': 0x87, 'ê': 0x88, 'Ê': 0x89, 'è': 0x8A, 'Í': 0x8B,
    'Ô': 0x8C, 'ì': 0x8D, 'Ã': 0x8E, 'Â': 0x8F, 'É': 0x90, 'À': 0x91,
    'È': 0x92, 'ô': 0x93, 'õ': 0x94, 'ò': 0x95, 'Ú': 0x96, 'ù': 0x97,
    'Ì': 0x98, 'Õ': 0x99, 'Ü': 0x9A, 'Ù': 0x9D, 'Ó': 0x9F,
    'á': 0xA0, 'í': 0xA1, 'ó': 0xA2, 'ú': 0xA3, 'ñ': 0xA4, 'Ñ': 0xA5,
    'ª': 0xA6, 'º': 0xA7, '¿': 0xA8, 'Ò': 0xA9,
};
function encode(str) {
    const bytes = [];
    for (const ch of str) {
        const code = ch.charCodeAt(0);
        if (code < 128) {
            bytes.push(code);
        }
        else if (CP860_MAP[ch] !== undefined) {
            bytes.push(CP860_MAP[ch]);
        }
        else {
            bytes.push(0x3F); // '?'
        }
    }
    return bytes;
}
function line(text = "", bold = false, double = false, reverse = false) {
    const res = [];
    if (bold)
        res.push(...COMMANDS.boldOn);
    if (double)
        res.push(...COMMANDS.doubleWidthOn);
    if (reverse)
        res.push(...COMMANDS.reverseOn);
    res.push(...encode(text));
    if (reverse)
        res.push(...COMMANDS.reverseOff);
    if (double)
        res.push(...COMMANDS.doubleWidthOff);
    if (bold)
        res.push(...COMMANDS.boldOff);
    res.push(...COMMANDS.lf);
    return res;
}
function padLine(left, right, width = 48) {
    const dots = Math.max(0, width - left.length - right.length);
    return left + " ".repeat(dots) + right;
}
function formatMoney(n) {
    return `R$ ${n.toFixed(2).replace('.', ',')}`;
}
function formatDate(iso) {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString("pt-BR");
    const timeStr = d.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
    return `DATA: ${dateStr}   HORA: ${timeStr}`;
}
const PAYMENT_LABELS = {
    dinheiro: "DINHEIRO",
    credito: "CARTÃO DE CRÉDITO",
    debito: "CARTÃO DE DÉBITO",
    sodexo: "SODEXO",
    alelo: "ALELO",
    pix: "PIX (ENTREGA)",
};
export function buildReceiptBytes(order, items, settings) {
    const out = [];
    const s = settings || {
        receipt_show_logo: true,
        receipt_header_bold: true,
        receipt_items_bold: true,
        receipt_footer_bold: true,
        receipt_extra_spacing: true,
        receipt_qty_double_size: true,
        receipt_font_size: 1,
    };
    out.push(...COMMANDS.init);
    out.push(...COMMANDS.selectCP860);
    // Header com Logo (Texto Centralizado estilizado)
    out.push(...COMMANDS.center);
    if (s.receipt_show_logo) {
        out.push(...line("FAMILIA AMARAL", true, s.receipt_font_size > 1));
        out.push(...line("CHURRASQUINHO & RESTAURANTE", true));
    }
    out.push(...line("------------------------------------------------", s.receipt_header_bold));
    out.push(...COMMANDS.left);
    out.push(...line(`PEDIDO #${String(order.order_number).padStart(4, "0")}`, true, true));
    out.push(...line(formatDate(order.created_at), s.receipt_header_bold));
    out.push(...line("------------------------------------------------", s.receipt_header_bold));
    out.push(...line(" CLIENTE", true, true));
    out.push(...line(`  NOME: ${order.customer_name.toUpperCase()}`, s.receipt_header_bold));
    out.push(...line(`  FONE: ${order.customer_phone}`, s.receipt_header_bold));
    if (order.delivery_type === "delivery") {
        out.push(...line(`  END: ${order.customer_address?.toUpperCase() ?? ""}`, s.receipt_header_bold));
        out.push(...line(`  BAIRRO: ${order.neighborhood?.toUpperCase() ?? ""}`, s.receipt_header_bold));
    }
    else {
        out.push(...line("  >>> RETIRADA NO LOCAL <<<", true));
    }
    out.push(...line("------------------------------------------------", s.receipt_header_bold));
    out.push(...line(" ITENS DO PEDIDO", true, true));
    out.push(...line("")); // Espaçamento antes dos itens
    for (const item of items) {
        const name = item.name.toUpperCase();
        const total = formatMoney(item.price * item.quantity);
        // Linha do Item com Quantidade Grande
        if (s.receipt_qty_double_size) {
            out.push(...COMMANDS.left);
            out.push(...COMMANDS.doubleSizeOn);
            out.push(...encode(`${item.quantity}X `));
            out.push(...COMMANDS.doubleSizeOff);
            out.push(...COMMANDS.boldOn);
            out.push(...encode(name));
            out.push(...COMMANDS.boldOff);
            out.push(...COMMANDS.lf);
            // Preço na linha de baixo alinhado à direita
            out.push(...line(padLine("", total, 48), s.receipt_items_bold));
        }
        else {
            const qty = `${item.quantity}X `.toUpperCase();
            out.push(...line(padLine(qty + name, total, 48), s.receipt_items_bold));
        }
        // Informações complementares
        if (item.extras) {
            const extras = item.extras;
            // Espeto Incluso (com quantidade 1x conforme solicitado)
            if (extras.espeto) {
                out.push(...line(`   [ 1X ESPETO: ${extras.espeto.toUpperCase()} ]`, s.receipt_items_bold));
            }
            // Acompanhamento
            if (extras.acompanhamento) {
                out.push(...line(`   [ ACOMPANHAMENTO: ${extras.acompanhamento.toUpperCase()} ]`, s.receipt_items_bold));
            }
            // Pergunta Extra
            if (extras.pergunta && extras.escolha) {
                out.push(...line(`   [ ${extras.pergunta.toUpperCase()}: ${extras.escolha.toUpperCase()} ]`, s.receipt_items_bold));
            }
        }
        if (s.receipt_extra_spacing) {
            out.push(...line("")); // Espaço entre itens para facilitar a leitura
        }
    }
    out.push(...line("------------------------------------------------", s.receipt_footer_bold));
    out.push(...line(padLine("SUBTOTAL", formatMoney(order.subtotal), 48), s.receipt_footer_bold));
    if (order.delivery_type === "delivery") {
        out.push(...line(padLine("TAXA DE ENTREGA", formatMoney(order.delivery_fee), 48), s.receipt_footer_bold));
    }
    out.push(...line(padLine("TOTAL DO PEDIDO", formatMoney(order.total), 48), true, true));
    out.push(...line("------------------------------------------------", s.receipt_footer_bold));
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
    if (order.notes) {
        out.push(...line(" OBSERVACOES", true, true));
        out.push(...line(order.notes.toUpperCase(), true));
        out.push(...line("------------------------------------------------", true));
    }
    out.push(...line(""));
    out.push(...line(""));
    out.push(...COMMANDS.cut);
    return new Uint8Array(out);
}
export function receiptToBase64(order, items, settings) {
    const bytes = buildReceiptBytes(order, items, settings);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
export async function sendToLocalPrinter(agentUrl, order, items, settings) {
    const bytes = buildReceiptBytes(order, items, settings);
    const res = await fetch(agentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Blob([bytes.buffer]),
    });
    if (!res.ok) {
        throw new Error(`Erro ${res.status}: ${await res.text().catch(() => "desconhecido")}`);
    }
}
