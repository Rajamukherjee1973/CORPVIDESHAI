/**
 * Section 195 — advisory layer.
 *
 * Adds (a) the extra transaction options a treasury actually has to answer,
 * (b) deterministic predictive results (exposure, query risk, clearance,
 * annualised outflow), and (c) a FEMA law advisory that reads the same
 * determination and prices the exchange-control obligations next to the tax.
 *
 * Everything here is explainable and deterministic — no black box, so a
 * Revenue officer or an AD Category-I banker can re-walk each number.
 */

import type { Charge, Money, Remittance, VendorDoc } from "@/lib/section195";
import { purposeCode } from "@/lib/section195";

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

export type AoOrder = "none" | "s195(2)" | "s197" | "s195(3)";
export type PaymentPattern = "one-off" | "monthly" | "quarterly" | "annual";
export type Channel = "ad-cat-1" | "gift-ifsc";
export type ServiceClass = "software-saas" | "technical-consultancy" | "infrastructure" | "other";

export type AdvisoryOptions = {
  /** lower / nil withholding order on record */
  aoOrder: AoOrder;
  /** s.206AB — vendor is a specified non-filer of Indian returns */
  nonFiler: boolean;
  /** associated enterprise — transfer pricing and FEMA arm's length both bite */
  relatedParty: boolean;
  /** significant economic presence / business connection tested */
  sepTested: boolean;
  /** how often this invoice repeats in the year */
  pattern: PaymentPattern;
  /** remittance channel */
  channel: Channel;
  /** FEM (Current Account Transactions) Rules classification of the service */
  serviceClass: ServiceClass;
  /** queries raised by the department on this vendor in the last 3 years */
  priorQueries: number;
  /** contract, invoice and no-PE declaration filed with the AD bank */
  adEvidenceFiled: boolean;
  /** remittance made after 7 days of the tax deposit due date */
  lateDeposit: boolean;
};

export const DEFAULT_OPTIONS: AdvisoryOptions = {
  aoOrder: "none",
  nonFiler: false,
  relatedParty: false,
  sepTested: true,
  pattern: "monthly",
  channel: "ad-cat-1",
  serviceClass: "software-saas",
  priorQueries: 1,
  adEvidenceFiled: true,
  lateDeposit: false,
};

export const AO_ORDER_LABEL: Record<AoOrder, string> = {
  none: "No order on record",
  "s195(2)": "s.195(2) order — payer application",
  s197: "s.197 certificate — vendor's lower deduction",
  "s195(3)": "s.195(3) certificate — nil deduction",
};

export const PATTERN_LABEL: Record<PaymentPattern, string> = {
  "one-off": "One-off invoice",
  monthly: "Monthly recurring",
  quarterly: "Quarterly recurring",
  annual: "Annual renewal",
};

export const SERVICE_CLASS_LABEL: Record<ServiceClass, string> = {
  "software-saas": "Software / SaaS / cloud",
  "technical-consultancy": "Technical & consultancy service",
  infrastructure: "Infrastructure project service",
  other: "Other current-account service",
};

export const PATTERN_MULTIPLIER: Record<PaymentPattern, number> = {
  "one-off": 1,
  monthly: 12,
  quarterly: 4,
  annual: 1,
};

/* ------------------------------------------------------------------ */
/* Predictive results                                                  */
/* ------------------------------------------------------------------ */

export type Severity = "clear" | "watch" | "act";

export type Prediction = {
  id: string;
  label: string;
  /** central estimate, formatted */
  p50: string;
  /** adverse tail, formatted */
  p90: string;
  confidence: number;
  severity: Severity;
  basis: string;
  drivers: string[];
  action: string;
  comparator: string;
};

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const inr = (n: number) =>
  `₹ ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

/** Deterministic query-risk model — every term is visible and additive. */
export function queryRisk(
  charge: Charge,
  docs: VendorDoc[],
  o: AdvisoryOptions,
): { score: number; drivers: string[] } {
  const drivers: string[] = [];
  let s = 0.06;
  const blocking = docs.filter((d) => d.blocking && d.status !== "valid").length;
  if (blocking) {
    s += 0.16 * blocking;
    drivers.push(`${blocking} blocking document(s) not clean — treaty benefit is the first thing questioned`);
  }
  if (charge.treatyRate !== null && charge.appliedRate <= 0.1) {
    s += 0.1;
    drivers.push("Treaty rate at or below 10% invites a beneficial-ownership and PPT test");
  }
  if (!charge.chargeable) {
    s += 0.14;
    drivers.push("Nil withholding on a cross-border payment is the highest-scrutiny position");
  }
  if (o.relatedParty) {
    s += 0.13;
    drivers.push("Associated-enterprise payment — transfer pricing and s.92CA reference risk");
  }
  if (o.nonFiler) {
    s += 0.09;
    drivers.push("s.206AB specified non-filer flag on the vendor");
  }
  if (o.aoOrder !== "none") {
    s -= 0.12;
    drivers.push(`${AO_ORDER_LABEL[o.aoOrder]} on record — position is pre-cleared`);
  }
  if (!o.sepTested) {
    s += 0.07;
    drivers.push("Significant economic presence not tested on file");
  }
  if (charge.confidence < 0.8) {
    s += 0.08;
    drivers.push("Determination confidence below 80% — the facts sit close to a branch boundary");
  }
  s += clamp(o.priorQueries * 0.035, 0, 0.18);
  if (o.priorQueries > 0) drivers.push(`${o.priorQueries} prior departmental query(ies) on this vendor`);
  return { score: clamp(s, 0.02, 0.95), drivers };
}

export function predict195(
  r: Remittance,
  charge: Charge,
  money: Money,
  docs: VendorDoc[],
  o: AdvisoryOptions,
): Prediction[] {
  const q = queryRisk(charge, docs, o);
  const gaps = docs.filter((d) => d.status !== "valid");
  const blocking = gaps.filter((d) => d.blocking).length;
  const annual = money.invoiceInr * PATTERN_MULTIPLIER[o.pattern];
  const actTax = money.grossedUp * charge.actRate;
  const treatySaving = Math.max(0, actTax - money.tds);

  // Under-withholding exposure: s.40(a)(i) disallowance is on the whole sum.
  const shortfallRisk = q.score * (charge.chargeable ? 1 : 0.7);
  const disallowance = money.invoiceInr * shortfallRisk;
  const interestMonths = o.lateDeposit ? 9 : 4;
  const interest = money.tds * (o.lateDeposit ? 0.015 : 0.01) * interestMonths;
  const penalty271C = money.tds * clamp(q.score * (o.lateDeposit ? 1.1 : 0.6), 0, 1);

  const baseMinutes = 7.4;
  const clearance =
    baseMinutes +
    blocking * 6.5 +
    (gaps.length - blocking) * 1.4 +
    (o.aoOrder === "none" ? 0.8 : 0) +
    (o.relatedParty ? 1.6 : 0) +
    (o.channel === "gift-ifsc" ? -1.1 : 0);

  const reworkP = clamp(
    0.05 + blocking * 0.22 + (gaps.length - blocking) * 0.06 + (o.adEvidenceFiled ? 0 : 0.18),
    0.02,
    0.95,
  );

  const sev = (n: number, watch: number, act: number): Severity =>
    n >= act ? "act" : n >= watch ? "watch" : "clear";

  return [
    {
      id: "query",
      label: "Departmental query on this determination",
      p50: pct(q.score),
      p90: pct(clamp(q.score * 1.55)),
      confidence: 0.86,
      severity: sev(q.score, 0.25, 0.45),
      basis: "s.201(1) proceedings history, treaty-rate sensitivity and document state",
      drivers: q.drivers,
      action:
        q.score >= 0.45
          ? o.aoOrder === "none"
            ? "File a s.195(2) application before remitting — it converts a contestable position into a pre-cleared one."
            : "Attach the order to the 15CB workpaper and seal the determination digest on the ledger."
          : "Proceed; keep the sealed determination and treaty pack in the evidence bundle.",
      comparator: "Manual desk cannot price this before remitting — it discovers it at assessment, 18–30 months later.",
    },
    {
      id: "disallowance",
      label: "Section 40(a)(i) disallowance exposure",
      p50: inr(disallowance),
      p90: inr(money.invoiceInr * clamp(shortfallRisk * 1.7)),
      confidence: 0.81,
      severity: sev(shortfallRisk, 0.2, 0.4),
      basis: "s.40(a)(i) disallows the whole expenditure where tax was not deducted or paid",
      drivers: [
        `Exposure is the full invoice of ${inr(money.invoiceInr)}, not the tax of ${inr(money.tds)}`,
        charge.chargeable
          ? "Sum is chargeable — withholding must be correct in amount and timing"
          : "Nil-withholding position: the disallowance follows if chargeability is reversed",
      ],
      action:
        shortfallRisk >= 0.4
          ? "Withhold at the Act rate and claim the treaty benefit by refund, or obtain a s.195(2) order first."
          : "Current withholding is defensible; retain the rate build-up with the invoice.",
      comparator: "Incumbent filing tools report the tax amount and never quantify the deduction at stake.",
    },
    {
      id: "interest",
      label: "Interest and penalty tail",
      p50: inr(interest + penalty271C * 0.5),
      p90: inr(interest + penalty271C),
      confidence: 0.79,
      severity: sev(o.lateDeposit ? 0.5 : q.score * 0.7, 0.2, 0.42),
      basis: "s.201(1A) at 1% / 1.5% per month; penalty equal to tax under s.271C",
      drivers: [
        o.lateDeposit
          ? "Deposit after the due date — 1.5% per month runs from deduction to payment"
          : "Deposit within the due date — 1% per month runs only if a shortfall is later found",
        `Modelled over ${interestMonths} months to the likely assessment date`,
      ],
      action: o.lateDeposit
        ? "Deposit the challan today and reconcile the 15CA acknowledgement number before the bank releases funds."
        : "No action — keep the challan and 15CA acknowledgement in the same bundle.",
      comparator: "Manual desk computes this after a notice; here it is priced pre-remittance.",
    },
    {
      id: "clearance",
      label: "Time to a bank-releasable pack",
      p50: `${clearance.toFixed(1)} min`,
      p90: `${(clearance * 1.6).toFixed(1)} min`,
      confidence: 0.9,
      severity: sev(clearance / 30, 0.35, 0.6),
      basis: "Determination, document validation, 15CA/15CB generation and AD-bank handoff",
      drivers: [
        blocking ? `${blocking} blocking document(s) add ~6.5 min each` : "Document pack is clean",
        o.channel === "gift-ifsc" ? "GIFT IFSC channel shortens the AD handoff" : "AD Category-I channel",
      ],
      action:
        blocking > 0
          ? "Request the missing residence documents now — everything else is already computed."
          : "Release: the pack is complete and the digest is sealed.",
      comparator: "11 working days on a manual desk for the same invoice.",
    },
    {
      id: "rework",
      label: "Form 15CA / 15CB rework probability",
      p50: pct(reworkP),
      p90: pct(clamp(reworkP * 1.5)),
      confidence: 0.84,
      severity: sev(reworkP, 0.2, 0.4),
      basis: "Rule 37BB field-level reconciliation against the determination and the bank advice",
      drivers: [
        `${gaps.length} document(s) not in a clean state`,
        o.adEvidenceFiled ? "Contract and invoice already lodged with the AD bank" : "AD evidence not yet lodged",
      ],
      action: reworkP >= 0.4
        ? "Fix the document pack before the CA signs 15CB — a re-signed certificate costs another cycle."
        : "Generate 15CB and file Part " + "C/A" + " as computed.",
      comparator: "Industry desks re-file roughly one in four 15CAs; this desk reconciles four sources first.",
    },
    {
      id: "annual",
      label: "Projected annual withholding on this corridor",
      p50: inr(annual * charge.appliedRate),
      p90: inr(annual * charge.actRate),
      confidence: 0.88,
      severity: "clear",
      basis: `${PATTERN_LABEL[o.pattern]} × applied rate ${pct(charge.appliedRate)}`,
      drivers: [
        `Annualised remittance ${inr(annual)}`,
        treatySaving > 0
          ? `Treaty relief saves ${inr(treatySaving * PATTERN_MULTIPLIER[o.pattern])} a year against the Act rate`
          : "No treaty relief applied — Act rate governs",
      ],
      action:
        treatySaving > 0
          ? "Diarise TRC and Form 10F renewal before the next invoice so the saving is not lost mid-year."
          : "Test whether a treaty pack can be obtained; the Act rate is the expensive path.",
      comparator: "Reporting tools show last quarter; this projects the full year and the renewal cliff.",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* FEMA advisory                                                       */
/* ------------------------------------------------------------------ */

export type AdvisoryStatus = "ok" | "attention" | "blocking";

export type FemaItem = {
  id: string;
  title: string;
  provision: string;
  status: AdvisoryStatus;
  detail: string;
  action: string;
  plain: string;
};

/** Schedule III approval thresholds, in USD, under FEM (CAT) Rules 2000. */
const SCHEDULE_III_USD: Record<ServiceClass, number | null> = {
  "software-saas": null,
  "technical-consultancy": 1_000_000,
  infrastructure: 10_000_000,
  other: null,
};

export function femaAdvisory(
  r: Remittance,
  charge: Charge,
  money: Money,
  o: AdvisoryOptions,
  usdInr = 88.5,
): FemaItem[] {
  const usd = money.invoiceInr / usdInr;
  const cap = SCHEDULE_III_USD[o.serviceClass];
  const overCap = cap !== null && usd > cap;

  const items: FemaItem[] = [
    {
      id: "character",
      title: "Transaction character — current account, not capital account",
      provision: "FEMA s.5 read with FEM (Current Account Transactions) Rules, 2000",
      status: "ok",
      detail:
        "Payment for services or the use of software is a current-account transaction, freely permissible unless prohibited, restricted or above a Schedule III threshold. No ODI or OPI filing arises; Rule 7 net-worth headroom is not consumed.",
      action: "Book against the trade line, not the overseas investment line.",
      plain:
        "This is paying a supplier, not investing abroad — so the investment rules and the net-worth limit do not apply.",
    },
    {
      id: "schedule3",
      title: overCap ? "Schedule III limit exceeded — prior RBI approval required" : "Within Schedule III free limit",
      provision: "Rule 5 and Schedule III, FEM (Current Account Transactions) Rules, 2000",
      status: overCap ? "blocking" : "ok",
      detail: cap
        ? `${SERVICE_CLASS_LABEL[o.serviceClass]} carries an indicative approval threshold of USD ${new Intl.NumberFormat("en-IN").format(cap)} per project. This remittance is about USD ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(usd)}.`
        : `${SERVICE_CLASS_LABEL[o.serviceClass]} has no Schedule III project cap; the AD bank may release on documentary satisfaction. Remittance is about USD ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(usd)}.`,
      action: overCap
        ? "Route an RBI approval application through the AD Category-I bank before the invoice is settled, or split the engagement by project as contracted."
        : "No approval leg. Proceed on AD-bank documentary clearance.",
      plain: overCap
        ? "This payment is large enough that the central bank must say yes first."
        : "The payment is inside the free limit, so the bank alone can clear it.",
    },
    {
      id: "a2",
      title: "Form A2 declaration and AD Category-I duty",
      provision: "FEMA s.10(5); Master Direction — Import of Goods and Services",
      status: o.adEvidenceFiled ? "ok" : "attention",
      detail:
        "The AD bank must satisfy itself that the remittance is for a bona fide permissible transaction, on the strength of the Form A2 declaration, the contract and the invoice. For services there is no bill of entry; the contract and invoice are the evidence of import.",
      action: o.adEvidenceFiled
        ? "Attach the sealed determination digest to the A2 pack so the banker's file is complete."
        : "Lodge the contract, invoice and no-PE declaration with the AD bank before requesting release.",
      plain:
        "The bank has to see the contract and invoice and a signed declaration before it is allowed to send the money.",
    },
    {
      id: "purpose",
      title: `Purpose code and balance-of-payments reporting — ${purposeCode(charge)}`,
      provision: "RBI BoP reporting; R-Return / FETERS",
      status: "ok",
      detail: `The tax classification (${charge.classification}) and the FEMA purpose code must tell the same story. A royalty determination reported under a services code is the single most common reconciliation break at the AD bank.`,
      action: "Lock the purpose code to the determination before the payment instruction is cut.",
      plain: "The reason written on the tax paper and the reason written on the bank form must match.",
    },
    {
      id: "tax-link",
      title: "Tax clearance is a condition precedent to the remittance",
      provision: "Rule 37BB, Income-tax Rules read with FEMA s.10(5)",
      status: charge.chargeable && money.tds <= 0 ? "attention" : "ok",
      detail:
        "No AD bank may release a foreign-currency payment without the Form 15CA (and 15CB where required). The exchange-control leg and the tax leg are therefore one gate, not two.",
      action: "File 15CA before the payment instruction; keep the acknowledgement number on the A2.",
      plain: "The bank cannot send the money until the tax form is filed.",
    },
  ];

  if (o.relatedParty) {
    items.push({
      id: "arms-length",
      title: "Associated-enterprise payment — arm's length on both statutes",
      provision: "FEMA s.10(6); s.92 read with s.92CA, Income-tax Act, 1961",
      status: "attention",
      detail:
        "A remittance to a group entity must be at arm's length for transfer pricing and must be applied only to the declared purpose under FEMA. Both regulators read the same contract.",
      action: "Attach the benchmarking study and the intra-group agreement to the same evidence bundle.",
      plain: "Paying your own group company abroad gets checked twice — price it as you would with a stranger.",
    });
  }

  if (o.channel === "gift-ifsc") {
    items.push({
      id: "ifsc",
      title: "GIFT IFSC channel — IFSCA-regulated unit",
      provision: "IFSCA (Banking) Regulations; FEM (IFSC) Regulations, 2015",
      status: "ok",
      detail:
        "A unit in an International Financial Services Centre is treated as a person resident outside India for most FEMA purposes, which shortens the AD handoff, but the domestic tax gate under s.195 is unchanged.",
      action: "Book through the IFSC Banking Unit; keep the s.195 determination identical.",
      plain: "Sending through GIFT City is faster on the bank side, but the tax test is exactly the same.",
    });
  }

  items.push({
    id: "contravention",
    title: "Contravention exposure and the compounding route",
    provision: "FEMA s.13; FEM (Compounding Proceedings) Rules, 2000",
    status: overCap || !o.adEvidenceFiled ? "attention" : "ok",
    detail:
      "A contravention attracts a penalty of up to three times the sum involved where it is quantifiable, and the matter can be compounded with the Reserve Bank on voluntary disclosure. On this remittance three times the sum is " +
      inr(money.invoiceInr * 3) +
      ".",
    action:
      overCap || !o.adEvidenceFiled
        ? "Close the gap before remitting; a voluntary compounding application is cheaper than a detected contravention but costlier than getting it right today."
        : "No exposure identified on the present facts. The sealed digest is the evidence of diligence.",
    plain: "Getting exchange control wrong can cost up to three times the amount you sent.",
  });

  return items;
}

export const ADVISORY_STATUS_LABEL: Record<AdvisoryStatus, string> = {
  ok: "Clear",
  attention: "Attention",
  blocking: "Blocking",
};

/** Rows for the machine-readable export. */
export function advisoryRows(preds: Prediction[], fema: FemaItem[]): string[][] {
  return [
    ["Block", "Item", "Central", "Adverse", "Status", "Basis / provision", "Recommended action"],
    ...preds.map((p) => [
      "Prediction",
      p.label,
      p.p50,
      p.p90,
      p.severity,
      p.basis,
      p.action,
    ]),
    ...fema.map((f) => ["FEMA advisory", f.title, "—", "—", f.status, f.provision, f.action]),
  ];
}
