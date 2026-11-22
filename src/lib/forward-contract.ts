/**
 * Hedge contract builder: books an outright FX forward against the rupee and
 * values it. Pure helpers only. Prices come from covered interest parity on
 * official policy rates plus the customer's bank margin; they are indicative,
 * not a dealable bank quote, and booking here never places a real trade.
 */
import { forwardRate } from "@/lib/forward-pricing";

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
 * a buyer pays above the fair forward, a seller receives below it.
 */
export function quoteForward(t: QuoteInput, spot: number, rInrPct: number, rCcyPct: number): Quote | null {
  if (validateTerms(t) || !(spot > 0)) return null;
  const days = daysBetween(t.tradeDate, t.maturityDate);
  const fair = forwardRate(spot, rInrPct, rCcyPct, days);
  const m = marginPerUnit(spot, t.marginBp, days);
  const rate = t.side === "buy" ? fair + m : fair - m;
  return { days, fair, rate, marginPerUnit: m, premiumPa: (fair / spot - 1) * (365 / days), inrCr: (t.notional * rate) / 1e7 };
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
};

/**
 * Mark-to-market today. Before maturity the contract is revalued against the
 * fair forward for the remaining days, discounted at the INR rate; on or after
 * maturity it settles against spot.
 */
export function markToMarket(c: ForwardContract, today: string, spotNow: number, rInrPct: number, rCcyPct: number): Valuation {
  const remainingDays = daysBetween(today, c.maturityDate);
  if (remainingDays <= 0) return { remainingDays: 0, currentForward: spotNow, pnlInr: maturityPnl(c, spotNow), matured: true };
  const currentForward = forwardRate(spotNow, rInrPct, rCcyPct, remainingDays);
  const df = 1 / (1 + (rInrPct / 100) * (remainingDays / 365));
  return { remainingDays, currentForward, pnlInr: maturityPnl(c, currentForward) * df, matured: false };
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

/** Value a contract with policy rates when both exist; otherwise fall back to spot as a labelled proxy. */
export function valueContract(c: ForwardContract, today: string, spotNow: number, rInrPct: number | undefined, rCcyPct: number | undefined): Valuation & { proxy: boolean } {
  if (rInrPct == null || rCcyPct == null) {
    const remainingDays = Math.max(0, daysBetween(today, c.maturityDate));
    return { remainingDays, currentForward: spotNow, pnlInr: maturityPnl(c, spotNow), matured: remainingDays === 0, proxy: true };
  }
  return { ...markToMarket(c, today, spotNow, rInrPct, rCcyPct), proxy: false };
}
