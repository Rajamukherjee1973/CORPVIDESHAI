// Federated routing + live threat-response model.
// Pure data + pure functions: the page replays these on a clock so investors
// and regulators watch the rail behave, rather than reading a description.

import { hash } from "@/lib/portal";
import type { Engine } from "@/lib/regulator";

/* ------------------------------------------------------------------ */
/* 1. Federated routing: treasury -> rail -> six regulator nodes       */
/* ------------------------------------------------------------------ */

export type NodeKind = "corporate" | "rail" | "bank" | "regulator";

export type FedNode = {
  id: string;
  label: string;
  kind: NodeKind;
  role: string;
  /** ms after submission when this node starts working */
  startMs: number;
  /** ms this node holds the packet */
  durationMs: number;
  engine: Engine;
  what: string;
  plain: string;
};

/** One submission, replayed in wall-clock milliseconds. */
export const FED_NODES: FedNode[] = [
  {
    id: "treasury",
    label: "Treasury operations",
    kind: "corporate",
    role: "Originating desk",
    startMs: 0,
    durationMs: 4000,
    engine: "manual",
    what: "Route election, Rule 7 headroom computation and the document set are sealed into one packet and signed with the treasurer's key.",
    plain: "The company's finance team fills the form once and locks it with a digital signature.",
  },
  {
    id: "gateway",
    label: "Rail gateway",
    kind: "rail",
    role: "Validation + fan-out",
    startMs: 4000,
    durationMs: 3000,
    engine: "langchain",
    what: "Schema, signature and completeness validated, then the packet is split into six regulator-scoped views — each authority receives only the fields its statute lets it see.",
    plain: "The rail checks the file is complete and then sends each regulator only the part that concerns them.",
  },
  {
    id: "ledger",
    label: "Federated ledger commit",
    kind: "rail",
    role: "Hash-chained block",
    startMs: 7000,
    durationMs: 2000,
    engine: "fabric",
    what: "Block written simultaneously to all eight nodes; a decision is valid only when a quorum of nodes holds the identical hash.",
    plain: "Everyone gets the same sealed copy at the same moment, so nobody can change it later on their own.",
  },
  {
    id: "adbank",
    label: "AD Category-I bank",
    kind: "bank",
    role: "Remitting channel",
    startMs: 9000,
    durationMs: 21000,
    engine: "alicloud",
    what: "Form A2 build, FEMA classification, sanctions rescreen and the funds-availability lock, running in parallel with the regulator window.",
    plain: "The bank prepares the actual money transfer while the regulators are still looking at the file.",
  },
  {
    id: "FIU-IND",
    label: "FIU-IND node",
    kind: "regulator",
    role: "Financial Intelligence Unit",
    startMs: 9000,
    durationMs: 11000,
    engine: "alicloud",
    what: "Beneficial ownership, PEP and sanctions screening across the whole step-down chain.",
    plain: "An automatic check confirms nobody behind the deal is on a watch list.",
  },
  {
    id: "DPIIT",
    label: "DPIIT node",
    kind: "regulator",
    role: "Sector conditions",
    startMs: 9000,
    durationMs: 14000,
    engine: "langchain",
    what: "Strategic-sector flags and sectoral conditions applied to the target activity.",
    plain: "The rules for that particular industry are applied automatically.",
  },
  {
    id: "CBDT",
    label: "CBDT node",
    kind: "regulator",
    role: "International taxation",
    startMs: 11000,
    durationMs: 26000,
    engine: "qwen",
    what: "Section 195 withholding and treaty relief tested against Form 15CA/CB, then signed by the assessing officer.",
    plain: "The tax office confirms the correct tax is held back before the money leaves.",
  },
  {
    id: "IFSCA",
    label: "IFSCA node",
    kind: "regulator",
    role: "GIFT IFSC conduct",
    startMs: 12000,
    durationMs: 30000,
    engine: "manual",
    what: "Unit conduct, offshore leg and the fund-flow route through the IFSC verified by the conduct desk.",
    plain: "The GIFT City authority checks the offshore side of the deal is properly run.",
  },
  {
    id: "MoF",
    label: "MoF (DEA) node",
    kind: "regulator",
    role: "Economic affairs",
    startMs: 14000,
    durationMs: 34000,
    engine: "manual",
    what: "Policy conformity for outbound capital of this size and corridor.",
    plain: "The finance ministry checks the deal fits national policy on money leaving India.",
  },
  {
    id: "RBI",
    label: "RBI node",
    kind: "regulator",
    role: "Overseas Investment Division",
    startMs: 16000,
    durationMs: 42000,
    engine: "manual",
    what: "Rule 10 justification, UIN allotment and the final release instruction to the AD bank.",
    plain: "The central bank takes the last call and releases the money.",
  },
];

export const RAIL_TOTAL_MS = FED_NODES.reduce((m, n) => Math.max(m, n.startMs + n.durationMs), 0);

export type NodePhase = "idle" | "active" | "done";

export function phaseOf(node: FedNode, t: number): NodePhase {
  if (t < node.startMs) return "idle";
  if (t < node.startMs + node.durationMs) return "active";
  return "done";
}

/** Gap between the gateway fan-out and each regulator picking the packet up. */
export function pickupGapMs(node: FedNode): number {
  return Math.max(0, node.startMs - 7000);
}

/* ------------------------------------------------------------------ */
/* 2. Threat theatre                                                   */
/* ------------------------------------------------------------------ */

export type Severity = "critical" | "high" | "elevated";

export type ResponseStep = {
  atMs: number;
  layer: string;
  action: string;
  plain: string;
  engine: Engine;
  kind: "detect" | "contain" | "verify" | "notify" | "restore";
};

export type Threat = {
  id: string;
  label: string;
  vector: string;
  severity: Severity;
  story: string;
  plain: string;
  /** what the attacker walks away with — always nothing, and why */
  outcome: string;
  steps: ResponseStep[];
};

export const THREATS: Threat[] = [
  {
    id: "credential",
    label: "Unauthorised access attempt",
    vector: "Stolen treasury credential replayed from an off-shore IP",
    severity: "high",
    story:
      "A valid-looking treasury login for the filing entity is presented from an unrecognised device in a jurisdiction the company does not operate from, three minutes after the real treasurer signed in from Mumbai.",
    plain:
      "Someone has the password but is not the person. The system notices the login is coming from the wrong device and the wrong country.",
    outcome:
      "Session never reaches the filing store. The attacker sees a locked desk; the genuine filing continues untouched on the regulator side.",
    steps: [
      { atMs: 0, layer: "Edge identity", action: "Device fingerprint and geo-velocity mismatch scored 0.94 against the enrolled treasury device.", plain: "The rail sees the same person apparently logging in from two countries minutes apart — impossible.", engine: "langchain", kind: "detect" },
      { atMs: 420, layer: "Session broker", action: "Session issued in shadow mode: read-only, zero data, every call mirrored to the forensic tap.", plain: "The intruder is let into an empty room that looks real, so we can watch without risking anything.", engine: "alicloud", kind: "contain" },
      { atMs: 1100, layer: "Role gate", action: "Filing scope resolved to zero records — corporate role can only reach its own entity, and this key is not bound to that entity.", plain: "Even with the password, the account is not allowed to see any filing.", engine: "manual", kind: "verify" },
      { atMs: 1900, layer: "Federated ledger", action: "Attempt written as a non-financial security event, hash-chained across all eight nodes.", plain: "The attempt itself is recorded permanently so it cannot be denied later.", engine: "fabric", kind: "verify" },
      { atMs: 2600, layer: "Notification bus", action: "Treasurer, AD bank compliance and FIU-IND node alerted with the evidence digest.", plain: "The company, its bank and the intelligence unit are told immediately.", engine: "langchain", kind: "notify" },
      { atMs: 3400, layer: "Credential authority", action: "Credential revoked, step-up re-enrolment required on the enrolled device; in-flight filing unaffected.", plain: "The stolen password stops working. The real application keeps moving.", engine: "manual", kind: "restore" },
    ],
  },
  {
    id: "tamper",
    label: "Ledger tamper attempt",
    vector: "Insider edits a cleared checkpoint on one regulator node",
    severity: "critical",
    story:
      "A privileged operator on one node rewrites the amount inside an already-cleared CBDT checkpoint, hoping the change propagates as the newest state.",
    plain:
      "Someone inside tries to quietly change a number that was already approved. Because every regulator holds a copy, the change does not match anyone else's copy.",
    outcome:
      "The edited block is orphaned in under two seconds. The rail keeps the original figure and the operator is named in the incident record.",
    steps: [
      { atMs: 0, layer: "Node ledger", action: "Local block rewritten; recomputed hash diverges from the parent chain at height 41,208.", plain: "The changed page no longer matches the seal that was put on it.", engine: "fabric", kind: "detect" },
      { atMs: 260, layer: "Quorum consensus", action: "7 of 8 nodes reject the proposed state; the divergent node is marked non-authoritative.", plain: "Seven other copies disagree, so the changed copy is ignored.", engine: "fabric", kind: "contain" },
      { atMs: 900, layer: "Forensic tap", action: "Diff isolated to a single field; operator identity, terminal and timestamp bound to the event.", plain: "The system shows exactly what was changed, by whom and from which machine.", engine: "alicloud", kind: "verify" },
      { atMs: 1500, layer: "Qwen statutory check", action: "Original figure re-verified against the Rule 7 computation and the 15CB certificate on file.", plain: "The correct number is re-proved from the original documents.", engine: "qwen", kind: "verify" },
      { atMs: 2200, layer: "Supervisory alert", action: "RBI and IFSCA supervisor desks receive a tamper notice with both hashes side by side.", plain: "Regulators see the real version and the fake version next to each other.", engine: "langchain", kind: "notify" },
      { atMs: 3000, layer: "Node recovery", action: "Divergent node resynchronised from quorum state; rejoins after replaying 1 block.", plain: "The affected copy is repaired from the good copies and returns to service.", engine: "fabric", kind: "restore" },
    ],
  },
  {
    id: "exfil",
    label: "Bulk data exfiltration",
    vector: "Automated scraping of cross-border filing records via a leaked API token",
    severity: "critical",
    story:
      "A leaked service token starts pulling filing records at 300 requests a second — hundreds of entities, all corridors, in one sweep.",
    plain:
      "A program tries to download everybody's data at once. Normal users never behave like that, so it stands out instantly.",
    outcome:
      "Roughly 40 records touched, all field-level encrypted and useless without the regulator key. Token dead in 1.6 seconds.",
    steps: [
      { atMs: 0, layer: "Behaviour model", action: "Read velocity 62× the 30-day baseline for this token; entity spread crosses 14 unrelated groups.", plain: "The rail knows how a normal user behaves and this is nothing like it.", engine: "langchain", kind: "detect" },
      { atMs: 300, layer: "Rate governor", action: "Token throttled to zero and quarantined mid-stream; open connections dropped.", plain: "The download is cut off while it is still running.", engine: "alicloud", kind: "contain" },
      { atMs: 800, layer: "Field encryption", action: "Records already served confirmed to be envelope-encrypted; plaintext never leaves the enclave.", plain: "Whatever was taken is scrambled and unreadable without a key the attacker does not have.", engine: "alicloud", kind: "verify" },
      { atMs: 1400, layer: "Federated ledger", action: "Exfiltration attempt hash-chained; touched records flagged for holder notification.", plain: "A permanent record is made of exactly which files were touched.", engine: "fabric", kind: "verify" },
      { atMs: 2100, layer: "Notification bus", action: "Affected treasuries, AD banks and FIU-IND notified within the same minute with the touched-record list.", plain: "Every company affected is told the same minute, with the exact list.", engine: "langchain", kind: "notify" },
      { atMs: 3100, layer: "Key rotation", action: "Service keys rotated across all nodes; new token issued under mutual TLS with entity binding.", plain: "All keys are replaced so the leaked one is worthless.", engine: "manual", kind: "restore" },
    ],
  },
  {
    id: "payment",
    label: "Payment instruction hijack",
    vector: "Beneficiary account substituted between clearance and SWIFT release",
    severity: "critical",
    story:
      "After clearance but before release, the beneficiary IBAN in the AD bank instruction is swapped for an account in a different hub — the classic cross-border fraud.",
    plain:
      "Someone tries to change the bank account the money goes to, at the last second. The rail compares it with the approved account and stops the payment.",
    outcome:
      "Release blocked before value leaves India. Zero rupees at risk; the corridor is frozen pending a signed regulator override.",
    steps: [
      { atMs: 0, layer: "Instruction integrity", action: "Beneficiary hash in the release message does not match the hash sealed at the clearance block.", plain: "The account number no longer matches the one that was approved.", engine: "fabric", kind: "detect" },
      { atMs: 350, layer: "Payment gate", action: "Release held; corridor to the substituted hub frozen for this reference.", plain: "The money is stopped before it leaves the country.", engine: "alicloud", kind: "contain" },
      { atMs: 1000, layer: "Qwen reasoning", action: "Substituted hub screened: no FEMA basis on this filing, no matching Form A2 leg.", plain: "The new account has no legal basis anywhere in the approved paperwork.", engine: "qwen", kind: "verify" },
      { atMs: 1700, layer: "Regulator quorum", action: "RBI and FIU-IND nodes co-sign the block; suspicious-transaction trigger armed.", plain: "Two authorities jointly confirm the block on the payment.", engine: "manual", kind: "notify" },
      { atMs: 2500, layer: "Treasury alert", action: "Treasurer and AD bank dealing room paged with both account fingerprints.", plain: "The company and its bank see the real account and the fake one side by side.", engine: "langchain", kind: "notify" },
      { atMs: 3300, layer: "Safe resume", action: "Filing resumes only on the originally sealed beneficiary, under a fresh signature.", plain: "Payment can only continue to the account that was approved in the first place.", engine: "manual", kind: "restore" },
    ],
  },
];

export const THREAT_TOTAL_MS = 4200;

export function digestFor(threatId: string, atMs: number) {
  return hash(`${threatId}|${atMs}|corpvidesh-security`).slice(0, 32);
}

export type RailStatus = "secure" | "detecting" | "contained" | "restored";

export function statusAt(threat: Threat | null, t: number): RailStatus {
  if (!threat) return "secure";
  const last = threat.steps[threat.steps.length - 1];
  if (last && t >= last.atMs) return "restored";
  if (t >= (threat.steps[1]?.atMs ?? 0)) return "contained";
  return "detecting";
}
