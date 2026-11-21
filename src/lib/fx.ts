/**
 * Foreign-exchange helpers for the London interbank tape and the Indian
 * (Mumbai / GIFT IFSC) tape. Pure functions only, so they can be unit tested.
 */

export type Venue = "london" | "india";

export type Pair = {
  /** Base currency, quoted first: BASE/QUOTE. */
  base: string;
  /** Quote (counter) currency. */
  quote: string;
  /** Plain-language description shown under the pair. */
  note: string;
};

/** London interbank majors — the crosses that set the world price of money. */
export const LONDON_PAIRS: Pair[] = [
  { base: "GBP", quote: "USD", note: "Cable — sterling against the dollar" },
  { base: "EUR", quote: "USD", note: "The most traded cross on earth" },
  { base: "USD", quote: "JPY", note: "Dollar against the yen" },
  { base: "USD", quote: "CHF", note: "Dollar against the Swiss franc" },
  { base: "EUR", quote: "GBP", note: "Euro against sterling" },
  { base: "AUD", quote: "USD", note: "Aussie — commodity risk proxy" },
  { base: "USD", quote: "CAD", note: "Dollar against the Canadian dollar" },
  { base: "USD", quote: "SGD", note: "Dollar against the Singapore dollar" },
];

/** Indian market pairs — everything quoted against the rupee. */
export const INDIA_PAIRS: Pair[] = [
  { base: "USD", quote: "INR", note: "The reference rate for outbound remittance" },
  { base: "EUR", quote: "INR", note: "Euro settlement into EU hubs" },
  { base: "GBP", quote: "INR", note: "Sterling settlement into London" },
  { base: "JPY", quote: "INR", note: "Yen settlement into Tokyo" },
  { base: "AUD", quote: "INR", note: "Australian dollar settlement into Sydney" },
  { base: "SGD", quote: "INR", note: "Singapore dollar settlement" },
  { base: "CHF", quote: "INR", note: "Franc settlement into Zurich / Geneva" },
  { base: "HKD", quote: "INR", note: "Hong Kong dollar settlement" },
];

export function pairsFor(venue: Venue): Pair[] {
  return venue === "london" ? LONDON_PAIRS : INDIA_PAIRS;
}

export function pairKey(p: Pair): string {
  return `${p.base}/${p.quote}`;
}

/**
 * Cross-rate for BASE/QUOTE from a rate table quoted against a single base
 * currency (rates[X] = units of X per 1 unit of the table base).
 * Returns null when either leg is missing or unusable.
 */
export function crossRate(
  rates: Record<string, number>,
  base: string,
  quote: string,
  tableBase: string,
): number | null {
  const per = (c: string): number | null => {
    if (c === tableBase) return 1;
    const v = rates[c];
    return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
  };
  const b = per(base);
  const q = per(quote);
  if (b === null || q === null) return null;
  return q / b;
}

/** Decimal places conventionally quoted for a pair. */
export function precisionFor(p: Pair): number {
  if (p.quote === "INR") return p.base === "JPY" ? 4 : 4;
  if (p.quote === "JPY") return 3;
  return 5;
}

export function formatRate(v: number, p: Pair): string {
  return v.toFixed(precisionFor(p));
}

export type Direction = "up" | "down" | "flat";

/** Tick direction against the previous print, ignoring sub-basis-point noise. */
export function direction(now: number, before: number | undefined): Direction {
  if (before === undefined || !Number.isFinite(before) || before <= 0) return "flat";
  const delta = now - before;
  if (Math.abs(delta) < before * 1e-6) return "flat";
  return delta > 0 ? "up" : "down";
}

/** Percentage move against the previous print, e.g. "+0.14%". */
export function changePct(now: number, before: number | undefined): string {
  if (before === undefined || !Number.isFinite(before) || before <= 0) return "0.00%";
  const pct = ((now - before) / before) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

/** Is the venue's cash market inside normal trading hours right now (UTC input)? */
export function venueOpen(venue: Venue, d: Date): boolean {
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  // London interbank 08:00–17:00 London ≈ 07:00–17:00 UTC (DST tolerant).
  if (venue === "london") return mins >= 7 * 60 && mins < 17 * 60;
  // Indian interbank 09:00–17:00 IST = 03:30–11:30 UTC.
  return mins >= 3 * 60 + 30 && mins < 11 * 60 + 30;
}
