/**
 * FBIL USD/INR forward premia: the official Indian benchmark published by
 * Financial Benchmarks India Pvt Ltd from banks' interbank forward quotes.
 * Pure helpers only. The public release is delayed and covers USD/INR only; it
 * is a market benchmark, not an executable quote from the customer's own bank.
 */
export const FBIL_SOURCE = "FBIL USD/INR Forward Premia (public release)";
export const FBIL_URL = "https://www.fbil.org.in/#/benchmark/premia";
/** Older releases are treated as unavailable rather than silently reused. */
export const FBIL_MAX_AGE_DAYS = 21;
/** How far past the 12-month point the last premium may be carried. */
export const FBIL_EXTRAPOLATE_DAYS = 10;

export type FbilPoint = { tenor: string; settlementDate: string; days: number; premiaPct: number; premiaRs: number };
export type FbilCurve = { asOf: string; publishedAt: string; spotDate: string; points: FbilPoint[] };
export type FbilPayload = { curve: FbilCurve | null; source: string; fetchedAt: string; error: string | null };

type RawRow = { processRunDate?: unknown; displayTime?: unknown; tenorName?: unknown; settlementDate?: unknown; rate?: unknown; usdInrPremiaRs?: unknown };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const utc = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Number.NaN;
};
const days = (a: string, b: string) => Math.round((utc(b) - utc(a)) / 86_400_000);
const num = (v: unknown) => (v === "" || v == null ? Number.NaN : Number(v));
const date10 = (v: unknown) => String(v ?? "").slice(0, 10);

/** Latest day's monthly-tenor curve from FBIL rows; null when the shape is unusable. */
export function curveFromRows(rows: unknown): FbilCurve | null {
  if (!Array.isArray(rows)) return null;
  const typed = rows as RawRow[];
  const asOf = typed.map((r) => date10(r.processRunDate)).filter((d) => ISO.test(d)).sort().at(-1);
  if (!asOf) return null;
  const day = typed.filter((r) => date10(r.processRunDate) === asOf);
  const spotRow = day.find((r) => r.tenorName === "Spot");
  const spotDate = date10(spotRow?.settlementDate);
  if (!ISO.test(spotDate)) return null;
  const points = day.flatMap((r): FbilPoint[] => {
    const tenor = String(r.tenorName ?? "");
    if (!/^\d{1,2}M$/.test(tenor)) return [];
    const settlementDate = date10(r.settlementDate);
    const d = days(spotDate, settlementDate);
    const pct = num(r.rate), rs = num(r.usdInrPremiaRs);
    if (!Number.isFinite(pct) || !Number.isFinite(d) || d <= 0) return [];
    return [{ tenor, settlementDate, days: d, premiaPct: pct, premiaRs: Number.isFinite(rs) ? rs : 0 }];
  }).sort((a, b) => a.days - b.days);
  if (points.length < 3) return null;
  return { asOf, publishedAt: String(spotRow?.displayTime ?? ""), spotDate, points };
}

/** Calendar days since the benchmark date. */
export function curveAgeDays(curve: Pick<FbilCurve, "asOf">, today: string): number {
  return days(curve.asOf, today);
}

export function curveIsCurrent(curve: Pick<FbilCurve, "asOf">, today: string): boolean {
  const age = curveAgeDays(curve, today);
  return Number.isFinite(age) && age >= 0 && age <= FBIL_MAX_AGE_DAYS;
}

/**
 * Annualised premium (% a year, simple actual/365 on spot) for `d` days,
 * linearly interpolated between published tenors and flat before 1M. Null past
 * the 12-month point (plus a small allowance): no benchmark exists there.
 */
export function premiaPctFor(curve: FbilCurve, d: number): number | null {
  const p = curve.points;
  const first = p[0], last = p.at(-1);
  if (!first || !last || !(d > 0) || d > last.days + FBIL_EXTRAPOLATE_DAYS) return null;
  if (d <= first.days) return first.premiaPct;
  if (d >= last.days) return last.premiaPct;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i]!, b = p[i + 1]!;
    if (d >= a.days && d <= b.days) return a.premiaPct + ((d - a.days) / (b.days - a.days)) * (b.premiaPct - a.premiaPct);
  }
  return null;
}

/** INR per USD forward for `d` days: live spot plus the FBIL premium for that tenor. */
export function benchmarkForward(spot: number, curve: FbilCurve, d: number): number | null {
  const pct = premiaPctFor(curve, d);
  return pct == null || !(spot > 0) ? null : spot * (1 + (pct / 100) * (d / 365));
}
