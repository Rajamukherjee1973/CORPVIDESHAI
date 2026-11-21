/**
 * Treasury ledger.
 *
 * Every case on the rail is priced off the print that was live when the
 * treasurer acted. This module turns the automated FX capture log (plus any
 * case booked by hand on the ledger desk) into a corridor-priced ledger: the
 * rate captured, the rate now, the drift between them, the AD Category-1
 * margin, correspondent charges, GST and treaty withholding, and the amount
 * that actually lands abroad.
 *
 * Charges follow the published market convention for AD Category-1 outward
 * remittances; they are a transparent model, printed alongside every row, not
 * a quotation from any single bank.
 */

import { HUBS, type Hub } from "@/data/hubs";
import { findHub } from "@/data/hub-catalog";
import { COUNTRY_META } from "@/data/currencies";
import { readCaptures, type FxCapture } from "@/lib/fx-stream";
import { ledgerTax, type LedgerTaxInput } from "@/lib/ledger-tax";

export type LedgerCase = {
  id: string;
  at: number;
  iso: string;
  /** Desk the case was booked from. */
  desk: string;
  entity: string;
  hub: string;
  country: string;
  code: string;
  /** Notional in INR crore. */
  crore: number;
  /** INR per unit at capture. */
  rateAt: number;
  /** Print sequence that priced the case. */
  seq: number;
  digest: string;
  route: string;
  source: "capture" | "booked";
  tax?: LedgerTaxInput;
};

/* ------------------------------------------------------------------ *
 * Booked cases — cases keyed on the ledger desk itself.
 * ------------------------------------------------------------------ */

const BOOK_KEY = "cv.ledger.cases.v1";
let booked: LedgerCase[] | null = null;
const subs = new Set<(rows: LedgerCase[]) => void>();

function loadBooked(): LedgerCase[] {
  if (booked) return booked;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOK_KEY);
    booked = raw ? (JSON.parse(raw) as LedgerCase[]) : [];
  } catch {
    booked = [];
  }
  return booked;
}

function persist() {
  if (typeof window === "undefined" || !booked) return;
  try {
    window.localStorage.setItem(BOOK_KEY, JSON.stringify(booked.slice(0, 200)));
  } catch {
    /* quota — session copy still stands */
  }
  const rows = booked;
  subs.forEach((f) => f(rows));
}

export function readBooked(): LedgerCase[] {
  return loadBooked();
}

export function bookCase(c: LedgerCase) {
  booked = [c, ...loadBooked()].slice(0, 200);
  persist();
}

export function removeCase(id: string) {
  booked = loadBooked().filter((c) => c.id !== id);
  persist();
}

export function subscribeBooked(fn: (rows: LedgerCase[]) => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

/* ------------------------------------------------------------------ *
 * Cases derived from the automated capture log.
 * ------------------------------------------------------------------ */

function hubForCurrency(code: string): Hub | undefined {
  return HUBS.find((h) => COUNTRY_META[h.country]?.currency === code);
}

function fromCapture(c: FxCapture): LedgerCase | null {
  if (c.crore === undefined || !(c.crore > 0)) return null;
  const hub = hubForCurrency(c.code);
  return {
    id: `CAP-${c.digest}`,
    at: c.at,
    iso: c.iso,
    desk: c.desk,
    entity: "—",
    hub: "Unallocated corridor",
    country: "—", // Currency alone cannot establish a treaty jurisdiction.
    code: c.code,
    crore: c.crore,
    rateAt: c.rate,
    seq: c.seq,
    digest: c.digest,
    route: hub?.route ?? "ODI / OPI",
    source: "capture",
    tax: { income: "unknown", taxableCr: 0, treatyEligible: false },
  };
}

/** Every case on the ledger: booked first, then captured, newest first. */
export function allCases(captures: FxCapture[] = readCaptures()): LedgerCase[] {
  const derived = captures.map(fromCapture).filter((x): x is LedgerCase => x !== null);
  const seen = new Set<string>();
  const manual = loadBooked();
  const bookedDigests = new Set(manual.map((c) => c.digest));
  return [...manual, ...derived.filter((c) => !bookedDigests.has(c.digest))]
    .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
    .sort((a, b) => b.at - a.at);
}

/* ------------------------------------------------------------------ *
 * Corridor pricing.
 * ------------------------------------------------------------------ */

/** AD Category-1 margin by corridor depth, in basis points on the notional. */
export function marginBps(hubCity: string): number {
  const hub = findHub(hubCity);
  const d = hub?.days ?? 26;
  if (hub?.country === "India") return 5; // GIFT IFSC unit corridor
  if (d <= 22) return 9;
  if (d <= 27) return 14;
  return 22;
}

/** Investment principal never inherits the legacy hub income-tax annotation. */
export function whtPct(hubCity: string): number {
  void hubCity;
  return 0;
}

/** Fixed correspondent-leg charges, INR. */
export const CORRESPONDENT_INR = 1_850;
export const CABLE_INR = 1_100;
export const GST_PCT = 18;

export type PricedCase = LedgerCase & {
  notionalInr: number;
  /** Foreign-currency equivalent at the captured print. */
  fcyAt: number;
  /** Live rate now, INR per unit. */
  rateNow: number;
  fcyNow: number;
  /** Move between the capture print and the live print, basis points. */
  driftBps: number;
  marginBps: number;
  marginInr: number;
  fixedInr: number;
  gstInr: number;
  whtPct: number | null;
  taxAssessment: ReturnType<typeof ledgerTax>;
  bankChargesInr: number;
  whtInr: number;
  chargesInr: number;
  /** Amount credited abroad after charges and withholding, in FCY. */
  netFcy: number;
  /** All-in cost of the corridor as a share of the notional, bps. */
  allInBps: number | null;
};

export function priceCase(c: LedgerCase, rateNow: number): PricedCase {
  const notionalInr = c.crore * 1e7;
  const bps = marginBps(c.hub);
  const marginInr = (notionalInr * bps) / 10_000;
  const fixedInr = CORRESPONDENT_INR + CABLE_INR;
  const gstInr = ((marginInr + fixedInr) * GST_PCT) / 100;
  const taxAssessment = ledgerTax(c.country, c.crore, c.tax);
  const w = taxAssessment.appliedPct;
  const whtInr = taxAssessment.withholdingInr;
  const chargesInr = marginInr + fixedInr + gstInr + whtInr;
  const live = rateNow > 0 ? rateNow : c.rateAt;
  const netInr = notionalInr - chargesInr;
  return {
    ...c,
    notionalInr,
    fcyAt: notionalInr / c.rateAt,
    rateNow: live,
    fcyNow: notionalInr / live,
    driftBps: ((live - c.rateAt) / c.rateAt) * 10_000,
    marginBps: bps,
    marginInr,
    fixedInr,
    gstInr,
    taxAssessment,
    bankChargesInr: marginInr + fixedInr + gstInr,
    whtPct: w,
    whtInr,
    chargesInr,
    netFcy: netInr / live,
    allInBps: taxAssessment.priced ? (chargesInr / notionalInr) * 10_000 : null,
  };
}

export function ledgerToCsv(rows: PricedCase[]): string {
  const head = [
    "case_id", "booked_iso", "desk", "entity", "hub", "country", "route", "currency",
    "notional_inr_crore", "notional_inr", "rate_at_capture_inr_per_unit", "print_seq",
    "rate_live_inr_per_unit", "drift_bps", "fcy_at_capture", "fcy_live",
    "ad_margin_bps", "ad_margin_inr", "correspondent_cable_inr", "gst_18pct_inr",
    "treaty_wht_pct", "treaty_wht_inr", "total_charges_inr", "all_in_bps",
    "net_credited_abroad_fcy", "capture_digest", "source", "income_category", "taxable_component_inr_crore", "tax_priced", "tax_basis", "treaty_source",
  ].join(",");
  const body = rows.map((r) =>
    [
      r.id, r.iso, `"${r.desk}"`, `"${r.entity}"`, `"${r.hub}"`, `"${r.country}"`, `"${r.route}"`, r.code,
      r.crore, r.notionalInr.toFixed(0), r.rateAt.toFixed(6), r.seq,
      r.rateNow.toFixed(6), r.driftBps.toFixed(2), r.fcyAt.toFixed(2), r.fcyNow.toFixed(2),
      r.marginBps, r.marginInr.toFixed(2), r.fixedInr.toFixed(2), r.gstInr.toFixed(2),
      r.whtPct ?? "", r.taxAssessment.priced ? r.whtInr.toFixed(2) : "", r.taxAssessment.priced ? r.chargesInr.toFixed(2) : "", r.allInBps?.toFixed(1) ?? "",
      r.taxAssessment.priced ? r.netFcy.toFixed(2) : "", r.digest, r.source, r.taxAssessment.income, r.taxAssessment.taxableCr, r.taxAssessment.priced, JSON.stringify(r.taxAssessment.basis), r.taxAssessment.source,
    ].join(","),
  );
  return [head, ...body].join("\n");
}

export function downloadLedger(rows: PricedCase[], kind: "csv" | "json") {
  const blob = new Blob(
    [kind === "csv" ? ledgerToCsv(rows) : JSON.stringify(rows, null, 2)],
    { type: kind === "csv" ? "text/csv" : "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `corpvidesh-treasury-ledger.${kind}`;
  a.click();
  URL.revokeObjectURL(url);
}
