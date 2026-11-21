/**
 * Rate sources for the whole rail, in precedence order.
 *
 *  1. Terminal tier — Bloomberg (BLOOMBERG_API_KEY / BLOOMBERG_FX_URL) and
 *     Reuters/LSEG (LSEG_API_KEY / LSEG_FX_URL). Licensed feeds: used the
 *     moment the credentials exist in the environment, ignored otherwise.
 *  2. Interbank tier — round-the-clock public interbank composites, so the
 *     tape keeps printing 24h outside any single venue's session.
 *  3. Official tier — the Reserve Bank of India reference rate, published
 *     daily and scraped from rbi.org.in. This is the benchmark an AD Category-I
 *     bank and a FIRMS filing are read against, so it rides alongside the
 *     live tape rather than replacing it.
 *
 * Everything is labelled with the provider that actually printed it. No
 * number on the rail is allowed to be anonymous.
 */

export type RatePayload = {
  /** Units of the currency per 1 USD. */
  rates: Record<string, number>;
  /** Provider that printed the tape. */
  source: string;
  /** "terminal" (licensed) or "interbank" (public composite). */
  tier: "terminal" | "interbank";
  stamp: string;
  at: number;
};

export type OfficialPayload = {
  /** INR per 1 unit of currency, RBI reference rate. */
  inrPer: Record<string, number>;
  source: string;
  stamp: string;
  at: number;
};

function usable(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v) && v > 0 && /^[A-Z]{3}$/.test(k)) out[k] = v;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 1. Terminal tier — licensed feeds, active only when keys are present
 * ------------------------------------------------------------------ */

/**
 * Licensed desks do not all speak the same dialect, so the adapter is
 * configurable per venue without a code change:
 *   <VENUE>_API_KEY   the credential (required — no key, no terminal tier)
 *   <VENUE>_FX_URL    the endpoint returning USD-based rates
 *   <VENUE>_FX_AUTH   "bearer" (default) | "x-api-key" | "apikey" | "query"
 *   <VENUE>_FX_PATH   dot path to the rate map inside the payload, e.g. "data.rates"
 */
function pluck(payload: unknown, path?: string): unknown {
  if (!path) return undefined;
  let node: unknown = payload;
  for (const part of path.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

async function fromTerminal(
  label: string,
  prefix: string,
  fallbackUrl: string,
): Promise<RatePayload | null> {
  const key = process.env[`${prefix}_API_KEY`];
  if (!key) return null;
  try {
    const base = process.env[`${prefix}_FX_URL`] ?? fallbackUrl;
    const auth = (process.env[`${prefix}_FX_AUTH`] ?? "bearer").toLowerCase();
    const headers: Record<string, string> = { accept: "application/json" };
    let url = base;
    if (auth === "x-api-key") headers["x-api-key"] = key;
    else if (auth === "apikey") headers["apikey"] = key;
    else if (auth === "query") url += (base.includes("?") ? "&" : "?") + `apikey=${encodeURIComponent(key)}`;
    else headers["authorization"] = `Bearer ${key}`;

    const r = await fetch(url, { headers });
    if (!r.ok) return null;
    const d = (await r.json()) as Record<string, unknown> & { stamp?: string; date?: string };
    const rates = usable(
      pluck(d, process.env[`${prefix}_FX_PATH`]) ?? d["rates"] ?? d["data"] ?? d["quotes"],
    );
    if (Object.keys(rates).length < 5) return null;
    return { rates, source: label, tier: "terminal", stamp: d.stamp ?? d.date ?? "", at: Date.now() };
  } catch {
    return null;
  }
}

const fromBloomberg = () =>
  fromTerminal(
    "Bloomberg (licensed)",
    "BLOOMBERG",
    "https://api.bloomberg.com/enterprise/portfolio/fx/latest?base=USD",
  );

const fromLseg = () =>
  fromTerminal(
    "Reuters / LSEG (licensed)",
    "LSEG",
    "https://api.refinitiv.com/data/quantitative-analytics/v1/fx/latest?base=USD",
  );

/* ------------------------------------------------------------------ *
 * 2. Interbank tier — public 24h composites
 * ------------------------------------------------------------------ */

async function fromErApi(): Promise<RatePayload | null> {
  const r = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!r.ok) return null;
  const d = (await r.json()) as { rates?: Record<string, number>; time_last_update_utc?: string };
  const rates = usable(d.rates);
  if (Object.keys(rates).length < 5) return null;
  return {
    rates,
    source: "open.er-api.com interbank composite",
    tier: "interbank",
    stamp: d.time_last_update_utc ?? "",
    at: Date.now(),
  };
}

async function fromExchangerateApi(): Promise<RatePayload | null> {
  const r = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
  if (!r.ok) return null;
  const d = (await r.json()) as { rates?: Record<string, number>; date?: string };
  const rates = usable(d.rates);
  if (Object.keys(rates).length < 5) return null;
  return {
    rates,
    source: "exchangerate-api.com interbank composite",
    tier: "interbank",
    stamp: d.date ?? "",
    at: Date.now(),
  };
}

async function fromFrankfurter(): Promise<RatePayload | null> {
  const r = await fetch("https://api.frankfurter.dev/v1/latest?base=USD");
  if (!r.ok) return null;
  const d = (await r.json()) as { rates?: Record<string, number>; date?: string };
  const rates = usable(d.rates);
  if (Object.keys(rates).length < 5) return null;
  return {
    rates,
    source: "frankfurter.dev (ECB reference set)",
    tier: "interbank",
    stamp: d.date ?? "",
    at: Date.now(),
  };
}

const CHAIN = [fromBloomberg, fromLseg, fromErApi, fromExchangerateApi, fromFrankfurter];

let rateCache: RatePayload | null = null;
const RATE_TTL_MS = 15_000;

export async function getRates(): Promise<{ payload: RatePayload; cached: boolean; stale: boolean } | null> {
  if (rateCache && Date.now() - rateCache.at < RATE_TTL_MS) {
    return { payload: rateCache, cached: true, stale: false };
  }
  for (const src of CHAIN) {
    try {
      const p = await src();
      if (p) {
        rateCache = p;
        return { payload: p, cached: false, stale: false };
      }
    } catch {
      /* next source */
    }
  }
  return rateCache ? { payload: rateCache, cached: true, stale: true } : null;
}

/* ------------------------------------------------------------------ *
 * 3. Official tier — RBI reference rate
 * ------------------------------------------------------------------ */

let rbiCache: OfficialPayload | null = null;
const RBI_TTL_MS = 30 * 60_000;

/**
 * The Reserve Bank publishes its reference rate on the front page of
 * rbi.org.in as `INR / 1 USD : 95.1483` rows (JPY quoted per 100 units).
 * Parsed here into INR-per-unit so a filing can be priced on the same number
 * the regulator reads.
 */
export function parseRbi(html: string): Record<string, number> {
  const out: Record<string, number> = {};
  const re = /INR\s*\/\s*(\d*)\s*([A-Z]{3})[\s\S]{0,200}?:\s*([\d,]+\.\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const per = Number(m[1] ?? "") || 1;
    const code = m[2]!;
    const val = Number(m[3]!.replace(/,/g, ""));
    if (Number.isFinite(val) && val > 0) out[code] = val / per;
  }
  return out;
}

export async function getOfficial(): Promise<OfficialPayload | null> {
  if (rbiCache && Date.now() - rbiCache.at < RBI_TTL_MS) return rbiCache;
  try {
    const r = await fetch("https://www.rbi.org.in/", {
      headers: {
        // rbi.org.in refuses non-browser clients with a 418.
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!r.ok) return rbiCache;
    const inrPer = parseRbi(await r.text());
    if (!inrPer["USD"]) return rbiCache;
    rbiCache = {
      inrPer,
      source: "RBI reference rate (rbi.org.in)",
      stamp: new Date().toISOString().slice(0, 10),
      at: Date.now(),
    };
    return rbiCache;
  } catch {
    return rbiCache;
  }
}
