import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface ShiftLine {
  shift_type?: string
  operator_name?: string | null
  orders_count?: number
  total_revenue?: number
}

interface ItemLine {
  group?: string
  name?: string
  quantity?: number
}

interface MotoboyLine {
  name?: string
  daily_rate?: number
  deliveries?: number
  delivery_fees_total?: number
  gas_help?: number
}

interface DeletedOrderLine {
  order_number?: number
  total?: number
  customer_name?: string
  reason?: string
}

interface ComboLine {
  combo?: string
  total?: number
  skewers?: { name?: string; quantity?: number }[]
}

interface Props {
  reportDate?: string
  ordersCount?: number
  totalRevenue?: number
  deliveryFees?: number
  shifts?: ShiftLine[]
  payments?: { label: string; value: number }[]
  items?: ItemLine[]
  motoboys?: MotoboyLine[]
  combos?: ComboLine[]
  deletedOrders?: DeletedOrderLine[]
}

const money = (n: number) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const shiftLabel = (t?: string) =>
  t === 'almoco' ? 'Almoço / Dia' : t === 'noite' ? 'Churrasco / Noite' : (t ?? '-')

export const ItemsSection = ({ items = [] }: { items?: ItemLine[] }) => {
  const groups: { group: string; lines: ItemLine[] }[] = []
  for (const i of items) {
    const g = i.group || 'Outros'
    const found = groups.find((x) => x.group === g)
    if (found) found.lines.push(i)
    else groups.push({ group: g, lines: [i] })
  }
  return (
    <>
      <Text style={h2}>Itens vendidos (pagamento confirmado)</Text>
      {groups.length === 0 ? (
        <Text style={line}>Nenhum item vendido.</Text>
      ) : (
        groups.map((g, i) => (
          <Section key={i} style={{ marginBottom: '10px' }}>
            <Text style={group}>{g.group}</Text>
            {g.lines.map((l, j) => (
              <Text key={j} style={line}>
                {l.name} — <b>{Number(l.quantity ?? 0)} un</b>
              </Text>
            ))}
          </Section>
        ))
      )}
    </>
  )
}

export const MotoboysSection = ({ motoboys = [] }: { motoboys?: MotoboyLine[] }) => {
  if (motoboys.length === 0) return null
  const rowTotal = (m: MotoboyLine) =>
    Number(m.delivery_fees_total ?? 0) + Number(m.gas_help ?? m.daily_rate ?? 0)
  const total = motoboys.reduce((s, m) => s + rowTotal(m), 0)
  return (
    <>
      <Hr style={hr} />
      <Text style={h2}>Motoboys</Text>
      {motoboys.map((m, i) => (
        <Section key={i} style={{ marginBottom: '8px' }}>
          <Text style={group}>
            {m.name} ({Number(m.deliveries ?? 0)} entregas)
          </Text>
          <Text style={line}>Entregas: {money(Number(m.delivery_fees_total ?? 0))}</Text>
          <Text style={line}>
            Ajuda de custo da gasolina: {money(Number(m.gas_help ?? m.daily_rate ?? 0))}
          </Text>
          <Text style={line}>
            <b>Total a receber: {money(rowTotal(m))}</b>
          </Text>
        </Section>
      ))}
      <Text style={line}>
        Total motoboys: <b>{money(total)}</b>
      </Text>
    </>
  )
}

export const DeletedOrdersSection = ({
  deletedOrders = [],
}: {
  deletedOrders?: DeletedOrderLine[]
}) => {
  if (deletedOrders.length === 0) return null
  return (
    <>
      <Hr style={hr} />
      <Text style={h2}>Pedidos excluídos</Text>
      {deletedOrders.map((o, i) => (
        <Section key={i} style={{ marginBottom: '8px' }}>
          <Text style={group}>
            #{String(o.order_number ?? '').padStart(4, '0')} — {money(Number(o.total ?? 0))}
          </Text>
          <Text style={line}>Cliente: {o.customer_name ?? '-'}</Text>
          <Text style={line}>Motivo: {o.reason ?? '-'}</Text>
        </Section>
      ))}
    </>
  )
}

export const CombosSection = ({ combos = [] }: { combos?: ComboLine[] }) => {
  if (combos.length === 0) return null
  return (
    <>
      <Hr style={hr} />
      <Text style={h2}>Espetos inclusos nos Completos</Text>
      <Text style={note}>
        Escolha inclusa no prato — não são vendas avulsas de espeto.
      </Text>
      {combos.map((c, i) => (
        <Section key={i} style={{ marginBottom: '10px' }}>
          <Text style={group}>
            {c.combo}: {Number(c.total ?? 0)} vendidos
          </Text>
          {(c.skewers ?? []).map((s, j) => (
            <Text key={j} style={line}>
              - {s.name}: <b>{Number(s.quantity ?? 0)}</b>
            </Text>
          ))}
        </Section>
      ))}
    </>
  )
}

const Email = ({
  reportDate = '',
  ordersCount = 0,
  totalRevenue = 0,
  deliveryFees = 0,
  shifts = [],
  payments = [],
  items = [],
  motoboys = [],
  combos = [],
  deletedOrders = [],
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{`Relatório do dia ${reportDate} — ${money(totalRevenue)}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>Família Amaral</Heading>
        <Text style={sub}>Relatório do dia {reportDate}</Text>
        <Hr style={hr} />

        <Section>
          <Text style={line}>Pedidos no dia: <b>{ordersCount}</b></Text>
          <Text style={line}>Taxas de entrega: <b>{money(deliveryFees)}</b></Text>
          <Text style={total}>Total faturado: {money(totalRevenue)}</Text>
        </Section>

        <Hr style={hr} />
        <Text style={h2}>Turnos</Text>
        {shifts.length === 0 ? (
          <Text style={line}>Nenhum turno finalizado.</Text>
        ) : (
          shifts.map((s, i) => (
            <Text key={i} style={line}>
              {shiftLabel(s.shift_type)} — {s.operator_name ?? '-'} — {s.orders_count ?? 0} pedidos —{' '}
              <b>{money(Number(s.total_revenue ?? 0))}</b>
            </Text>
          ))
        )}

        <Hr style={hr} />
        <Text style={h2}>Por forma de pagamento confirmada</Text>
        {payments.length === 0 ? (
          <Text style={line}>Nenhum pagamento confirmado.</Text>
        ) : (
          payments.map((p, i) => (
            <Text key={i} style={line}>
              {p.label}: <b>{money(p.value)}</b>
            </Text>
          ))
        )}

        <Hr style={hr} />
        <ItemsSection items={items} />

        <CombosSection combos={combos} />

        <MotoboysSection motoboys={motoboys} />

        <DeletedOrdersSection deletedOrders={deletedOrders} />

        <Hr style={hr} />
        <Text style={footer}>Relatório consolidado automático — Família Amaral</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Relatório do dia ${data?.reportDate ?? ''} — Família Amaral`,
  displayName: 'Relatório do dia',
  previewData: {
    reportDate: '31/07/2026',
    ordersCount: 84,
    totalRevenue: 4230.5,
    deliveryFees: 320,
    shifts: [
      { shift_type: 'almoco', operator_name: 'Ana', orders_count: 30, total_revenue: 1200 },
      { shift_type: 'noite', operator_name: 'Carlos', orders_count: 54, total_revenue: 3030.5 },
    ],
    payments: [
      { label: 'Dinheiro', value: 1200 },
      { label: 'Pix (na entrega)', value: 3030.5 },
    ],
    items: [
      { group: 'Espetos', name: 'Espeto de Carne', quantity: 42 },
      { group: 'Espetos', name: 'Espeto de Frango', quantity: 18 },
      { group: 'Completos', name: 'Batata Completa', quantity: 12 },
      { group: 'Bebidas', name: 'Coca-Cola 2L', quantity: 9 },
    ],
    motoboys: [
      { name: 'João', daily_rate: 90, deliveries: 22 },
      { name: 'Pedro', daily_rate: 90, deliveries: 18 },
    ],
    combos: [
      {
        combo: 'Completo com Salpicão',
        total: 50,
        skewers: [
          { name: 'Frango empanado', quantity: 20 },
          { name: 'Linguiça mineira', quantity: 15 },
          { name: 'Tulipa da asa', quantity: 15 },
        ],
      },
      {
        combo: 'Completo com Maionese',
        total: 20,
        skewers: [
          { name: 'Frango grelhado', quantity: 10 },
          { name: 'Coração', quantity: 10 },
        ],
      },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const brand = { color: '#c1121f', fontSize: '24px', margin: '0' }
const sub = { color: '#111111', fontSize: '16px', margin: '4px 0 0' }
const h2 = { color: '#111111', fontSize: '15px', fontWeight: 700, margin: '0 0 8px' }
const group = { color: '#c1121f', fontSize: '13px', fontWeight: 700, margin: '8px 0 2px' }
const line = { color: '#333333', fontSize: '14px', margin: '4px 0' }
const note = { color: '#888888', fontSize: '12px', margin: '0 0 6px' }
const total = { color: '#c1121f', fontSize: '20px', fontWeight: 700, margin: '12px 0 0' }
const hr = { borderColor: '#e5e5e5', margin: '18px 0' }
const footer = { color: '#888888', fontSize: '12px', margin: '0' }