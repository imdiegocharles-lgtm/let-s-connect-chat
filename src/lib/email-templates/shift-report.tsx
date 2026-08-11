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
import { ItemsSection, MotoboysSection, CombosSection, DeletedOrdersSection } from './daily-report'

interface Props {
  reportDate?: string
  shiftType?: string
  operatorName?: string | null
  openedAt?: string
  closedAt?: string
  openingCash?: number
  ordersCount?: number
  totalRevenue?: number
  deliveryFees?: number
  payments?: { label: string; value: number }[]
  items?: any[]
  motoboys?: any[]
  combos?: any[]
  deletedOrders?: any[]
}

const money = (n: number) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const hhmm = (v?: string) =>
  v ? new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'

const shiftLabel = (t?: string) =>
  t === 'almoco' ? 'Almoço / Dia' : t === 'noite' ? 'Churrasco / Noite' : (t ?? '-')

const Email = ({
  reportDate = '',
  shiftType = '',
  operatorName = '-',
  openedAt = '',
  closedAt = '',
  openingCash = 0,
  ordersCount = 0,
  totalRevenue = 0,
  deliveryFees = 0,
  payments = [],
  items = [],
  motoboys = [],
  combos = [],
  deletedOrders = [],
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{`Relatório de Turno (${shiftLabel(shiftType)}) — ${money(totalRevenue)}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>Família Amaral</Heading>
        <Text style={sub}>Relatório de Turno — {reportDate}</Text>
        <Hr style={hr} />

        <Section>
          <Text style={line}>Turno: <b>{shiftLabel(shiftType)}</b></Text>
          <Text style={line}>Operador: <b>{operatorName ?? '-'}</b></Text>
          <Text style={line}>Abertura: <b>{hhmm(openedAt)}</b> às <b>{hhmm(closedAt)}</b></Text>
        </Section>

        <Hr style={hr} />

        <Section>
          <Text style={line}>Pedidos pagos: <b>{ordersCount}</b></Text>
          <Text style={line}>Caixa inicial: <b>{money(openingCash)}</b></Text>
          <Text style={line}>Taxas de entrega: <b>{money(deliveryFees)}</b></Text>
          <Text style={total}>Total faturado: {money(totalRevenue)}</Text>
        </Section>

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
        <Text style={footer}>Relatório de turno automático — Família Amaral</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Relatório de Turno (${shiftLabel(data?.shiftType)}) — ${data?.reportDate ?? ''} — Família Amaral`,
  displayName: 'Relatório de turno',
  previewData: {
    reportDate: '31/07/2026',
    shiftType: 'noite',
    operatorName: 'Carlos',
    openedAt: '2026-07-31T18:00:00Z',
    closedAt: '2026-08-01T00:00:00Z',
    openingCash: 200,
    ordersCount: 54,
    totalRevenue: 3030.5,
    deliveryFees: 210,
    payments: [
      { label: 'Dinheiro', value: 1200 },
      { label: 'Pix (na entrega)', value: 1830.5 },
    ],
    items: [
      { group: 'Espetos', name: 'Espeto de Carne', quantity: 20 },
      { group: 'Espetos', name: 'Espeto de Frango', quantity: 10 },
    ],
    motoboys: [
      { name: 'João', daily_rate: 90, deliveries: 22 },
    ],
    combos: [],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const brand = { color: '#c1121f', fontSize: '24px', margin: '0' }
const sub = { color: '#111111', fontSize: '16px', margin: '4px 0 0' }
const h2 = { color: '#111111', fontSize: '15px', fontWeight: 700, margin: '0 0 8px' }
const line = { color: '#333333', fontSize: '14px', margin: '4px 0' }
const total = { color: '#c1121f', fontSize: '20px', fontWeight: 700, margin: '12px 0 0' }
const hr = { borderColor: '#e5e5e5', margin: '18px 0' }
const footer = { color: '#888888', fontSize: '12px', margin: '0' }
