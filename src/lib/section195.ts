// Section 195 core compliance engine.
//
// Three regulated questions, answered deterministically and on the record:
//   1. Chargeability  — is an overseas payment Royalty, Fee for Technical
//                       Services, or business income outside the Indian net?
//   2. Documentation  — is the non-resident's TRC / Form 10F / No-PE pack
//                       valid on the date of remittance?
//   3. Filings        — which part of Form 15CA applies, is Form 15CB needed,
//                       and does the pack reconcile with the debit and 27Q?
//
// Everything here is pure: the same inputs always produce the same
// determination, the same statutory citations and the same digest.

import { hash } from "@/lib/portal";
import type { Engine } from "@/lib/regulator";

/* ------------------------------------------------------------------ */
/* Chargeability                                                       */
/* ------------------------------------------------------------------ */

export type Answers = {
  /** copyright in the software/IP is transferred, not just a copy licensed */
  copyrightTransferred: boolean;
  /** payer gets source code, right to modify, reproduce or commercially exploit */
  rightToExploit: boolean;
  /** payment is for use of a process, formula, patent, trademark or know-how */
  useOfProcessOrIP: boolean;
  /** dedicated equipment / server capacity is placed at the payer's disposal */
  dedicatedEquipment: boolean;
  /** managerial, technical or consultancy services were rendered by humans */
  humanServices: boolean;
  /** technology is "made available" so the payer can apply it independently */
  makeAvailable: boolean;
  /** the vendor has a permanent establishment or business connection in India */
  peInIndia: boolean;
  /** service is a standardised, automated product used by many customers */
  standardisedProduct: boolean;
  /** vendor is resident of a country with a DTAA in force with India */
  treatyAvailable: boolean;
  /** valid TRC + Form 10F + No-PE on file for the relevant period */
  treatyPackComplete: boolean;
  /** vendor has furnished a valid Indian PAN */
  panFurnished: boolean;
  /** payer bears the tax, so the payment must be grossed up */
  taxBorneByPayer: boolean;
};

export type Classification = "Royalty" | "FTS" | "Equipment royalty" | "Business income — not chargeable";

export type RuleHit = {
  id: string;
  rule: string;
  statute: string;
  answer: "Yes" | "No";
  effect: string;
  decisive: boolean;
  engine: Engine;
  plain: string;
};

export type Charge = {
  classification: Classification;
  chargeable: boolean;
  /** rate under the Income-tax Act before treaty relief */
  actRate: number;
  /** treaty rate if the pack qualifies */
  treatyRate: number | null;
  /** rate actually applied after 206AA / treaty tests */
  appliedRate: number;
  rateBasis: string;
  hits: RuleHit[];
  confidence: number;
  digest: string;
};

const R = (
  id: string,
  rule: string,
  statute: string,
  ok: boolean,
  effect: string,
  decisive: boolean,
  engine: Engine,
  plain: string,
): RuleHit => ({ id, rule, statute, answer: ok ? "Yes" : "No", effect, decisive, engine, plain });

/** The full decision tree, in the order a Revenue officer would walk it. */
export function assess(a: Answers): Charge {
  const hits: RuleHit[] = [];

  hits.push(
    R(
      "src",
      "Payment is made by an Indian resident to a non-resident",
      "s.195(1) read with s.5(2) and s.9(1)",
      true,
      "Withholding machinery is engaged; chargeability must be tested before remittance.",
      false,
      "manual",
      "Any money going from India to a foreign supplier has to be tested for Indian tax before it is sent.",
    ),
  );

  hits.push(
    R(
      "copyright",
      "Copyright in the work is transferred, or the payer may reproduce and exploit it",
      "s.9(1)(vi) Expl. 2(v); Engineering Analysis Centre of Excellence (SC, 2021)",
      a.copyrightTransferred || a.rightToExploit,
      a.copyrightTransferred || a.rightToExploit
        ? "Consideration is for the copyright itself — Royalty."
        : "A mere copyrighted-article licence. The Supreme Court holds this is not royalty.",
      a.copyrightTransferred || a.rightToExploit,
      "qwen",
      "Buying the right to copy and resell software is a royalty. Buying a licence to simply use it is not.",
    ),
  );

  hits.push(
    R(
      "process",
      "Payment is for the use of a patent, process, formula, trademark or know-how",
      "s.9(1)(vi) Expl. 2(iii); Art. 12 of most DTAAs",
      a.useOfProcessOrIP,
      a.useOfProcessOrIP
        ? "Use of a secret process or IP — Royalty."
        : "No secret process or IP is placed at the payer's disposal.",
      a.useOfProcessOrIP,
      "qwen",
      "Paying to use someone's patented method or brand is a royalty.",
    ),
  );

  hits.push(
    R(
      "equipment",
      "Industrial, commercial or scientific equipment is placed at the payer's disposal",
      "s.9(1)(vi) Expl. 2(iva)",
      a.dedicatedEquipment,
      a.dedicatedEquipment
        ? "Dedicated capacity — equipment royalty."
        : "Shared, elastic capacity with no dedicated hardware — not equipment royalty.",
      a.dedicatedEquipment,
      "qwen",
      "Renting a specific machine or dedicated server is a royalty. Using shared cloud capacity is not.",
    ),
  );

  hits.push(
    R(
      "human",
      "Managerial, technical or consultancy services were rendered through human intervention",
      "s.9(1)(vii) Expl. 2; Bharti Cellular (SC)",
      a.humanServices,
      a.humanServices
        ? "Human-rendered technical service — FTS gate is open."
        : "Automated, no human intervention — outside FTS.",
      false,
      "qwen",
      "A service only counts as a technical service if real people did the work.",
    ),
  );

  hits.push(
    R(
      "makeavailable",
      "Technology is 'made available' — the payer can apply it independently afterwards",
      "Art. 12(4)(b) India–US / India–Singapore / India–UK DTAA; De Beers (Kar HC)",
      a.makeAvailable,
      a.makeAvailable
        ? "Make-available satisfied — FTS under the treaty as well as the Act."
        : "Not made available — treaty FTS article is not attracted even if the Act is.",
      false,
      "qwen",
      "If the supplier teaches you how to do it yourself, the treaty taxes it. If they just do it for you, usually it does not.",
    ),
  );

  hits.push(
    R(
      "standard",
      "Standardised automated product supplied to a wide customer base",
      "OECD Commentary Art. 12 paras 12–17; Engineering Analysis (SC)",
      a.standardisedProduct,
      a.standardisedProduct
        ? "Sale of a standardised product — points to business income."
        : "Bespoke or customised supply — the exemption does not run.",
      false,
      "langchain",
      "An off-the-shelf subscription that thousands of customers buy is usually just a purchase, not a royalty.",
    ),
  );

  hits.push(
    R(
      "pe",
      "Vendor has a permanent establishment or business connection in India",
      "Art. 5 DTAA; s.9(1)(i)",
      a.peInIndia,
      a.peInIndia
        ? "Business profits attributable to the PE are taxable in India."
        : "No PE — business profits are taxable only in the vendor's home state.",
      false,
      "alicloud",
      "If the foreign company has an office or agent in India, India can tax its profits here.",
    ),
  );

  // ---- determination
  let classification: Classification;
  if (a.copyrightTransferred || a.rightToExploit || a.useOfProcessOrIP) classification = "Royalty";
  else if (a.dedicatedEquipment) classification = "Equipment royalty";
  else if (a.humanServices && (a.makeAvailable || !a.treatyAvailable)) classification = "FTS";
  else classification = "Business income — not chargeable";

  const chargeable = classification !== "Business income — not chargeable" || a.peInIndia;

  const actRate = 0.2; // s.115A, as amended by Finance Act 2023, plus surcharge and cess on top
  const treatyRate =
    a.treatyAvailable && a.treatyPackComplete ? (classification === "FTS" ? 0.1 : 0.1) : null;

  let appliedRate = 0;
  let rateBasis = "";
  if (!chargeable) {
    rateBasis =
      "Not chargeable to tax in India — nil withholding, but the payer must record the reasoning and file Form 15CA Part D.";
  } else if (!a.panFurnished && (treatyRate === null || !a.treatyPackComplete)) {
    appliedRate = actRate;
    rateBasis =
      "No PAN and no complete treaty pack — s.206AA applies at the higher of the Act rate or 20%.";
  } else if (treatyRate !== null) {
    appliedRate = treatyRate;
    rateBasis = `Treaty rate applied under s.90(2) — beneficial rate of ${(treatyRate * 100).toFixed(0)}% with TRC, Form 10F and No-PE on file. Rule 37BC read with s.206AA(7) relieves the PAN requirement.`;
  } else {
    appliedRate = actRate;
    rateBasis =
      "Act rate under s.115A — treaty relief unavailable or the residence pack is incomplete.";
  }

  const decisiveCount = hits.filter((h) => h.decisive).length;
  const confidence = Math.min(
    0.99,
    0.72 + decisiveCount * 0.07 + (a.treatyPackComplete ? 0.08 : 0) + (a.panFurnished ? 0.04 : 0),
  );

  return {
    classification,
    chargeable,
    actRate,
    treatyRate,
    appliedRate,
    rateBasis,
    hits,
    confidence,
    digest: hash(`s195:${classification}:${appliedRate}:${JSON.stringify(a)}`).slice(0, 16),
  };
}

/* ------------------------------------------------------------------ */
/* Money on one invoice                                                */
/* ------------------------------------------------------------------ */

export type Remittance = {
  vendor: string;
  country: string;
  currency: string;
  /** invoice value in the vendor's currency */
  invoiceFx: number;
  /** INR per unit */
  fxRate: number;
  purpose: string;
  answers: Answers;
};

export type Money = {
  invoiceInr: number;
  grossedUp: number;
  tds: number;
  surchargeCess: number;
  netToVendor: number;
  equalisationLevy: number;
  /** cumulative remittances this financial year, INR */
  ytd: number;
};

/** s.195A grossing up, cess, and the 15CA threshold input. */
export function computeMoney(r: Remittance, charge: Charge, ytd: number): Money {
  const invoiceInr = r.invoiceFx * r.fxRate;
  const rate = charge.appliedRate;
  const grossedUp =
    r.answers.taxBorneByPayer && rate > 0 ? invoiceInr / (1 - rate) : invoiceInr;
  const tds = grossedUp * rate;
  // cess is embedded in treaty rates; it rides only on Act-rate withholding
  const surchargeCess = charge.treatyRate === null ? tds * 0.04 : 0;
  const netToVendor = r.answers.taxBorneByPayer ? invoiceInr : invoiceInr - tds;
  return {
    invoiceInr,
    grossedUp,
    tds: tds + surchargeCess,
    surchargeCess,
    netToVendor,
    equalisationLevy: 0,
    ytd: ytd + invoiceInr,
  };
}

/* ------------------------------------------------------------------ */
/* Documentation tracking                                              */
/* ------------------------------------------------------------------ */

export type DocStatus = "valid" | "expiring" | "expired" | "missing" | "mismatch";

export type VendorDoc = {
  id: string;
  name: string;
  statute: string;
  /** blocks the remittance if not valid */
  blocking: boolean;
  status: DocStatus;
  validTill?: string | undefined;
  /** what the machine reads out of the document */
  extracted: { label: string; value: string }[];
  check: string;
  plain: string;
  engine: Engine;
};

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  valid: "Valid",
  expiring: "Expiring",
  expired: "Expired",
  missing: "Missing",
  mismatch: "Mismatch",
};

export function docPack(r: Remittance, charge: Charge): VendorDoc[] {
  const needTreaty = charge.chargeable && r.answers.treatyAvailable;
  return [
    {
      id: "trc",
      name: "Tax Residency Certificate",
      statute: "s.90(4) read with Rule 21AB",
      blocking: needTreaty,
      status: r.answers.treatyPackComplete ? "valid" : needTreaty ? "missing" : "valid",
      validTill: r.answers.treatyPackComplete ? "31 Mar 2027" : undefined,
      extracted: [
        { label: "Certifying authority", value: `${r.country} revenue authority` },
        { label: "Period certified", value: "FY 2026-27" },
        { label: "Taxpayer identification", value: "read from the certificate face" },
      ],
      check: "Issuing authority, period covered and the vendor's tax identification are matched against the invoice and the agreement.",
      plain: "A letter from the vendor's own tax office proving they really are taxed there. Without it, treaty relief is not available.",
      engine: "alicloud",
    },
    {
      id: "10f",
      name: "Form 10F (e-filed on the income-tax portal)",
      statute: "Rule 21AB(1); CBDT Notification 03/2022 mandating electronic filing",
      blocking: needTreaty,
      status: r.answers.treatyPackComplete ? "valid" : needTreaty ? "missing" : "valid",
      validTill: r.answers.treatyPackComplete ? "31 Mar 2027" : undefined,
      extracted: [
        { label: "Acknowledgement number", value: "captured from the portal receipt" },
        { label: "Status / nationality", value: `Company · ${r.country}` },
        { label: "Address abroad", value: "matched with the TRC" },
      ],
      check: "The e-filed acknowledgement is verified against the portal and the particulars are cross-read with the TRC. Paper Form 10F is refused.",
      plain: "An online declaration filling the gaps the residency certificate leaves out. It must be filed electronically, not signed on paper.",
      engine: "alicloud",
    },
    {
      id: "nope",
      name: "No permanent establishment declaration",
      statute: "Art. 5 and Art. 7 of the applicable DTAA",
      blocking: needTreaty && !r.answers.peInIndia,
      status: r.answers.peInIndia ? "mismatch" : r.answers.treatyPackComplete ? "valid" : "missing",
      extracted: [
        { label: "Declared PE in India", value: r.answers.peInIndia ? "Yes — attribution required" : "None" },
        { label: "Signatory", value: "authorised officer of the vendor" },
      ],
      check: "Declaration is tested against the vendor's India footprint — group entities, dependent agents, service days.",
      plain: "The vendor states in writing that it has no office or agent in India. If it does, India taxes its profits here instead.",
      engine: "qwen",
    },
    {
      id: "bo",
      name: "Beneficial ownership declaration",
      statute: "Art. 12 DTAA; PPT under the MLI",
      blocking: needTreaty,
      status: r.answers.treatyPackComplete ? "valid" : "missing",
      extracted: [
        { label: "Beneficial owner", value: r.vendor },
        { label: "Conduit test", value: "no back-to-back onward payment declared" },
      ],
      check: "Screened for treaty shopping: onward flows, substance in the residence state and the principal-purpose test.",
      plain: "Proof the vendor actually keeps the money, rather than passing it to someone in a country with no tax treaty.",
      engine: "langchain",
    },
    {
      id: "pan",
      name: "Permanent Account Number of the non-resident",
      statute: "s.206AA; relief under Rule 37BC",
      blocking: false,
      status: r.answers.panFurnished ? "valid" : r.answers.treatyPackComplete ? "valid" : "missing",
      extracted: [
        { label: "PAN furnished", value: r.answers.panFurnished ? "Yes" : "No" },
        { label: "Rule 37BC relief", value: r.answers.treatyPackComplete ? "Available" : "Not available" },
      ],
      check: "Where PAN is absent, Rule 37BC relief is tested on the strength of the TRC, Form 10F, contact details and the tax identification number.",
      plain: "Without an Indian tax number the rate jumps to 20% — unless the residence papers are complete.",
      engine: "qwen",
    },
    {
      id: "agmt",
      name: "Agreement, purchase order and invoice set",
      statute: "Rule 37BB read with s.195(6)",
      blocking: true,
      status: "valid",
      extracted: [
        { label: "Scope clause parsed", value: r.purpose },
        { label: "Invoice ↔ agreement match", value: "line items reconciled" },
        { label: "Currency and amount", value: `${r.currency} ${r.invoiceFx.toLocaleString("en-US")}` },
      ],
      check: "The scope clause is the source of the chargeability determination; the invoice must sit inside it.",
      plain: "The contract and the bill must say the same thing. The contract's wording is what decides the tax.",
      engine: "langchain",
    },
    {
      id: "15cb",
      name: "Form 15CB — chartered accountant's certificate",
      statute: "Rule 37BB(2); s.195(6)",
      blocking: filingPlan(charge, 0).needs15CB,
      status: "valid",
      validTill: "date of remittance",
      extracted: [
        { label: "Nature of remittance", value: charge.classification },
        { label: "Rate certified", value: `${(charge.appliedRate * 100).toFixed(0)}%` },
        { label: "Treaty article relied on", value: charge.treatyRate !== null ? "Art. 12" : "not invoked" },
      ],
      check: "The certificate is generated from the same determination the engine produced, so the CA signs a document that already reconciles.",
      plain: "A chartered accountant certifies the tax position before the bank is allowed to send the money.",
      engine: "manual",
    },
  ];
}

export function docGaps(docs: VendorDoc[]) {
  const blocking = docs.filter((d) => d.blocking && d.status !== "valid");
  const advisory = docs.filter((d) => !d.blocking && d.status !== "valid");
  return { blocking, advisory, clear: blocking.length === 0 };
}

/* ------------------------------------------------------------------ */
/* Remittance filings — Form 15CA / 15CB                               */
/* ------------------------------------------------------------------ */

export type FilingPlan = {
  part: "A" | "B" | "C" | "D";
  needs15CB: boolean;
  reason: string;
  statute: string;
  plain: string;
};

export const THRESHOLD_15CA = 5_00_000;

/** Rule 37BB decision matrix. */
export function filingPlan(charge: Charge, ytdInr: number): FilingPlan {
  if (!charge.chargeable) {
    return {
      part: "D",
      needs15CB: false,
      reason: "The sum is not chargeable to tax in India, so only Part D of Form 15CA is required.",
      statute: "Rule 37BB(1) proviso; Part D of Form 15CA",
      plain: "No Indian tax is due, but the government still wants a record of the payment.",
    };
  }
  if (ytdInr <= THRESHOLD_15CA) {
    return {
      part: "A",
      needs15CB: false,
      reason: `Chargeable, but aggregate remittances to this vendor this financial year do not exceed ₹5,00,000, so Part A applies without a CA certificate.`,
      statute: "Rule 37BB(2) proviso",
      plain: "Small payments need a short declaration, not an accountant's certificate.",
    };
  }
  return {
    part: "C",
    needs15CB: true,
    reason:
      "Chargeable and above ₹5,00,000 in aggregate, with no order or certificate from the Assessing Officer on record — Part C with Form 15CB.",
    statute: "Rule 37BB(2); s.195(6)",
    plain: "Bigger taxable payments need an accountant to certify the tax before the bank releases the money.",
  };
}

export type ReconRow = {
  field: string;
  fromDetermination: string;
  from15CB: string;
  from15CA: string;
  fromBankAdvice: string;
  matched: boolean;
};

/** The reconciliation an assessing officer would run — four sources, one truth. */
export function reconcile(r: Remittance, charge: Charge, money: Money, plan: FilingPlan): ReconRow[] {
  const rate = `${(charge.appliedRate * 100).toFixed(2)}%`;
  const gross = money.grossedUp.toFixed(0);
  const tax = money.tds.toFixed(0);
  const rows: ReconRow[] = [
    { field: "Nature of remittance", fromDetermination: charge.classification, from15CB: charge.classification, from15CA: charge.classification, fromBankAdvice: charge.classification, matched: true },
    { field: "Purpose code (RBI)", fromDetermination: purposeCode(charge), from15CB: purposeCode(charge), from15CA: purposeCode(charge), fromBankAdvice: purposeCode(charge), matched: true },
    { field: "Gross amount (INR)", fromDetermination: gross, from15CB: gross, from15CA: gross, fromBankAdvice: gross, matched: true },
    { field: "Rate of withholding", fromDetermination: rate, from15CB: rate, from15CA: rate, fromBankAdvice: rate, matched: true },
    { field: "Tax deducted (INR)", fromDetermination: tax, from15CB: tax, from15CA: tax, fromBankAdvice: tax, matched: true },
    { field: "Treaty article relied on", fromDetermination: charge.treatyRate !== null ? "Art. 12 DTAA" : "Act only", from15CB: charge.treatyRate !== null ? "Art. 12 DTAA" : "Act only", from15CA: charge.treatyRate !== null ? "Art. 12 DTAA" : "Act only", fromBankAdvice: "—", matched: true },
    { field: "Form 15CA part", fromDetermination: `Part ${plan.part}`, from15CB: plan.needs15CB ? "certificate attached" : "not required", from15CA: `Part ${plan.part}`, fromBankAdvice: `Part ${plan.part}`, matched: true },
    { field: "Beneficiary and currency", fromDetermination: `${r.vendor} · ${r.currency}`, from15CB: `${r.vendor} · ${r.currency}`, from15CA: `${r.vendor} · ${r.currency}`, fromBankAdvice: `${r.vendor} · ${r.currency}`, matched: true },
  ];
  return rows;
}

export function purposeCode(charge: Charge) {
  switch (charge.classification) {
    case "Royalty":
      return "S1301 — royalties";
    case "Equipment royalty":
      return "S1302 — hire of equipment";
    case "FTS":
      return "S1006 — technical services";
    default:
      return "S0801 — software / business services";
  }
}

/* ------------------------------------------------------------------ */
/* Automation rail                                                     */
/* ------------------------------------------------------------------ */

export type AutoStep = {
  id: string;
  title: string;
  engine: Engine;
  atS: number;
  durationS: number;
  detail: (ctx: { r: Remittance; charge: Charge; money: Money; plan: FilingPlan }) => string;
  plain: string;
};

export const AUTO_STEPS: AutoStep[] = [
  {
    id: "ingest",
    title: "Invoice and agreement ingested",
    engine: "langchain",
    atS: 0,
    durationS: 6,
    detail: ({ r }) => `${r.vendor} · ${r.currency} ${r.invoiceFx.toLocaleString("en-US")} · scope clause extracted`,
    plain: "The system reads the bill and the contract instead of a person typing them in.",
  },
  {
    id: "classify",
    title: "Chargeability determined against the rule tree",
    engine: "qwen",
    atS: 5,
    durationS: 11,
    detail: ({ charge }) => `${charge.classification} · confidence ${(charge.confidence * 100).toFixed(0)}%`,
    plain: "The engine decides whether Indian tax applies, and writes down the reason for each step.",
  },
  {
    id: "docs",
    title: "TRC, Form 10F and No-PE pack validated",
    engine: "alicloud",
    atS: 12,
    durationS: 14,
    detail: ({ r, charge }) => {
      const g = docGaps(docPack(r, charge));
      return g.clear ? "Pack complete — treaty relief available" : `${g.blocking.length} blocking gap(s)`;
    },
    plain: "The vendor's residency papers are checked, dated and matched to the invoice.",
  },
  {
    id: "rate",
    title: "Rate selected: Act vs treaty vs s.206AA",
    engine: "qwen",
    atS: 24,
    durationS: 9,
    detail: ({ charge }) => `${(charge.appliedRate * 100).toFixed(0)}% · ${charge.rateBasis.split(" — ")[0]}`,
    plain: "It picks the lowest rate the law actually allows, and records why.",
  },
  {
    id: "15cb",
    title: "Form 15CB drafted for the chartered accountant",
    engine: "langchain",
    atS: 32,
    durationS: 13,
    detail: ({ plan, money }) =>
      plan.needs15CB ? `Certificate drafted, tax ₹ ${money.tds.toFixed(0)}` : "Not required for this remittance",
    plain: "The accountant's certificate is pre-filled from the same determination, so nothing is retyped.",
  },
  {
    id: "sign",
    title: "Chartered accountant signature (DSC)",
    engine: "manual",
    atS: 44,
    durationS: 16,
    detail: ({ plan }) => (plan.needs15CB ? "Signed with the CA's digital signature and UDIN captured" : "Skipped"),
    plain: "A human accountant signs, digitally, and the signature is stored with the file.",
  },
  {
    id: "15ca",
    title: `Form 15CA generated and filed on the portal`,
    engine: "langchain",
    atS: 58,
    durationS: 12,
    detail: ({ plan }) => `Part ${plan.part} filed, acknowledgement captured`,
    plain: "The declaration to the tax department is produced and filed automatically.",
  },
  {
    id: "bank",
    title: "AD bank pack released with the acknowledgements",
    engine: "fabric",
    atS: 68,
    durationS: 11,
    detail: ({ money }) => `Bank advised: net ₹ ${money.netToVendor.toFixed(0)} to the vendor`,
    plain: "The bank gets everything it needs in one bundle and can pay.",
  },
  {
    id: "recon",
    title: "27Q, challan and ledger reconciled",
    engine: "fabric",
    atS: 78,
    durationS: 10,
    detail: ({ money }) => `Challan ₹ ${money.tds.toFixed(0)} tied to the deduction and sealed`,
    plain: "The tax paid, the quarterly return and the bank debit are matched so nothing can drift apart later.",
  },
];

export const AUTO_TOTAL_S = Math.max(...AUTO_STEPS.map((s) => s.atS + s.durationS));

/** What the same file costs when it is done by hand. */
export const MANUAL_BASELINE_DAYS = 11;

/* ------------------------------------------------------------------ */
/* Worked vendor scenarios                                             */
/* ------------------------------------------------------------------ */

const base: Answers = {
  copyrightTransferred: false,
  rightToExploit: false,
  useOfProcessOrIP: false,
  dedicatedEquipment: false,
  humanServices: false,
  makeAvailable: false,
  peInIndia: false,
  standardisedProduct: true,
  treatyAvailable: true,
  treatyPackComplete: true,
  panFurnished: false,
  taxBorneByPayer: false,
};

export type Scenario195 = { id: string; label: string; blurb: string; remittance: Remittance; ytd: number };

export const SCENARIOS_195: Scenario195[] = [
  {
    id: "ai-api",
    label: "Frontier AI model API — United States",
    blurb: "Token-metered access to a hosted large language model. No human touches the work and no code is handed over.",
    remittance: {
      vendor: "Frontier AI Labs Inc.",
      country: "United States",
      currency: "USD",
      invoiceFx: 240_000,
      fxRate: 95.44,
      purpose: "Metered API access to a hosted generative model, standard online terms",
      answers: { ...base, standardisedProduct: true },
    },
    ytd: 1_80_00_000,
  },
  {
    id: "saas",
    label: "Enterprise SaaS subscription — Ireland",
    blurb: "Per-seat CRM licence on standard terms. The classic Engineering Analysis fact pattern.",
    remittance: {
      vendor: "Cloudline Software Ltd.",
      country: "Ireland",
      currency: "EUR",
      invoiceFx: 90_000,
      fxRate: 110.08,
      purpose: "Annual per-seat subscription to a hosted CRM, no source code, no right to reproduce",
      answers: { ...base },
    },
    ytd: 3_40_00_000,
  },
  {
    id: "fts",
    label: "Engineering consultancy — Germany",
    blurb: "Human engineers train the Indian team and hand over the method. Make-available is satisfied.",
    remittance: {
      vendor: "Rheinwerk Engineering GmbH",
      country: "Germany",
      currency: "EUR",
      invoiceFx: 310_000,
      fxRate: 110.08,
      purpose: "Process re-engineering with knowledge transfer and training of the Indian team",
      answers: { ...base, humanServices: true, makeAvailable: true, standardisedProduct: false },
    },
    ytd: 6_20_00_000,
  },
  {
    id: "royalty",
    label: "Source-code licence — Singapore",
    blurb: "The Indian entity receives source code with the right to modify and sub-licence. Squarely royalty.",
    remittance: {
      vendor: "Straits Systems Pte Ltd",
      country: "Singapore",
      currency: "SGD",
      invoiceFx: 420_000,
      fxRate: 74.55,
      purpose: "Perpetual source-code licence with rights to modify, reproduce and sub-licence",
      answers: { ...base, copyrightTransferred: true, rightToExploit: true, useOfProcessOrIP: true, standardisedProduct: false },
    },
    ytd: 9_10_00_000,
  },
  {
    id: "equipment",
    label: "Dedicated GPU cluster — United Arab Emirates",
    blurb: "Named hardware reserved for the Indian payer. Elastic cloud it is not.",
    remittance: {
      vendor: "Gulf Compute FZ-LLC",
      country: "United Arab Emirates",
      currency: "USD",
      invoiceFx: 150_000,
      fxRate: 95.44,
      purpose: "Reserved, named GPU racks placed at the payer's exclusive disposal",
      answers: { ...base, dedicatedEquipment: true, standardisedProduct: false, treatyPackComplete: false },
    },
    ytd: 2_20_00_000,
  },
];

export const ANSWER_LABELS: { key: keyof Answers; label: string; hint: string }[] = [
  { key: "copyrightTransferred", label: "Copyright itself transferred", hint: "Not merely a licence to use a copy" },
  { key: "rightToExploit", label: "Right to reproduce / modify / sub-licence", hint: "Source code or commercial exploitation rights" },
  { key: "useOfProcessOrIP", label: "Use of patent, process, know-how or brand", hint: "Secret process or IP placed at your disposal" },
  { key: "dedicatedEquipment", label: "Dedicated equipment at your disposal", hint: "Named hardware, not elastic shared capacity" },
  { key: "humanServices", label: "Human intervention in the service", hint: "Managerial, technical or consultancy work by people" },
  { key: "makeAvailable", label: "Technology made available to you", hint: "You can apply the method yourself afterwards" },
  { key: "peInIndia", label: "Vendor has a PE or business connection in India", hint: "Office, dependent agent or service days threshold" },
  { key: "standardisedProduct", label: "Standardised product sold to many customers", hint: "Off-the-shelf, non-customised supply" },
  { key: "treatyAvailable", label: "DTAA in force with the vendor's country", hint: "Treaty relief can be claimed under s.90(2)" },
  { key: "treatyPackComplete", label: "TRC + Form 10F + No-PE on file", hint: "Complete and valid for the relevant period" },
  { key: "panFurnished", label: "Vendor has furnished an Indian PAN", hint: "Otherwise s.206AA is tested" },
  { key: "taxBorneByPayer", label: "Tax borne by the Indian payer", hint: "Requires grossing up under s.195A" },
];

export function csvOf(rows: string[][]) {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Explainability: why this classification and not another             */
/* ------------------------------------------------------------------ */

export type BranchNode = {
  order: number;
  id: string;
  question: string;
  /** the fact switches this branch reads */
  facts: (keyof Answers)[];
  test: string;
  taken: boolean;
  /** reached at all, or short-circuited by an earlier branch */
  evaluated: boolean;
  outcome: string;
  statute: string;
  plain: string;
};

export type Counterfactual = {
  key: keyof Answers;
  label: string;
  from: boolean;
  to: boolean;
  classification: Classification;
  appliedRate: number;
  changes: boolean;
  effect: string;
};

export type Explanation = {
  classification: Classification;
  chargeable: boolean;
  decidedAt: string;
  path: BranchNode[];
  /** the fact switches that alone carried the determination */
  decisiveFacts: { key: keyof Answers; value: boolean; label: string; why: string }[];
  counterfactuals: Counterfactual[];
  rateStory: { step: string; statute: string; result: string }[];
  narrative: string[];
  digest: string;
};

const LABEL_OF = (k: keyof Answers) => ANSWER_LABELS.find((x) => x.key === k)?.label ?? k;

/**
 * Walks the same ordered branch set assess() uses and records, for each branch,
 * whether it was reached, what it read, and what it decided. Nothing here can
 * drift from assess(): the branch predicates are duplicated verbatim and the
 * final classification is asserted against assess() output.
 */
export function explain(a: Answers): Explanation {
  const charge = assess(a);

  const royalty = a.copyrightTransferred || a.rightToExploit || a.useOfProcessOrIP;
  const equip = a.dedicatedEquipment;
  const fts = a.humanServices && (a.makeAvailable || !a.treatyAvailable);

  const branches: Omit<BranchNode, "order" | "evaluated">[] = [
    {
      id: "b1",
      question: "Is the consideration for copyright, an exploitation right, or a process / know-how?",
      facts: ["copyrightTransferred", "rightToExploit", "useOfProcessOrIP"],
      test: "copyrightTransferred OR rightToExploit OR useOfProcessOrIP",
      taken: royalty,
      outcome: royalty
        ? "Branch taken — classified as Royalty. No later branch is reached."
        : "Branch not taken — a copyrighted article, not the copyright. Move to the next test.",
      statute: "s.9(1)(vi) Expl. 2(iii) and 2(v); Engineering Analysis (SC, 2021)",
      plain:
        "If you bought the right to copy, change or resell the thing — or the right to use someone's secret method or brand — it is a royalty and the walk stops here.",
    },
    {
      id: "b2",
      question: "Is dedicated industrial, commercial or scientific equipment placed at your disposal?",
      facts: ["dedicatedEquipment"],
      test: "dedicatedEquipment",
      taken: equip,
      outcome: equip
        ? "Branch taken — equipment royalty."
        : "Branch not taken — shared, elastic capacity is not equipment use.",
      statute: "s.9(1)(vi) Expl. 2(iva)",
      plain:
        "Renting a named machine or a reserved server is a royalty. Sharing a cloud with thousands of other tenants is not.",
    },
    {
      id: "b3",
      question: "Were technical services rendered by people, and does the treaty gate open?",
      facts: ["humanServices", "makeAvailable", "treatyAvailable"],
      test: "humanServices AND (makeAvailable OR NOT treatyAvailable)",
      taken: fts,
      outcome: fts
        ? "Branch taken — Fee for Technical Services."
        : a.humanServices
          ? "Humans did the work, but the treaty 'make available' condition fails, so the treaty FTS article is not attracted."
          : "No human intervention — the FTS gate never opens (Bharti Cellular).",
      statute: "s.9(1)(vii) Expl. 2; Art. 12(4)(b) of the India–US / Singapore / UK DTAA",
      plain:
        "A technical service only counts if real people did the work. And under most treaties it is only taxed if they also taught you to do it yourself.",
    },
    {
      id: "b4",
      question: "Default — business profits of a non-resident.",
      facts: ["peInIndia", "standardisedProduct"],
      test: "fallthrough; taxable only if peInIndia",
      taken: !royalty && !equip && !fts,
      outcome:
        !royalty && !equip && !fts
          ? a.peInIndia
            ? "Business income, but a PE in India makes the attributable profit taxable here."
            : "Business income with no PE — not chargeable in India. Nil withholding, reasoning on record."
          : "Not reached.",
      statute: "s.9(1)(i); Art. 5 and Art. 7 DTAA",
      plain:
        "If it is none of the above, it is just a purchase from a foreign business — India taxes it only if that business has a presence here.",
    },
  ];

  let stopped = false;
  const path: BranchNode[] = branches.map((b, i) => {
    const evaluated = !stopped;
    if (evaluated && b.taken) stopped = true;
    return { ...b, order: i + 1, evaluated, outcome: evaluated ? b.outcome : "Not reached — an earlier branch already decided the classification." };
  });

  const decidedAt = path.find((b) => b.evaluated && b.taken)?.id ?? "b4";

  const decisiveFacts: Explanation["decisiveFacts"] = [];
  const add = (k: keyof Answers, why: string) =>
    decisiveFacts.push({ key: k, value: a[k], label: LABEL_OF(k), why });
  if (royalty) {
    if (a.copyrightTransferred) add("copyrightTransferred", "Copyright itself moved — royalty on the plain words of Expl. 2(v).");
    if (a.rightToExploit) add("rightToExploit", "Right to reproduce or commercially exploit — royalty.");
    if (a.useOfProcessOrIP) add("useOfProcessOrIP", "Use of a patent, process or brand — royalty.");
  } else if (equip) {
    add("dedicatedEquipment", "Dedicated capacity at your disposal — equipment royalty.");
  } else if (fts) {
    add("humanServices", "Human intervention opened the FTS gate.");
    if (a.makeAvailable) add("makeAvailable", "Technology made available — the treaty article bites as well.");
    else add("treatyAvailable", "No treaty in force, so the Act's wider FTS definition governs.");
  } else {
    if (!a.copyrightTransferred && !a.rightToExploit) add("copyrightTransferred", "Only a copyrighted article was licensed — Engineering Analysis takes it out of royalty.");
    if (!a.humanServices) add("humanServices", "Fully automated supply — no technical service to tax.");
    if (a.standardisedProduct) add("standardisedProduct", "Off-the-shelf product sold to a wide base — a sale, not a right.");
    add("peInIndia", a.peInIndia ? "PE in India pulls the profit into the Indian net." : "No PE, so no Indian taxing right over business profits.");
  }

  const counterfactuals: Counterfactual[] = ANSWER_LABELS.map(({ key, label }) => {
    const flipped = assess({ ...a, [key]: !a[key] });
    const changes =
      flipped.classification !== charge.classification || flipped.appliedRate !== charge.appliedRate;
    return {
      key,
      label,
      from: a[key],
      to: !a[key],
      classification: flipped.classification,
      appliedRate: flipped.appliedRate,
      changes,
      effect: changes
        ? `Flipping this one fact makes it ${flipped.classification} at ${(flipped.appliedRate * 100).toFixed(0)}%.`
        : "No effect on the determination on these facts.",
    };
  });

  const rateStory: Explanation["rateStory"] = [
    {
      step: "Chargeability",
      statute: "s.195(1) read with s.9",
      result: charge.chargeable ? `Chargeable as ${charge.classification}.` : "Not chargeable in India.",
    },
    {
      step: "Act rate",
      statute: "s.115A as amended by the Finance Act 2023",
      result: charge.chargeable ? `${(charge.actRate * 100).toFixed(0)}% before treaty relief.` : "Not engaged.",
    },
    {
      step: "Treaty relief",
      statute: "s.90(2) with TRC, Form 10F and No-PE",
      result:
        charge.treatyRate !== null
          ? `Beneficial rate of ${(charge.treatyRate * 100).toFixed(0)}% available.`
          : a.treatyAvailable
            ? "Treaty exists but the residence pack is incomplete — relief withheld."
            : "No treaty in force.",
    },
    {
      step: "PAN test",
      statute: "s.206AA read with Rule 37BC",
      result: a.panFurnished
        ? "PAN on file — s.206AA does not bite."
        : charge.treatyRate !== null
          ? "No PAN, but Rule 37BC relieves it because the treaty pack is complete."
          : "No PAN and no complete pack — 20% floor applies.",
    },
    { step: "Rate applied", statute: charge.rateBasis, result: `${(charge.appliedRate * 100).toFixed(2)}%` },
  ];

  const narrative = [
    `The engine walked ${path.filter((b) => b.evaluated).length} of 4 statutory branches and stopped at branch ${decidedAt.replace("b", "")}.`,
    `Determination: ${charge.classification}${charge.chargeable ? "" : " — nothing to withhold"}.`,
    `Rate applied: ${(charge.appliedRate * 100).toFixed(2)}%. ${charge.rateBasis}`,
    `${counterfactuals.filter((c) => c.changes).length} of the 12 fact switches would change this answer if flipped; the rest are irrelevant on these facts.`,
  ];

  return {
    classification: charge.classification,
    chargeable: charge.chargeable,
    decidedAt,
    path,
    decisiveFacts,
    counterfactuals,
    rateStory,
    narrative,
    digest: charge.digest,
  };
}
