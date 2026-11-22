/**
 * Historical swing statistics and hedge-book risk for hub currencies.
 * Pure and deterministic: inputs are the weekly INR-per-unit observations
 * returned with measured currency risk. Figures describe the past year of
 * reference prices; they are not forecasts, quotes or hedging advice.
 */
import type { RatePoint } from "@/lib/fx-risk";

export const Z95 = 1.645;
export const MIN_COMMON_WEEKS = 26;

export type Swing = {
  code: string;
  last: number;
  lastDate: string;
  /** Simple change in INR per unit over 1, 4, 13 and 52 weeks; null if history is too short. */
  chg1w: number | null;
  chg4w: number | null;
  chg13w: number | null;
  chg52w: number | null;
  high: number;
  highDate: string;
  low: number;
  lowDate: string;
  /** Where the last observation sits in the 52-week range, 0 = low, 1 = high. */
  rangePos: number;
  /** Largest peak-to-trough fall in INR per unit (negative fraction): loss for an outbound holder. */
  maxDrawdown: number;
  worstWeek: { date: string; chg: number } | null;
  bestWeek: { date: string; chg: number } | null;
  /** Annualised volatility of weekly log changes. */
  vol: number;
};

function clean(points: RatePoint[]): RatePoint[] {
  return points.filter((p) => Number.isFinite(p.inrPer) && p.inrPer > 0).sort((a, b) => a.date.localeCompare(b.date));
}

export function swingStats(code: string, points: RatePoint[] | undefined): Swing | null {
  const pts = clean(points ?? []);
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1]!;
  const back = (n: number) => (pts.length > n ? last.inrPer / pts[pts.length - 1 - n]!.inrPer - 1 : null);
  let high = pts[0]!, low = pts[0]!, peak = pts[0]!.inrPer, mdd = 0;
  let worst: Swing["worstWeek"] = null, best: Swing["bestWeek"] = null;
  const r: number[] = [];
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k]!;
    if (p.inrPer > high.inrPer) high = p;
    if (p.inrPer < low.inrPer) low = p;
    peak = Math.max(peak, p.inrPer);
    mdd = Math.min(mdd, p.inrPer / peak - 1);
    if (k > 0) {
      const chg = p.inrPer / pts[k - 1]!.inrPer - 1;
      r.push(Math.log(1 + chg));
      if (!worst || chg < worst.chg) worst = { date: p.date, chg };
      if (!best || chg > best.chg) best = { date: p.date, chg };
    }
  }
  const mean = r.reduce((s, x) => s + x, 0) / r.length;
  const variance = r.length > 1 ? r.reduce((s, x) => s + (x - mean) ** 2, 0) / (r.length - 1) : 0;
  const span = high.inrPer - low.inrPer;
  return {
    code,
    last: last.inrPer,
    lastDate: last.date,
    chg1w: back(1),
    chg4w: back(4),
    chg13w: back(13),
    chg52w: back(52),
    high: high.inrPer,
    highDate: high.date,
    low: low.inrPer,
    lowDate: low.date,
    rangePos: span > 0 ? (last.inrPer - low.inrPer) / span : 0.5,
    maxDrawdown: mdd,
    worstWeek: worst,
    bestWeek: best,
    vol: Math.sqrt(variance) * Math.sqrt(52),
  };
}

/** Plausible move over a horizon from annualised vol: one-sigma and 95% one-sided. */
export function horizonMove(vol: number, weeks: number) {
  const sigma = vol * Math.sqrt(weeks / 52);
  return { sigma, p95: Z95 * sigma };
}

export type HedgePosition = { code: string; exposureCr: number; hedgeRatio: number };

export type BookRisk = {
  codes: string[];
  observations: number;
  /** 95% one-sided loss over the horizon, crore, with no hedges. */
  unhedgedVar: number;
  /** Same, on the unhedged remainder after hedge ratios. */
  hedgedVar: number;
  /** Sum of each position's standalone hedged 95% loss: no diversification. */
  standaloneVar: number;
  diversification: number;
  /** Worst single observed week for the hedged and unhedged book, crore. */
  worstWeek: { date: string; hedged: number; unhedged: number } | null;
  corr: number[][];
};

/** Weekly log changes keyed by observation date. */
export function weeklyReturns(points: RatePoint[]): Map<string, number> {
  const pts = clean(points);
  const out = new Map<string, number>();
  for (let k = 1; k < pts.length; k++) out.set(pts[k]!.date, Math.log(pts[k]!.inrPer / pts[k - 1]!.inrPer));
  return out;
}

/**
 * Variance–covariance loss estimate on dates every position shares, plus the
 * worst observed week replayed on today's book. Exposure is the INR value of
 * foreign assets; a fall in INR per unit is a loss.
 */
export function bookRisk(positions: HedgePosition[], series: Record<string, RatePoint[]>, horizonWeeks: number): BookRisk | null {
  const book = new Map<string, { gross: number; net: number }>();
  for (const p of positions) {
    if (!(p.exposureCr > 0)) continue;
    const h = Math.min(1, Math.max(0, p.hedgeRatio));
    const cur = book.get(p.code) ?? { gross: 0, net: 0 };
    book.set(p.code, { gross: cur.gross + p.exposureCr, net: cur.net + p.exposureCr * (1 - h) });
  }
  const codes = [...book.keys()].filter((c) => series[c]?.length);
  if (codes.length === 0) return null;
  const rets = codes.map((c) => weeklyReturns(series[c]!));
  const dates = [...rets[0]!.keys()].filter((d) => rets.every((m) => m.has(d))).sort();
  if (dates.length < MIN_COMMON_WEEKS) return null;
  const R = rets.map((m) => dates.map((d) => m.get(d)!));
  const n = dates.length;
  const means = R.map((x) => x.reduce((s, v) => s + v, 0) / n);
  const cov = R.map((x, i) => R.map((y, j) => x.reduce((s, v, t) => s + (v - means[i]!) * (y[t]! - means[j]!), 0) / (n - 1)));
  const gross = codes.map((c) => book.get(c)!.gross);
  const net = codes.map((c) => book.get(c)!.net);
  const sd = (e: number[]) => Math.sqrt(Math.max(0, e.reduce((s, ei, i) => s + e.reduce((t, ej, j) => t + ei * ej * cov[i]![j]!, 0), 0)));
  const scale = Z95 * Math.sqrt(horizonWeeks);
  const hedgedVar = sd(net) * scale;
  const standaloneVar = net.reduce((s, e, i) => s + Math.abs(e) * Math.sqrt(cov[i]![i]!), 0) * scale;
  let worst: BookRisk["worstWeek"] = null;
  dates.forEach((d, t) => {
    const hedged = net.reduce((s, e, i) => s + e * (Math.exp(R[i]![t]!) - 1), 0);
    const unhedged = gross.reduce((s, e, i) => s + e * (Math.exp(R[i]![t]!) - 1), 0);
    if (!worst || unhedged < worst.unhedged) worst = { date: d, hedged, unhedged };
  });
  const corr = cov.map((row, i) => row.map((v, j) => {
    const den = Math.sqrt(cov[i]![i]! * cov[j]![j]!);
    return den > 0 ? v / den : i === j ? 1 : 0;
  }));
  return {
    codes,
    observations: n,
    unhedgedVar: sd(gross) * scale,
    hedgedVar,
    standaloneVar,
    diversification: Math.max(0, standaloneVar - hedgedVar),
    worstWeek: worst,
    corr,
  };
}

/** Forward-carry cost of the hedged notional over the horizon at an assumed annual rate. */
export function hedgeCost(positions: HedgePosition[], carryPa: number, horizonWeeks: number): number {
  return positions.reduce((s, p) => s + Math.max(0, p.exposureCr) * Math.min(1, Math.max(0, p.hedgeRatio)) * carryPa * (horizonWeeks / 52), 0);
}

/** Uniform INR move applied to every position: +shock means INR per unit rises (gain). */
export function shockPnl(positions: HedgePosition[], shock: number): { hedged: number; unhedged: number } {
  let hedged = 0, unhedged = 0;
  for (const p of positions) {
    const e = Math.max(0, p.exposureCr);
    unhedged += e * shock;
    hedged += e * (1 - Math.min(1, Math.max(0, p.hedgeRatio))) * shock;
  }
  return { hedged, unhedged };
}

export type PolicyBand = "Low" | "Moderate" | "High";
/** Illustrative volatility-banded hedge-ratio rule; a treasury sets its own policy. */
export function policyRatio(vol: number): { ratio: number; band: PolicyBand } {
  if (vol < 0.06) return { ratio: 0.25, band: "Low" };
  if (vol < 0.12) return { ratio: 0.5, band: "Moderate" };
  return { ratio: 0.75, band: "High" };
}
