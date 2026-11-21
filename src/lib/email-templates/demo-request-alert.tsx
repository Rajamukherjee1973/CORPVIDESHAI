import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  reference?: string
  fullName?: string
  workEmail?: string
  organisation?: string
  audience?: string
  preferredDate?: string
  timeSlot?: string
  focus?: string[]
  message?: string
}

const Row = ({ label, value }: { label: string; value?: string | undefined }) => (
  <Text style={row}>
    <span style={rowLabel}>{label}</span>
    <br />
    {value || '—'}
  </Text>
)

const DemoRequestAlert = ({ reference, fullName, workEmail, organisation, audience, preferredDate, timeSlot, focus, message }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New demo request ${reference ?? ''} from ${organisation ?? 'a visitor'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={bar}><Text style={barText}>CORPVIDESH AI · DEMO REQUEST</Text></Section>
        <Heading style={h1}>{reference ?? 'New demo request'}</Heading>
        <Text style={lede}>
          {fullName ?? 'A visitor'} from {organisation ?? 'an organisation'} asked for a guided walkthrough. Reply to this email to confirm the slot.
        </Text>
        <Hr style={hr} />
        <Row label="NAME" value={fullName} />
        <Row label="WORK EMAIL" value={workEmail} />
        <Row label="ORGANISATION" value={organisation} />
        <Row label="REPRESENTS" value={audience} />
        <Row label="PREFERRED DATE & SLOT" value={[preferredDate, timeSlot].filter(Boolean).join(' · ')} />
        <Row label="WANTS TO SEE" value={focus?.length ? focus.join(', ') : undefined} />
        <Row label="SCENARIO" value={message} />
        <Hr style={hr} />
        <Text style={footer}>All Copyrights Protected @ Raja Mukherjee | Department of Law | Brainware University</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DemoRequestAlert,
  subject: (d: Record<string, any>) => `New demo request ${d['reference'] ?? ''} — ${d['organisation'] ?? 'CorpVidesh AI'}`.trim(),
  displayName: 'Demo request alert (to owner)',
  previewData: {
    reference: 'CVD-DEMO-01002',
    fullName: 'Ananya Rao',
    workEmail: 'ananya.rao@example.com',
    organisation: 'Example Industries Ltd',
    audience: 'Corporate treasury / CFO office',
    preferredDate: '2026-11-20',
    timeSlot: '15:00–16:00 IST',
    focus: ['Treasury console & Form FC filings', 'GIFT City nine-desk clearance'],
    message: '₹500 crore ODI into a Singapore subsidiary',
  },
} satisfies TemplateEntry

const RED = '#d4261c'
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 24px 32px', borderTop: `6px solid ${RED}` }
const bar = { marginBottom: '8px' }
const barText = { fontSize: '11px', letterSpacing: '2px', color: RED, margin: '0' }
const h1 = { fontSize: '30px', lineHeight: '1.1', margin: '8px 0 12px', textTransform: 'uppercase' as const, letterSpacing: '-0.5px' }
const lede = { fontSize: '15px', lineHeight: '1.6', color: '#444444', margin: '0 0 8px' }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const row = { fontSize: '15px', lineHeight: '1.5', margin: '0 0 14px', borderLeft: `2px solid ${RED}`, paddingLeft: '12px' }
const rowLabel = { fontSize: '10px', letterSpacing: '1.6px', color: '#777777' }
const footer = { fontSize: '11px', color: '#777777', margin: '0' }
