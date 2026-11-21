import { evaluateLegalCase } from "./services/legal-policy";
import type { LegalCase } from "./services/contracts";
import { DEMO_REVIEWERS } from "./treasury-scenario";

export type DocumentCheck = { id: string; title: string; detail: string; source: string };
export function investmentChecklist(investment: "ODI" | "OPI", nocRequired: boolean): DocumentCheck[] {
  return [
    { id: "authority", title: "Corporate authority & investment rationale", detail: "Board / shareholder authority and applicable Companies Act review.", source: "companies" },
    { id: "financials", title: "Audited net worth & exposure schedule", detail: "Confirm category-specific existing commitments, guarantees and the certified net-worth basis; sample figures are not evidence.", source: "oi-rules" },
    { id: "classification", title: "Instrument, activity & ownership/control", detail: "Confirm ODI/OPI classification, foreign entity activity, investor eligibility and any required sector consent.", source: "oi-rules" },
    { id: "kyc", title: "KYC, beneficial owners & source of funds", detail: "Designated bank due diligence and sanctions screening; not an FIU approval certificate.", source: "pmla" },
    { id: "valuation", title: "Pricing / valuation & transaction agreement", detail: "Applicable arm’s-length valuation and instrument/subscription terms for bank review.", source: "oi-regulations" },
    { id: "reporting", title: investment === "ODI" ? "Form FC / UIN & continuing reporting review" : "Applicable OPI reporting & holdings schedule", detail: investment === "ODI" ? "Confirm Form FC/UIN, investment evidence and APR applicability/timing with the AD bank." : "Confirm applicable half-yearly OPI reporting with the AD bank. Form FC is not the OPI reporting form.", source: "oi-directions" },
    { id: "tax", title: "Tax chargeability & remittance-form review", detail: "15CA/15CB and TRC/Form 10F only where applicable; no generic withholding on investment principal.", source: "tax" },
    { id: "settlement", title: "Bank mandate & settlement arrangement", detail: "Currency, account, permitted payment mode and IFSC/IBU applicability; GIFT routing is not mandatory for every investment.", source: "ifsca" },
    ...(nocRequired ? [{ id: "noc", title: "Required NOC / documented deemed-NOC basis", detail: "Where NPA, wilful-defaulter or investigation provisions apply, confirm the required lender/authority evidence.", source: "oi-rules" }] : []),
  ];
}

export function workflowDecision(facts: LegalCase, checklist: DocumentCheck[], acknowledged: string[]) {
  const complete = checklist.every((d) => acknowledged.includes(d.id));
  const assessment = evaluateLegalCase({ ...facts, evidenceComplete: complete });
  return { complete, assessment, canSimulate: complete && assessment.route !== "Hold / specialist review", handoff: assessment.route === "Prior approval review" ? "Approval" as const : "Automatic" as const };
}

export type DemoEvent = { index: number; atSecond: number; desk: string; action: string; packet: string; previousHash: string; hash: string };
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), (b) => b.toString(16).padStart(2, "0")).join("");
const eventBody = ({ hash: _hash, ...body }: DemoEvent) => JSON.stringify(body);
export async function buildWorkflowChain(packet: string, route: "Automatic" | "Approval"): Promise<DemoEvent[]> {
  const steps = [
    { desk: "Treasury", action: "Checklist acknowledgement packet sealed", atSecond: 0 },
    { desk: "AD Category-I bank", action: "Demo bank review recorded", atSecond: 35 },
    ...DEMO_REVIEWERS.map((r, i) => ({ desk: r.code, action: `${r.lens} · simulated response`, atSecond: 65 + i * 5 })),
    { desk: route === "Approval" ? "RBI prior-approval handoff" : "AD-bank automatic-route handoff", action: route === "Approval" ? "Demo referral to prior-approval process; no approval granted" : "Demo eligible-path acknowledgement; no regulator approval required merely for automatic route", atSecond: route === "Approval" ? 210 : 110 },
    { desk: "GIFT IBU / settlement desk", action: "Conditional demo settlement instruction; no money moved", atSecond: route === "Approval" ? 240 : 140 },
  ];
  const chain: DemoEvent[] = [];
  for (const step of steps) {
    const event: DemoEvent = { ...step, index: chain.length, packet, previousHash: chain.at(-1)?.hash ?? "GENESIS", hash: "" };
    event.hash = await digest(eventBody(event));
    chain.push(event);
  }
  return chain;
}
export async function verifyWorkflowChain(chain: DemoEvent[]): Promise<boolean> {
  if (!chain.length) return false;
  for (const [index, event] of chain.entries()) {
    if (event.index !== index || event.previousHash !== (chain[index - 1]?.hash ?? "GENESIS") || event.hash !== await digest(eventBody(event))) return false;
  }
  return true;
}