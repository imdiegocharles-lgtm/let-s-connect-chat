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

interface Props {
  reportDate?: string
  ordersCount?: number
  totalRevenue?: number
  deliveryFees?: number
  shifts?: ShiftLine[]
  payments?: { label: string; value: number }[]
}

const money = (n: number) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const shiftLabel = (t?: string) =>
  t === 'almoco' ? 'Almoço / Dia' : t === 'noite' ? 'Churrasco / Noite' : (t ?? '-')

const Email = ({
  reportDate = '',
  ordersCount = 0,
  totalRevenue = 0,
  deliveryFees = 0,
  shifts = [],
  payments = [],
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