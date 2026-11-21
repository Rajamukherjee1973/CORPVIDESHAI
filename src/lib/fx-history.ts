/**
 * Five-year rate history for any hub currency against the rupee.
 *
 * The prototype has no paid historical vendor feed, so the series is generated
 * deterministically per currency (seeded walk with currency-specific drift and
 * volatility) and then re-anchored so the last point equals the live streaming
 * print. That keeps the chart stable across reloads while remaining continuous
 * with the live tape.
 */

export type FxPoint = { t: number; v: number };

export type FxSeries = {
  code: string;
  points: FxPoint[];
  first: number;
  last: number;
  high: FxPoint;
  low: FxPoint;
  changePct: number;
  /** Annualised volatility of monthly log returns, percent. */
  volPct: number;
  cagrPct: number;
};

/** Structural drift/vol per currency block — rupee depreciates against hard FX. */
function profile(code: string): { drift: number; vol: number } {
  const hard = ["USD", "CHF", "SGD", "EUR", "GBP", "AUD", "CAD", "HKD", "JPY", "NOK", "SEK", "DKK", "ILS", "AED", "SAR", "QAR", "BHD", "OMR", "KWD"];
  const soft = ["NGN", "EGP", "KES", "ZAR", "BRL", "ARS", "TRY", "LKR", "IDR", "PHP", "VND", "COP", "MXN", "CLP"];
  if (soft.includes(code)) return { drift: -0.035, vol: 0.14 };
  if (hard.includes(code)) return { drift: 0.028, vol: 0.075 };
  return { drift: 0.012, vol: 0.09 };
}

function seedOf(code: string): number {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = 60;

/** Build a 5-year monthly series ending at the live spot. */
export function fiveYearSeries(code: string, spot: number): FxSeries {
  const { drift, vol } = profile(code);
  const rnd = mulberry(seedOf(code));
  const raw: number[] = [1];
  for (let i = 1; i <= MONTHS; i++) {
    const shock = (rnd() + rnd() + rnd() - 1.5) * (vol / Math.sqrt(12)) * 1.6;
    const cycle = Math.sin(i / 7 + seedOf(code) % 7) * (vol / 34);
    raw.push(raw[i - 1]! * (1 + drift / 12 + shock + cycle));
  }
  const scale = spot / raw[raw.length - 1]!;
  const now = new Date();
  const points: FxPoint[] = raw.map((v, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - i), 1);
    return { t: d.getTime(), v: v * scale };
  });
  points[points.length - 1] = { t: now.getTime(), v: spot };

  let high = points[0]!;
  let low = points[0]!;
  for (const p of points) {
    if (p.v > high.v) high = p;
    if (p.v < low.v) low = p;
  }
  const first = points[0]!.v;
  const last = spot;
  const rets: number[] = [];
  for (let i = 1; i < points.length; i++) rets.push(Math.log(points[i]!.v / points[i - 1]!.v));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return {
    code,
    points,
    first,
    last,
    high,
    low,
    changePct: ((last - first) / first) * 100,
    volPct: Math.sqrt(variance * 12) * 100,
    cagrPct: ((last / first) ** (1 / 5) - 1) * 100,
  };
}

/** Slice the tail of a series by window in years. */
export function windowed(series: FxSeries, years: 1 | 3 | 5): FxPoint[] {
  const n = years * 12 + 1;
  return series.points.slice(Math.max(0, series.points.length - n));
}

export function fmtMonth(t: number): string {
  return new Date(t).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}
