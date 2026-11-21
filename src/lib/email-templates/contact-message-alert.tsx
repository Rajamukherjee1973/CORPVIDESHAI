import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  reference?: string
  fullName?: string
  workEmail?: string
  organisation?: string
  audience?: string
  topic?: string
  message?: string
}

const Row = ({ label, value }: { label: string; value?: string | undefined }) => (
  <Text style={row}>
    <span style={rowLabel}>{label}</span>
    <br />
    {value || '—'}
  </Text>
)

const ContactMessageAlert = ({ reference, fullName, workEmail, organisation, audience, topic, message }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New contact message ${reference ?? ''} from ${organisation ?? fullName ?? 'a visitor'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={bar}><Text style={barText}>CORPVIDESH AI · CONTACT MESSAGE</Text></Section>
        <Heading style={h1}>{reference ?? 'New contact message'}</Heading>
        <Text style={lede}>
          {fullName ?? 'A visitor'}{organisation ? ` from ${organisation}` : ''} wrote in about “{topic ?? 'a general enquiry'}”. Reply to this email to respond directly.
        </Text>
        <Hr style={hr} />
        <Row label="NAME" value={fullName} />
        <Row label="EMAIL" value={workEmail} />
        <Row label="ORGANISATION" value={organisation} />
        <Row label="REPRESENTS" value={audience} />
        <Row label="TOPIC" value={topic} />
        <Row label="MESSAGE" value={message} />
        <Hr style={hr} />
        <Text style={footer}>All Copyrights Protected @ Raja Mukherjee | Department of Law | Brainware University</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactMessageAlert,
  subject: (d: Record<string, any>) => `Contact ${d['reference'] ?? ''} — ${d['topic'] ?? 'CorpVidesh AI'}`.trim(),
  displayName: 'Contact message alert (to owner)',
  previewData: {
    reference: 'CVD-MSG-01002',
    fullName: 'Ananya Rao',
    workEmail: 'ananya.rao@example.com',
    organisation: 'Example Capital LLP',
    audience: 'Venture capital / investor',
    topic: 'Investment or funding conversation',
    message: 'We would like to discuss the RegTech rail thesis ahead of your Goa Buildathon showcase.',
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
const row = { fontSize: '15px', lineHeight: '1.5', margin: '0 0 14px', borderLeft: `2px solid ${RED}`, paddingLeft: '12px', whiteSpace: 'pre-line' as const }
const rowLabel = { fontSize: '10px', letterSpacing: '1.6px', color: '#777777' }
const footer = { fontSize: '11px', color: '#777777', margin: '0' }
