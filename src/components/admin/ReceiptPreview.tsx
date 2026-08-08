import React from 'react';
import type { ReceiptSettings } from '@/lib/receipt';

interface ReceiptPreviewProps {
  settings: ReceiptSettings;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ settings }) => {
  // Mock data for preview
  const mockOrder = {
    order_number: 1234,
    created_at: new Date().toISOString(),
    customer_name: "JOÃO SILVA",
    customer_phone: "(11) 99999-9999",
    customer_address: "RUA DAS FLORES, 123",
    neighborhood: "CENTRO",
    delivery_type: "delivery",
    subtotal: 45.00,
    delivery_fee: 7.00,
    total: 52.00,
    payment_method: "dinheiro",
    change_for: 60.00,
    notes: "RETIRAR CEBOLA DO ESPETO"
  };

  const mockItems = [
    {
      name: "ESPETO DE PICANHA",
      quantity: 2,
      price: 15.00,
      extras: {}
    },
    {
      name: "COMPLETO COM MAIONESE",
      quantity: 1,
      price: 15.00,
      extras: {
        espeto: "FRANGO COM BACON",
        acompanhamento: "ARROZ E FEIJÃO",
        pergunta: "Acompanha mel?",
        escolha: "Sim"
      }
    }
  ];

  const formatMoney = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;
  
  const s = settings;
  const isHeaderBold = s.receipt_header_bold;
  const isItemsBold = s.receipt_items_bold;
  const isFooterBold = s.receipt_footer_bold;

  const sections = s.receipt_order_sections || ["header", "order_info", "customer", "items", "totals", "payment", "notes"];

  return (
    <div className="bg-[#f5f5f5] p-4 rounded-lg flex justify-center overflow-auto max-h-[600px] border">
      <div className="bg-white w-[300px] p-6 shadow-sm font-mono text-[12px] text-black leading-tight select-none">
        {sections.map((section, idx) => {
          switch (section) {
            case "header":
              return (
                <div key={idx} className="text-center mb-2">
                  {s.receipt_show_logo && (
                    <>
                      {s.official_logo_bw_url ? (
                        <div className="flex justify-center mb-2">
                          <img src={s.official_logo_bw_url} alt="Logo" className="w-32 h-auto grayscale contrast-125" />
                        </div>
                      ) : (
                        <>
                          <div className={s.receipt_font_size > 1 ? "text-lg font-bold" : "font-bold"}>FAMILIA AMARAL</div>
                          <div className="font-bold text-[10px]">CHURRASQUINHO & RESTAURANTE</div>
                        </>
                      )}
                    </>
                  )}
                  <div className={isHeaderBold ? "font-bold" : ""}>-------------------------------</div>
                </div>
              );
            case "order_info":
              return (
                <div key={idx} className="mb-2">
                  <div className="font-bold text-sm">PEDIDO #1234</div>
                  <div className={isHeaderBold ? "font-bold text-[10px]" : "text-[10px]"}>
                    DATA: {new Date().toLocaleDateString('pt-BR')} HORA: {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                  </div>
                  <div className={isHeaderBold ? "font-bold" : ""}>-------------------------------</div>
                </div>
              );
            case "customer":
              return (
                <div key={idx} className="mb-2">
                  <div className="font-bold text-sm">CLIENTE</div>
                  <div className={isHeaderBold ? "font-bold" : ""}>NOME: {mockOrder.customer_name}</div>
                  <div className={isHeaderBold ? "font-bold" : ""}>FONE: {mockOrder.customer_phone}</div>
                  <div className={isHeaderBold ? "font-bold" : ""}>END: {mockOrder.customer_address}</div>
                  <div className={isHeaderBold ? "font-bold" : ""}>BAIRRO: {mockOrder.neighborhood}</div>
                  <div className={isHeaderBold ? "font-bold" : ""}>-------------------------------</div>
                </div>
              );
            case "items":
              return (
                <div key={idx} className="mb-2">
                  <div className="font-bold text-sm mb-1">ITENS DO PEDIDO</div>
                  {mockItems.map((item, i) => (
                    <div key={i} className={`mb-${s.receipt_extra_spacing ? '2' : '1'}`}>
                      <div className="flex items-start">
                        <span className={`${s.receipt_qty_double_size ? 'text-lg font-bold' : 'font-bold'} mr-2 leading-none`}>
                          {item.quantity}X
                        </span>
                        <div className="flex-1">
                          <div className="font-bold text-[11px]">{item.name}</div>
                          <div className={`text-right ${isItemsBold ? 'font-bold' : ''}`}>
                            {formatMoney(item.price * item.quantity)}
                          </div>
                          {item.extras && Object.keys(item.extras).length > 0 && (
                            <div className={`text-[10px] italic ${isItemsBold ? 'font-bold' : ''}`}>
                              {item.extras.espeto && (
                                <div className="flex items-start">
                                  <span className={s.receipt_qty_double_size ? "text-[14px] font-bold mr-1" : "mr-1"}>1X</span>
                                  <span>ESPETO: {item.extras.espeto}</span>
                                </div>
                              )}
                              {item.extras.acompanhamento && <div>[ ACOMPANHAMENTO: {item.extras.acompanhamento} ]</div>}
                              {item.extras.pergunta && <div>[ {item.extras.pergunta}: {item.extras.escolha} ]</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className={isFooterBold ? "font-bold" : ""}>-------------------------------</div>
                </div>
              );
            case "totals":
              return (
                <div key={idx} className={`mb-2 ${isFooterBold ? "font-bold" : ""}`}>
                  <div className="flex justify-between">
                    <span>SUBTOTAL</span>
                    <span>{formatMoney(mockOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TAXA DE ENTREGA</span>
                    <span>{formatMoney(mockOrder.delivery_fee)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold mt-1">
                    <span>TOTAL DO PEDIDO</span>
                    <span>{formatMoney(mockOrder.total)}</span>
                  </div>
                  <div className={isFooterBold ? "font-bold" : ""}>-------------------------------</div>
                </div>
              );
            case "payment":
              return (
                <div key={idx} className="mb-2">
                  <div className="font-bold text-sm">PAGAMENTO</div>
                  <div className="bg-black text-white text-center font-bold py-1 my-1">
                    DINHEIRO
                  </div>
                  <div className={isFooterBold ? "font-bold" : ""}>-------------------------------</div>
                  <div className="flex justify-between font-bold">
                    <span>VALOR EM DINHEIRO</span>
                    <span>{formatMoney(mockOrder.change_for)}</span>
                  </div>
                  <div className="bg-black text-white flex justify-between font-bold p-1 mt-1 text-sm">
                    <span>TROCO:</span>
                    <span>{formatMoney(mockOrder.change_for - mockOrder.total)}</span>
                  </div>
                  <div className={isFooterBold ? "font-bold" : ""}>-------------------------------</div>
                </div>
              );
            case "notes":
              return mockOrder.notes ? (
                <div key={idx} className="mb-2">
                  <div className="font-bold text-sm">OBSERVACOES</div>
                  <div className="font-bold border border-black p-1">{mockOrder.notes}</div>
                  <div className="font-bold">-------------------------------</div>
                </div>
              ) : null;
            default:
              return null;
          }
        })}


        <div className="text-center text-[10px] text-gray-400 italic mt-4">
          (Corte da Impressora)
        </div>
      </div>
    </div>
  );
};
