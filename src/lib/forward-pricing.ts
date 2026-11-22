/**
 * Forward pricing for the hedge desk by covered interest parity, using official
 * central bank policy rates (BIS). Pure helpers only. A theoretical forward is
 * not a dealable bank quote: banks add their own margin and price off money-market
 * rates that can differ from policy rates.
 */
import type { HedgePosition } from "@/lib/fx-swings";

export const RATE_SOURCE = "BIS central bank policy rates (WS_CBPOL), daily, latest observation";
export const MAX_RATE_AGE_DAYS = 400;

/** Currencies pegged to another whose policy rate is used as a labelled proxy. */
export const PEG_PROXY: Record<string, string> = { AED: "USD", BHD: "USD", OMR: "USD", QAR: "USD", NAD: "ZAR" };

export type PolicyRate = { ratePct: number; date: string; area: string; proxyOf?: string };
export type PolicyRatesPayload = {
  rates: Record<string, PolicyRate>;
  source: string;
  fetchedAt: string;
  error: string | null;
};

/** Pick each area's latest usable observation and map it to its currency. */
export function ratesFromObservations(
  rows: { area: string; date: string; value: number }[],
  areaToCcy: Record<string, string>,
  today: Date,
): Record<string, PolicyRate> {
  const out: Record<string, PolicyRate> = {};
  const cutoff = today.getTime() - MAX_RATE_AGE_DAYS * 86_400_000;
  for (const r of rows) {
    const ccy = areaToCcy[r.area];
    if (!ccy || !Number.isFinite(r.value)) continue;
    const t = Date.parse(r.date);
    if (!Number.isFinite(t) || t < cutoff) continue;
    const cur = out[ccy];
    if (!cur || r.date > cur.date) out[ccy] = { ratePct: r.value, date: r.date, area: r.area };
  }
  for (const [ccy, base] of Object.entries(PEG_PROXY)) {
    const b = out[base];
    if (!out[ccy] && b) out[ccy] = { ...b, proxyOf: base };
  }
  return out;
}

/** INR per unit forward for `days`, simple-interest covered parity on an actual/365 basis. */
export function forwardRate(spot: number, rInrPct: number, rCcyPct: number, days: number): number {
  const t = days / 365;
  return (spot * (1 + (rInrPct / 100) * t)) / (1 + (rCcyPct / 100) * t);
}

/** Annualised forward premium as a fraction: positive when the forward is above spot. */
export function premiumPa(spot: number, forward: number, days: number): number {
  return (forward / spot - 1) * (365 / days);
}

export type CarryLine = { code: string; forward: number | null; premiumPa: number | null; carryCr: number; priced: boolean; proxyOf?: string };

/**
 * Carry of hedging foreign holdings by selling the currency forward. Positive
 * carry is earned (forward above spot), negative is a cost. A bank margin, in
 * fraction a year, always reduces carry. Unpriced currencies use `fallbackCostPa`.
 */
export function hedgeCarry(
  positions: HedgePosition[],
  spots: Record<string, number>,
  rates: Record<string, PolicyRate>,
  weeks: number,
  marginPa: number,
  fallbackCostPa: number,
): { lines: CarryLine[]; netCr: number } {
  const days = Math.round(weeks * 7);
  const inr = rates["INR"];
  const lines = positions.map((p): CarryLine => {
    const hedged = Math.max(0, p.exposureCr) * Math.min(1, Math.max(0, p.hedgeRatio));
    const spot = spots[p.code];
    const r = rates[p.code];
    if (inr && r && spot) {
      const f = forwardRate(spot, inr.ratePct, r.ratePct, days);
      const prem = premiumPa(spot, f, days);
      return { code: p.code, forward: f, premiumPa: prem, carryCr: hedged * (prem - marginPa) * (weeks / 52), priced: true, ...(r.proxyOf ? { proxyOf: r.proxyOf } : {}) };
    }
    return { code: p.code, forward: null, premiumPa: null, carryCr: -hedged * fallbackCostPa * (weeks / 52), priced: false };
  });
  return { lines, netCr: lines.reduce((s, l) => s + l.carryCr, 0) };
}
