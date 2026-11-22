/**
 * Hedge contract builder: books an outright FX forward against the rupee and
 * values it. Pure helpers only. USD fair forwards use FBIL's official USD/INR
 * forward premia (built from banks' interbank quotes) on live spot; other
 * currencies, and tenors past 12 months, use covered interest parity on
 * official policy rates. The customer's bank margin is added on top. Neither is
 * an executable quote from the customer's bank, and booking never places a trade.
 */
import { forwardRate } from "@/lib/forward-pricing";
import { benchmarkForward, type FbilCurve } from "@/lib/fbil-forward";
import { bankForwardFor, type BankSheet } from "@/lib/bank-forward";

/** bank = the bank's daily rate sheet scaled to live spot; fbil = FBIL USD/INR premia on live spot; parity = covered interest parity on policy rates. */
export type FairBasis = "bank" | "fbil" | "parity";

/**
 * Fair forward for `days`: the bank sheet's mid when supplied and covering the
 * tenor, else the FBIL benchmark, else covered parity. Pass a bank sheet only
 * for USD and only while it is current.
 */
export function fairForward(spot: number, days: number, rInrPct: number | undefined, rCcyPct: number | undefined, benchmark?: FbilCurve | null, bank?: BankSheet | null): { fair: number; basis: FairBasis; bid?: number; ask?: number } | null {
  const q = bank ? bankForwardFor(bank, spot, days) : null;
  if (q) return { fair: q.mid, basis: "bank", bid: q.bid, ask: q.ask };
  const b = benchmark ? benchmarkForward(spot, benchmark, days) : null;
  if (b != null) return { fair: b, basis: "fbil" };
  if (rInrPct == null || rCcyPct == null || !(spot > 0)) return null;
  return { fair: forwardRate(spot, rInrPct, rCcyPct, days), basis: "parity" };
}

/** buy = the company buys the foreign currency forward (pays abroad, e.g. an ODI remittance); sell = it sells foreign currency it will receive or holds. */
export type ForwardSide = "buy" | "sell";

export type ForwardContract = {
  ref: string;
  code: string;
  side: ForwardSide;
  /** Foreign currency units. */
  notional: number;
  tradeDate: string;
  maturityDate: string;
  marginBp: number;
  /** INR per unit agreed for maturity. */
  rate: number;
  /** Fair (no-margin) forward at booking, INR per unit. */
  fairAtTrade: number;
  spotAtTrade: number;
  /** True when the user typed the bank's confirmed rate instead of the suggested one. */
  rateOverridden: boolean;
  bookedAt: string;
};

export const MAX_TENOR_DAYS = 1095;
const DAY = 86_400_000;

const utc = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Number.NaN;
};

/** Whole calendar days from a to b (b − a). NaN for malformed dates. */
export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / DAY);
}

export function addDays(iso: string, days: number): string {
  return new Date(utc(iso) + days * DAY).toISOString().slice(0, 10);
}

/** Margin in INR per unit: basis points a year on spot, pro rata on actual/365. */
export function marginPerUnit(spot: number, marginBp: number, days: number): number {
  return spot * (Math.max(0, marginBp) / 10_000) * (days / 365);
}

export type Quote = {
  days: number;
  fair: number;
  rate: number;
  marginPerUnit: number;
  premiumPa: number;
  inrCr: number;
  basis: FairBasis;
  /** Bank sheet buy/sell for this tenor when basis is "bank". */
  bank?: { bid: number; ask: number };
};

export type QuoteInput = { side: ForwardSide; notional: number; tradeDate: string; maturityDate: string; marginBp: number };

/** Validation message, or null when the contract terms are usable. */
export function validateTerms(t: QuoteInput): string | null {
  const days = daysBetween(t.tradeDate, t.maturityDate);
  if (!Number.isFinite(days)) return "Enter both dates.";
  if (days < 1) return "Maturity must be after the trade date.";
  if (days > MAX_TENOR_DAYS) return "Maturity can be at most three years after the trade date.";
  if (!(t.notional > 0)) return "Enter an amount above zero.";
  if (t.marginBp < 0 || t.marginBp > 1000) return "Margin must be between 0 and 1,000 basis points.";
  return null;
}

/**
 * Indicative contract rate. The bank margin always works against the customer:
 * a buyer pays above the fair forward, a seller receives below it. From a bank
 * sheet the customer gets the bank's sell rate when buying and its buy rate when
 * selling; the sheet's spread already is the bank's margin, so none is added.
 */
export function quoteForward(t: QuoteInput, spot: number, rInrPct: number | undefined, rCcyPct: number | undefined, benchmark?: FbilCurve | null, bank?: BankSheet | null): Quote | null {
  if (validateTerms(t) || !(spot > 0)) return null;
  const days = daysBetween(t.tradeDate, t.maturityDate);
  const f = fairForward(spot, days, rInrPct, rCcyPct, benchmark, bank);
  if (!f) return null;
  if (f.basis === "bank" && f.bid != null && f.ask != null) {
    const rate = t.side === "buy" ? f.ask : f.bid;
    return { days, fair: f.fair, rate, marginPerUnit: Math.abs(rate - f.fair), premiumPa: (f.fair / spot - 1) * (365 / days), inrCr: (t.notional * rate) / 1e7, basis: "bank", bank: { bid: f.bid, ask: f.ask } };
  }
  const m = marginPerUnit(spot, t.marginBp, days);
  const rate = t.side === "buy" ? f.fair + m : f.fair - m;
  return { days, fair: f.fair, rate, marginPerUnit: m, premiumPa: (f.fair / spot - 1) * (365 / days), inrCr: (t.notional * rate) / 1e7, basis: f.basis };
}

const sign = (s: ForwardSide) => (s === "buy" ? 1 : -1);

/** Profit or loss at maturity in INR if the rupee settles at `spotAtMaturity`, versus not hedging. */
export function maturityPnl(c: Pick<ForwardContract, "side" | "notional" | "rate">, spotAtMaturity: number): number {
  return sign(c.side) * c.notional * (spotAtMaturity - c.rate);
}

export type Valuation = {
  remainingDays: number;
  /** INR per unit the same maturity would trade at today (fair, no margin). */
  currentForward: number;
  /** Mark-to-market in INR, discounted at the INR rate. */
  pnlInr: number;
  matured: boolean;
  /** What today's forward was priced from; "spot" once matured or as a proxy. */
  basis: FairBasis | "spot";
};

/**
 * Mark-to-market today. Before maturity the contract is revalued against the
 * fair forward for the remaining days, discounted at the INR rate; on or after
 * maturity it settles against spot.
 */
export function markToMarket(c: ForwardContract, today: string, spotNow: number, rInrPct: number, rCcyPct: number, benchmark?: FbilCurve | null, bank?: BankSheet | null): Valuation {
  const remainingDays = daysBetween(today, c.maturityDate);
  return revalue(c, remainingDays, spotNow, rInrPct, remainingDays > 0 ? fairForward(spotNow, remainingDays, rInrPct, rCcyPct, benchmark, bank) : null);
}

function revalue(c: ForwardContract, remainingDays: number, spotNow: number, rInrPct: number, f: { fair: number; basis: FairBasis } | null): Valuation {
  if (remainingDays <= 0 || !f) return { remainingDays: Math.max(0, remainingDays), currentForward: spotNow, pnlInr: maturityPnl(c, spotNow), matured: remainingDays <= 0, basis: "spot" };
  const df = 1 / (1 + (rInrPct / 100) * (remainingDays / 365));
  return { remainingDays, currentForward: f.fair, pnlInr: maturityPnl(c, f.fair) * df, matured: false, basis: f.basis };
}

/** Points for a payoff chart across a symmetric band of rupee rates around `centre`. */
export function payoffCurve(c: Pick<ForwardContract, "side" | "notional" | "rate">, centre: number, bandPct = 0.1, steps = 40) {
  const lo = centre * (1 - bandPct), hi = centre * (1 + bandPct);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const s = lo + ((hi - lo) * i) / steps;
    return { spot: s, pnl: maturityPnl(c, s) };
  });
}

/** Sequential, human-readable contract reference: FWD-2026-USD-0007. */
export function contractRef(year: number, code: string, seq: number): string {
  return `FWD-${year}-${code.toUpperCase()}-${String(Math.max(1, Math.floor(seq))).padStart(4, "0")}`;
}

/**
 * Value a contract from the bank sheet mid or FBIL benchmark (USD, when
 * supplied) or policy-rate parity, discounted at India's policy rate; without
 * those, fall back to spot as a labelled proxy.
 */
export function valueContract(c: ForwardContract, today: string, spotNow: number, rInrPct: number | undefined, rCcyPct: number | undefined, benchmark?: FbilCurve | null, bank?: BankSheet | null): Valuation & { proxy: boolean } {
  const remainingDays = daysBetween(today, c.maturityDate);
  const f = rInrPct != null && remainingDays > 0 ? fairForward(spotNow, remainingDays, rInrPct, rCcyPct, benchmark, bank) : null;
  if (rInrPct == null || (remainingDays > 0 && !f)) {
    const left = Math.max(0, remainingDays);
    return { remainingDays: left, currentForward: spotNow, pnlInr: maturityPnl(c, spotNow), matured: left === 0, proxy: true, basis: "spot" };
  }
  return { ...revalue(c, remainingDays, spotNow, rInrPct, f), proxy: false };
}
