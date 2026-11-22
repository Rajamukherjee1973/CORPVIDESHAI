/**
 * Measured currency risk for hub comparisons. Pure helpers only: the server
 * fetches dated INR reference snapshots, these turn them into realised
 * annualised volatility of INR per unit of each currency. One source and one
 * sampling rule for every hub keeps global and African corridors like-for-like.
 */

export const FX_RISK_WEEKS = 52;
export const FX_RISK_MIN_RETURNS = 26;
export const FX_RISK_SOURCE = "fawazahmed0 currency-api · daily aggregated reference snapshots";
export const FX_RISK_METHOD = `Standard deviation of ${FX_RISK_WEEKS} weekly log changes in INR per unit, annualised ×√52`;

export type RatePoint = { date: string; inrPer: number };

export type MeasuredVol = {
  code: string;
  /** Annualised realised volatility as a fraction (0.062 = 6.2%). */
  vol: number;
  /** Number of weekly changes the figure is built from. */
  observations: number;
  from: string;
  to: string;
};

export type FxRiskPayload = {
  vols: Record<string, MeasuredVol>;
  /** Weekly INR-per-unit observations behind each measured figure, oldest first. */
  series: Record<string, RatePoint[]>;
  /** Requested currencies the source could not measure; they are never estimated here. */
  missing: string[];
  source: string;
  method: string;
  /** Latest snapshot date used. */
  asOf: string | null;
  fetchedAt: string;
  error: string | null;
};

/** Snapshot dates, oldest first: `end` and the same weekday for each prior week. */
export function snapshotDates(end: Date, weeks = FX_RISK_WEEKS): string[] {
  const out: string[] = [];
  for (let w = weeks; w >= 0; w--) {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - w * 7));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Realised annualised volatility from weekly points; null when too few clean observations. */
export function realisedVol(code: string, points: RatePoint[], periodsPerYear = 52): MeasuredVol | null {
  const clean = points
    .filter((p) => Number.isFinite(p.inrPer) && p.inrPer > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const r: number[] = [];
  for (let k = 1; k < clean.length; k++) r.push(Math.log(clean[k]!.inrPer / clean[k - 1]!.inrPer));
  if (r.length < FX_RISK_MIN_RETURNS) return null;
  const mean = r.reduce((s, x) => s + x, 0) / r.length;
  const variance = r.reduce((s, x) => s + (x - mean) ** 2, 0) / (r.length - 1);
  return {
    code,
    vol: Math.sqrt(variance) * Math.sqrt(periodsPerYear),
    observations: r.length,
    from: clean[0]!.date,
    to: clean[clean.length - 1]!.date,
  };
}

/**
 * Snapshots quote units of each currency per 1 INR (lower-case keys);
 * convert to INR per unit and measure each requested code.
 */
export function measureFromSnapshots(
  codes: string[],
  snapshots: { date: string; perInr: Record<string, number> }[],
): { vols: Record<string, MeasuredVol>; series: Record<string, RatePoint[]>; missing: string[] } {
  const vols: Record<string, MeasuredVol> = {};
  const series: Record<string, RatePoint[]> = {};
  const missing: string[] = [];
  for (const code of codes) {
    const points: RatePoint[] = [];
    for (const s of snapshots) {
      const v = s.perInr[code.toLowerCase()];
      if (typeof v === "number" && v > 0) points.push({ date: s.date, inrPer: 1 / v });
    }
    const m = realisedVol(code, points);
    if (m) {
      vols[code] = m;
      series[code] = points.sort((a, b) => a.date.localeCompare(b.date));
    } else missing.push(code);
  }
  return { vols, series, missing };
}
