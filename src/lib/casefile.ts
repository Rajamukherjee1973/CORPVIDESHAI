// One worked case file, end to end.
//
// Two datasets live here:
//   1. CASE  — a sample monetary dataset for a single outbound remittance,
//              and the pure computation pipeline that turns the treasury
//              input into the amount actually credited abroad.
//   2. AUDIT — the regulator-side audit timeline: when each authority picked
//              the packet up, what it ran in parallel, and the gaps between
//              hand-offs.
// Everything is pure so the page can replay it on a clock.

import type { Engine } from "@/lib/regulator";
import { hash } from "@/lib/portal";

/* ------------------------------------------------------------------ */
/* 1. Sample monetary dataset                                          */
/* ------------------------------------------------------------------ */

export type CaseInput = {
  ref: string;
  company: string;
  cin: string;
  adBank: string;
  targetHub: string;
  targetCurrency: string;
  purpose: string;
  /** audited net worth, INR */
  netWorth: number;
  /** financial commitment already outstanding, INR */
  existingCommitment: number;
  /** amount the treasury wants to send now, INR */
  proposed: number;
  /** INR per unit of target currency */
  fxRate: number;
  /** AD bank margin over the interbank mid, in paise per unit */
  fxSpreadPaise: number;
  /** section 195 withholding rate applied to the taxable component */
  tdsRate: number;
  /** portion of the remittance that is income in the payee's hands */
  taxableShare: number;
  bankCharges: number;
  gstOnCharges: number;
  correspondentFeeFx: number;
};

export const CASE: CaseInput = {
  ref: "CV-ODI-2026-004417",
  company: "Bharat Industrials Limited",
  cin: "L27100MH1994PLC078451",
  adBank: "HDFC Bank — AD Cat-I, Mumbai",
  targetHub: "Singapore",
  targetCurrency: "SGD",
  purpose: "Equity subscription in a wholly owned overseas subsidiary (ODI)",
  netWorth: 8_42_00_00_000, // INR 842 crore
  existingCommitment: 21_60_00_00_000, // INR 2,160 crore
  proposed: 4_75_00_00_000, // INR 475 crore
  fxRate: 63.42,
  fxSpreadPaise: 11,
  tdsRate: 0.1,
  taxableShare: 0,
  bankCharges: 1_25_000,
  gstOnCharges: 0.18,
  correspondentFeeFx: 950,
};

export const RULE7_MULTIPLE = 4; // 400% of net worth

export type CalcStep = {
  id: string;
  title: string;
  engine: Engine;
  /** named inputs consumed at this step */
  inputs: { label: string; value: string }[];
  formula: string;
  /** headline output of this step */
  output: { label: string; value: string };
  note: string;
  plain: string;
};

export const inr = (n: number) =>
  `₹ ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;

export const crore = (n: number) =>
  `₹ ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n / 1_00_00_000)} cr`;

export const fx = (n: number, ccy: string) =>
  `${ccy} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)}`;

export type CaseResult = {
  ceiling: number;
  utilised: number;
  afterThisDeal: number;
  headroom: number;
  utilisationPct: number;
  route: "Automatic" | "Approval";
  dealtRate: number;
  grossFx: number;
  tds: number;
  charges: number;
  gst: number;
  debitToAccount: number;
  netCredited: number;
  steps: CalcStep[];
};

/** The whole money pipeline: treasury input at the top, credited amount at the bottom. */
export function computeCase(c: CaseInput = CASE): CaseResult {
  const ceiling = c.netWorth * RULE7_MULTIPLE;
  const utilised = c.existingCommitment;
  const afterThisDeal = utilised + c.proposed;
  const headroom = ceiling - afterThisDeal;
  const utilisationPct = (afterThisDeal / ceiling) * 100;
  const route: "Automatic" | "Approval" = afterThisDeal <= ceiling ? "Automatic" : "Approval";

  const dealtRate = c.fxRate + c.fxSpreadPaise / 100;
  const grossFx = c.proposed / dealtRate;
  const taxable = c.proposed * c.taxableShare;
  const tds = taxable * c.tdsRate;
  const charges = c.bankCharges;
  const gst = charges * c.gstOnCharges;
  const debitToAccount = c.proposed + tds + charges + gst;
  const netCredited = grossFx - c.correspondentFeeFx;

  const steps: CalcStep[] = [
    {
      id: "intake",
      title: "01 · Treasury input captured",
      engine: "manual",
      inputs: [
        { label: "Audited net worth", value: crore(c.netWorth) },
        { label: "Existing financial commitment", value: crore(c.existingCommitment) },
        { label: "Amount proposed now", value: crore(c.proposed) },
        { label: "Destination", value: `${c.targetHub} · ${c.targetCurrency}` },
      ],
      formula: "Signed treasury packet = net worth + outstanding commitment + proposed amount + purpose",
      output: { label: "Packet sealed", value: c.ref },
      note: "Figures are pulled from the last audited balance sheet certified under section 143, and the packet is signed with the treasurer's key before anything else runs.",
      plain: "The finance team enters three numbers once — what the company is worth, what it has already sent abroad, and what it wants to send now.",
    },
    {
      id: "rule7",
      title: "02 · Rule 7 ceiling computed",
      engine: "qwen",
      inputs: [
        { label: "Net worth", value: crore(c.netWorth) },
        { label: "Statutory multiple", value: "400%" },
      ],
      formula: `Ceiling = net worth × 4 = ${crore(c.netWorth)} × 4`,
      output: { label: "Total permissible commitment", value: crore(ceiling) },
      note: "Rule 7, Foreign Exchange Management (Overseas Investment) Rules 2022 — total financial commitment may not exceed 400% of net worth.",
      plain: "The law lets a company commit up to four times what it is worth. That is the ceiling for everything it sends abroad.",
    },
    {
      id: "headroom",
      title: "03 · Headroom and route elected",
      engine: "qwen",
      inputs: [
        { label: "Ceiling", value: crore(ceiling) },
        { label: "Already committed", value: crore(utilised) },
        { label: "This deal", value: crore(c.proposed) },
      ],
      formula: `Headroom = ${crore(ceiling)} − (${crore(utilised)} + ${crore(c.proposed)})`,
      output: { label: `Remaining headroom · ${route} route`, value: crore(headroom) },
      note:
        route === "Automatic"
          ? `Utilisation after this deal is ${utilisationPct.toFixed(1)}% of the ceiling, so the filing rides the Automatic route: no prior approval, post-facto reporting only.`
          : `Utilisation after this deal is ${utilisationPct.toFixed(1)}% of the ceiling — the 400% limit is breached by ${crore(Math.abs(headroom))}, so Rule 8 prior approval of the Reserve Bank is mandatory before any rupee leaves.`,
      plain:
        route === "Automatic"
          ? "Adding this deal still keeps the company under the legal limit, so it does not need to ask permission first — it just has to report it."
          : "This deal pushes the company past the legal limit, so it cannot simply send the money. It must first ask the Reserve Bank for permission, and every authority signs by hand.",
    },
    {
      id: "screen",
      title: "04 · Counterparty and sanctions screening",
      engine: "alicloud",
      inputs: [
        { label: "Beneficiary chain", value: "3 step-down entities" },
        { label: "Lists checked", value: "UNSC · OFAC · MHA · internal" },
      ],
      formula: "Screen(beneficial owners ∪ directors ∪ step-down chain) against watch lists",
      output: { label: "Screening result", value: "0 hits · cleared" },
      note: "Runs in an India-resident region; the whole ownership chain is screened, not just the immediate payee.",
      plain: "The system checks that nobody behind the receiving company is on any banned list.",
    },
    {
      id: "tax",
      title: "05 · Section 195 withholding tested",
      engine: "qwen",
      inputs: [
        { label: "Remittance", value: crore(c.proposed) },
        { label: "Income component", value: `${(c.taxableShare * 100).toFixed(0)}%` },
        { label: "Rate if taxable", value: `${(c.tdsRate * 100).toFixed(0)}%` },
      ],
      formula: `TDS = ${crore(c.proposed)} × ${(c.taxableShare * 100).toFixed(0)}% × ${(c.tdsRate * 100).toFixed(0)}%`,
      output: { label: "Tax withheld", value: inr(tds) },
      note: "Equity subscription is a capital contribution, not income in the payee's hands, so nothing is withheld — the conclusion is written into Form 15CA/15CB with the reasoning quoted.",
      plain: "Tax is only held back when the money is somebody's income. Buying shares in your own subsidiary is not income, so no tax is deducted — but the reason is recorded.",
    },
    {
      id: "fxleg",
      title: "06 · Foreign exchange leg priced",
      engine: "alicloud",
      inputs: [
        { label: "Interbank mid", value: `₹ ${c.fxRate.toFixed(2)} / ${c.targetCurrency}` },
        { label: "AD bank margin", value: `${c.fxSpreadPaise} paise` },
        { label: "Principal", value: crore(c.proposed) },
      ],
      formula: `Gross FX = ${crore(c.proposed)} ÷ ₹ ${dealtRate.toFixed(2)}`,
      output: { label: "Gross foreign currency", value: fx(grossFx, c.targetCurrency) },
      note: "The dealt rate, the mid and the margin are all sealed into the block, so the pricing can be re-audited years later.",
      plain: "The rupees are converted at a rate that is recorded permanently, so nobody can argue about the price afterwards.",
    },
    {
      id: "charges",
      title: "07 · Charges, GST and the rupee debit",
      engine: "langchain",
      inputs: [
        { label: "Bank charges", value: inr(charges) },
        { label: "GST @ 18%", value: inr(gst) },
        { label: "TDS", value: inr(tds) },
      ],
      formula: `Debit = ${crore(c.proposed)} + ${inr(tds)} + ${inr(charges)} + ${inr(gst)}`,
      output: { label: "Total debited in India", value: inr(debitToAccount) },
      note: "Every rupee leaving the account is itemised against the statute or contract that authorises it.",
      plain: "This is the exact amount taken out of the Indian bank account, including the bank's fee and the tax on that fee.",
    },
    {
      id: "settle",
      title: "08 · Settlement abroad",
      engine: "fabric",
      inputs: [
        { label: "Gross FX", value: fx(grossFx, c.targetCurrency) },
        { label: "Correspondent fee", value: fx(c.correspondentFeeFx, c.targetCurrency) },
      ],
      formula: `Credited = ${fx(grossFx, c.targetCurrency)} − ${fx(c.correspondentFeeFx, c.targetCurrency)}`,
      output: { label: `Credited in ${c.targetHub}`, value: fx(netCredited, c.targetCurrency) },
      note: "The credited figure, the UIN and the evidence digest are committed to the same block every regulator node holds.",
      plain: "This is what actually lands in the overseas account after the intermediary bank takes its cut.",
    },
  ];

  return {
    ceiling,
    utilised,
    afterThisDeal,
    headroom,
    utilisationPct,
    route,
    dealtRate,
    grossFx,
    tds,
    charges,
    gst,
    debitToAccount,
    netCredited,
    steps,
  };
}

/* ------------------------------------------------------------------ */
/* 2. Regulator-side audit timeline                                    */
/* ------------------------------------------------------------------ */

export type ParallelTask = {
  label: string;
  /** offset from this regulator's pickup, in seconds */
  atS: number;
  durationS: number;
  engine: Engine;
  result: string;
};

export type AuditActor = {
  code: string;
  authority: string;
  officer: string;
  desk: string;
  /** seconds after the packet was dispatched by the rail gateway */
  pickupS: number;
  durationS: number;
  mode: "manual" | "automated";
  mandate: string;
  plain: string;
  tasks: ParallelTask[];
  outcome: string;
};

/** Seconds from treasury submission to gateway dispatch. */
export const DISPATCH_S = 42;

export const AUDIT_ACTORS: AuditActor[] = [
  {
    code: "FIU-IND",
    authority: "Financial Intelligence Unit — India",
    officer: "Deputy Director S. Raghavan",
    desk: "Cross-border reporting cell",
    pickupS: 4,
    durationS: 61,
    mode: "automated",
    mandate: "PMLA reporting: beneficial ownership, PEP exposure and sanctions across the step-down chain.",
    plain: "Checks nobody behind the deal is on a watch list, and that the money's origin is clean.",
    tasks: [
      { label: "UBO chain resolution (3 levels)", atS: 0, durationS: 18, engine: "alicloud", result: "3 entities resolved, no nominee gap" },
      { label: "Sanctions and PEP screen", atS: 4, durationS: 26, engine: "alicloud", result: "0 hits across 4 lists" },
      { label: "Corridor typology score", atS: 20, durationS: 24, engine: "langchain", result: "Score 0.11 — below the reporting trigger" },
      { label: "STR decision logged", atS: 46, durationS: 15, engine: "fabric", result: "No suspicious transaction report raised" },
    ],
    outcome: "Cleared with no report raised. Digest committed at T+107s.",
  },
  {
    code: "DPIIT",
    authority: "Dept. for Promotion of Industry and Internal Trade",
    officer: "Under Secretary M. Kulkarni",
    desk: "Sectoral conditions desk",
    pickupS: 7,
    durationS: 78,
    mode: "automated",
    mandate: "Sectoral conditions and strategic-sector flags for the overseas activity code.",
    plain: "Confirms this industry is allowed to invest abroad on these terms.",
    tasks: [
      { label: "Activity code mapped to NIC/ISIC", atS: 0, durationS: 12, engine: "langchain", result: "Industrial machinery — non-strategic" },
      { label: "Strategic-sector flag test", atS: 8, durationS: 21, engine: "qwen", result: "No defence / telecom / space overlap" },
      { label: "Conditions library applied", atS: 26, durationS: 33, engine: "qwen", result: "2 standard conditions attached" },
      { label: "Sector clearance sealed", atS: 62, durationS: 16, engine: "fabric", result: "Conditions bound to the UIN" },
    ],
    outcome: "Cleared with two standing conditions. Digest committed at T+127s.",
  },
  {
    code: "CBDT",
    authority: "Central Board of Direct Taxes",
    officer: "ITO (Intl. Taxation) R. Banerjee",
    desk: "Ward 2(1) — international taxation",
    pickupS: 11,
    durationS: 96,
    mode: "manual",
    mandate: "Section 195 withholding, treaty relief and the 15CA/15CB pair.",
    plain: "Decides whether tax must be held back before the money leaves, and signs off on it.",
    tasks: [
      { label: "15CB certificate parsed against the invoice set", atS: 0, durationS: 22, engine: "langchain", result: "Certificate matches the remittance" },
      { label: "Character of payment tested", atS: 14, durationS: 31, engine: "qwen", result: "Capital contribution — not income" },
      { label: "India–Singapore DTAA Article 13 read", atS: 30, durationS: 27, engine: "qwen", result: "No withholding obligation arises" },
      { label: "Assessing officer signature", atS: 68, durationS: 28, engine: "manual", result: "Signed by R. Banerjee, 15CA Part D issued" },
    ],
    outcome: "Nil withholding confirmed and signed. Digest committed at T+149s.",
  },
  {
    code: "IFSCA",
    authority: "International Financial Services Centres Authority",
    officer: "AGM P. Trivedi",
    desk: "GIFT IFSC conduct supervision",
    pickupS: 15,
    durationS: 112,
    mode: "manual",
    mandate: "Conduct of the IFSC unit routing the leg, and the offshore structure at the far end.",
    plain: "Checks the GIFT City side of the transaction is properly run and the offshore entity is real.",
    tasks: [
      { label: "IFSC unit licence and conduct history", atS: 0, durationS: 24, engine: "alicloud", result: "Licence valid, no open conduct matter" },
      { label: "Fund-flow route reconstructed", atS: 18, durationS: 36, engine: "langchain", result: "Single-leg route, no circular flow" },
      { label: "Offshore entity substance test", atS: 44, durationS: 34, engine: "qwen", result: "Substance evidenced — staff, premises, board" },
      { label: "Conduct desk sign-off", atS: 82, durationS: 30, engine: "manual", result: "Signed by P. Trivedi" },
    ],
    outcome: "Conduct cleared. Digest committed at T+169s.",
  },
  {
    code: "MoF",
    authority: "Ministry of Finance — Dept. of Economic Affairs",
    officer: "Director (ECB & ODI) A. Sharma",
    desk: "Capital flows policy",
    pickupS: 19,
    durationS: 121,
    mode: "manual",
    mandate: "Policy conformity for outbound capital of this size on this corridor.",
    plain: "Confirms a deal of this size fits national policy on money leaving the country.",
    tasks: [
      { label: "Corridor exposure aggregated", atS: 0, durationS: 28, engine: "alicloud", result: "Singapore corridor within monthly band" },
      { label: "Size band and precedent check", atS: 22, durationS: 34, engine: "langchain", result: "Band 3 — routine, 41 precedents" },
      { label: "Policy conformity opinion", atS: 58, durationS: 33, engine: "qwen", result: "Conforms; no referral to the committee" },
      { label: "Director's noting", atS: 94, durationS: 27, engine: "manual", result: "Noted by A. Sharma" },
    ],
    outcome: "Policy conformity noted. Digest committed at T+182s.",
  },
  {
    code: "RBI",
    authority: "Reserve Bank of India — Overseas Investment Division",
    officer: "General Manager K. Iyer",
    desk: "FED, Central Office",
    pickupS: 24,
    durationS: 147,
    mode: "manual",
    mandate: "Rule 7 justification, UIN allotment and the release instruction to the AD bank.",
    plain: "Takes the final call, issues the identification number and tells the bank it may release the money.",
    tasks: [
      { label: "Rule 7 arithmetic re-proved independently", atS: 0, durationS: 26, engine: "qwen", result: "Ceiling and headroom reproduced exactly" },
      { label: "Five upstream digests verified against quorum", atS: 20, durationS: 31, engine: "fabric", result: "5/5 match, quorum 8/8" },
      { label: "UIN allotment", atS: 56, durationS: 34, engine: "manual", result: "UIN allotted to the reference" },
      { label: "Release instruction to the AD bank", atS: 96, durationS: 51, engine: "manual", result: "Signed by K. Iyer — release authorised" },
    ],
    outcome: "UIN allotted and release authorised. Digest committed at T+213s.",
  },
];

export const AUDIT_TOTAL_S =
  DISPATCH_S + Math.max(...AUDIT_ACTORS.map((a) => a.pickupS + a.durationS));

export type GapRow = {
  code: string;
  /** absolute second the packet was picked up, measured from submission */
  pickupAtS: number;
  /** wait between gateway dispatch and pickup */
  waitS: number;
  /** gap from the previous authority's pickup */
  staggerS: number;
  finishAtS: number;
  durationS: number;
  /** seconds this actor overlapped with at least one other actor */
  overlapS: number;
};

/** Pickup, wait, stagger, finish and overlap for every authority. */
export function gapRows(actors: AuditActor[] = AUDIT_ACTORS, dispatch = DISPATCH_S): GapRow[] {
  const sorted = [...actors].sort((a, b) => a.pickupS - b.pickupS);
  return sorted.map((a, i) => {
    const start = dispatch + a.pickupS;
    const end = start + a.durationS;
    const prev = sorted[i - 1];
    let overlap = 0;
    for (const o of sorted) {
      if (o.code === a.code) continue;
      const os = dispatch + o.pickupS;
      const oe = os + o.durationS;
      overlap = Math.max(overlap, Math.max(0, Math.min(end, oe) - Math.max(start, os)));
    }
    return {
      code: a.code,
      pickupAtS: start,
      waitS: a.pickupS,
      staggerS: prev ? a.pickupS - prev.pickupS : 0,
      finishAtS: end,
      durationS: a.durationS,
      overlapS: overlap,
    };
  });
}

/** Sequential cost of the same work if each authority waited for the last one. */
export function sequentialSeconds(actors: AuditActor[] = AUDIT_ACTORS, dispatch = DISPATCH_S) {
  return dispatch + actors.reduce((s, a) => s + a.durationS, 0);
}

/* ------------------------------------------------------------------ */
/* 3. Scenarios: built-in datasets and any dataset the user supplies   */
/* ------------------------------------------------------------------ */

export type Scenario = {
  id: string;
  label: string;
  blurb: string;
  input: CaseInput;
  builtIn: boolean;
};

const ONGC_BASE: Omit<CaseInput, "proposed" | "ref"> = {
  company: "Oil and Natural Gas Corporation Limited",
  cin: "L74899DL1993GOI054155",
  adBank: "State Bank of India — AD Cat-I, Mumbai",
  targetHub: "Singapore",
  targetCurrency: "SGD",
  purpose: "Equity subscription in an overseas wholly owned E&P subsidiary (ODI)",
  netWorth: 2_50_00_00_00_000, // INR 25,000 crore
  existingCommitment: 40_00_00_00_000, // INR 4,000 crore
  fxRate: 63.42,
  fxSpreadPaise: 11,
  tdsRate: 0.1,
  taxableShare: 0,
  bankCharges: 1_25_000,
  gstOnCharges: 0.18,
  correspondentFeeFx: 950,
};

export const ONGC_AUTOMATIC: CaseInput = {
  ...ONGC_BASE,
  ref: "CV-ODI-2026-ONGC-475",
  proposed: 4_75_00_00_000, // INR 475 crore
};

export const ONGC_APPROVAL: CaseInput = {
  ...ONGC_BASE,
  ref: "CV-ODI-2026-ONGC-475K",
  proposed: 47_50_00_00_00_000, // INR 4,75,000 crore
};

export const SCENARIOS: Scenario[] = [
  {
    id: "ongc-automatic",
    label: "ONGC · ₹475 cr · Automatic route",
    blurb:
      "Commitment stays well inside the 400% ceiling, so the filing rides the Automatic route: no prior approval, machine clearance, post-facto reporting.",
    input: ONGC_AUTOMATIC,
    builtIn: true,
  },
  {
    id: "ongc-approval",
    label: "ONGC · ₹4,75,000 cr · Approval route",
    blurb:
      "The same company, a thousand times the ticket. The proposal breaches the 400% ceiling, so the packet is forced onto the Approval route with human sign-off at every authority.",
    input: ONGC_APPROVAL,
    builtIn: true,
  },
  {
    id: "bharat",
    label: "Bharat Industrials · ₹475 cr · Built-in case",
    blurb: "The original worked case file shipped with the platform.",
    input: CASE,
    builtIn: true,
  },
];

/** Extra work a breached ceiling forces on every desk. */
const APPROVAL_TASKS: Record<string, ParallelTask[]> = {
  RBI: [
    { label: "Rule 8 approval memorandum drafted", atS: 150, durationS: 96, engine: "qwen", result: "Memorandum with justification and precedents" },
    { label: "Committee on overseas investment convened", atS: 240, durationS: 132, engine: "manual", result: "Referred and heard — approval recommended" },
    { label: "Approval order signed and UIN allotted", atS: 370, durationS: 84, engine: "manual", result: "Prior approval granted under Rule 8" },
  ],
  MoF: [
    { label: "Macro-prudential impact note on the corridor", atS: 130, durationS: 110, engine: "qwen", result: "Outflow of this size flagged for phasing" },
    { label: "Secretary-level concurrence", atS: 250, durationS: 96, engine: "manual", result: "Concurred with staged drawdown" },
  ],
  CBDT: [
    { label: "Transfer-pricing and GAAR pre-read", atS: 110, durationS: 92, engine: "qwen", result: "No impermissible arrangement identified" },
  ],
  IFSCA: [
    { label: "Large-exposure conduct review of the IFSC unit", atS: 120, durationS: 88, engine: "alicloud", result: "Unit capital adequate for the leg" },
  ],
  FIU: [
    { label: "Enhanced due diligence on a large-value corridor", atS: 70, durationS: 74, engine: "alicloud", result: "EDD complete, no adverse finding" },
  ],
  DPIIT: [
    { label: "Strategic-sector re-test at large exposure", atS: 90, durationS: 66, engine: "qwen", result: "Energy — cleared with reporting condition" },
  ],
};

export type Timeline = {
  actors: AuditActor[];
  dispatchS: number;
  totalS: number;
};

/** Timeline for any dataset: Automatic replays the base rail, Approval adds prior-approval work. */
export function timelineFor(input: CaseInput): Timeline {
  const route = computeCase(input).route;
  if (route === "Automatic") {
    return { actors: AUDIT_ACTORS, dispatchS: DISPATCH_S, totalS: AUDIT_TOTAL_S };
  }
  const dispatchS = DISPATCH_S + 38; // heavier packet, more validation before fan-out
  const actors = AUDIT_ACTORS.map((a) => {
    const key = a.code.startsWith("FIU") ? "FIU" : a.code;
    const extra = APPROVAL_TASKS[key] ?? [];
    const tasks = [...a.tasks, ...extra];
    const durationS = Math.max(
      Math.round(a.durationS * 1.6),
      ...tasks.map((t) => t.atS + t.durationS),
    );
    return {
      ...a,
      mode: "manual" as const,
      pickupS: Math.round(a.pickupS * 1.8),
      durationS,
      tasks,
      outcome:
        a.code === "RBI"
          ? "Prior approval granted under Rule 8; UIN allotted and release authorised."
          : `${a.outcome} Approval-route addendum filed.`,
    };
  });
  const totalS = dispatchS + Math.max(...actors.map((a) => a.pickupS + a.durationS));
  return { actors, dispatchS, totalS };
}

export function digestFor(code: string, tag: string) {
  return hash(`${CASE.ref}:${code}:${tag}`).slice(0, 16);
}

export const mmss = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
};
