/**
 * Real market feed for the Proof Desk.
 *
 * The incumbent-versus-rail comparison used to run on demonstrated constants.
 * It now runs on live prints: the round-the-clock interbank FX endpoint for the
 * corridor rate, and the benchmark-index endpoint for the venue the scenario is
 * actually settled against. Ticket sizes are converted at the live rate, and
 * counterparty/jurisdiction risk is anchored to observed session dispersion
 * rather than a guess, so the numbers on screen are defensible.
 */

import { useEffect, useState } from "react";

export type FeedQuote = {
  symbol: string;
  price: number;
  prevClose: number;
  currency: string;
  venue: string;
  ts: number;
};

export type LiveFeed = {
  /** USD-base rates from the rate route (units per 1 USD). */
  rates: Record<string, number>;
  /** Provider that printed the tape. */
  source: string;
  /** "terminal" = licensed Bloomberg / Reuters-LSEG, "interbank" = composite. */
  tier: "terminal" | "interbank";
  stamp: string;
  /** RBI reference rate, INR per unit — the number a FIRMS filing is read against. */
  official: Record<string, number>;
  officialSource: string;
  officialStamp: string;
  quotes: Record<string, FeedQuote>;
  at: number;
  status: "loading" | "live" | "unavailable";
};

const EMPTY: LiveFeed = {
  rates: {},
  source: "",
  tier: "interbank",
  stamp: "",
  official: {},
  officialSource: "",
  officialStamp: "",
  quotes: {},
  at: 0,
  status: "loading",
};

let feed: LiveFeed = EMPTY;
const subs = new Set<(f: LiveFeed) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

async function pull() {
  try {
    const [fxR, mkR] = await Promise.all([
      fetch("/api/public/fx"),
      fetch("/api/public/markets"),
    ]);
    const fx = fxR.ok
      ? ((await fxR.json()) as {
          rates?: Record<string, number>;
          source?: string;
          tier?: "terminal" | "interbank";
          stamp?: string;
          official?: { inrPer: Record<string, number>; source: string; stamp: string } | null;
        })
      : {};
    const mk = mkR.ok
      ? ((await mkR.json()) as { quotes?: Record<string, FeedQuote> })
      : {};
    const rates = fx.rates ?? {};
    feed = {
      rates,
      source: fx.source ?? "",
      tier: fx.tier ?? "interbank",
      stamp: fx.stamp ?? "",
      official: fx.official?.inrPer ?? feed.official,
      officialSource: fx.official?.source ?? feed.officialSource,
      officialStamp: fx.official?.stamp ?? feed.officialStamp,
      quotes: mk.quotes ?? {},
      at: Date.now(),
      status: Object.keys(rates).length ? "live" : "unavailable",
    };
  } catch {
    feed = { ...feed, status: feed.status === "live" ? "live" : "unavailable" };
  }
  subs.forEach((f) => f(feed));
}

/** Subscribe a desk to the shared real feed (30-second refresh). */
export function useLiveFeed(): LiveFeed {
  const [f, setF] = useState<LiveFeed>(feed);
  useEffect(() => {
    const fn = (next: LiveFeed) => setF(next);
    subs.add(fn);
    setF(feed);
    if (!timer) {
      void pull();
      timer = setInterval(() => void pull(), 30_000);
    }
    return () => {
      subs.delete(fn);
      if (subs.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);
  return f;
}

/** INR per 1 unit of `code`, derived from the USD-base print. */
export function inrPer(f: LiveFeed, code: string): number | null {
  const inr = f.rates["INR"];
  if (!inr) return null;
  if (code === "INR") return 1;
  if (code === "USD") return inr;
  const per = f.rates[code];
  return per && per > 0 ? inr / per : null;
}

/** Session move on a benchmark, percent. */
export function movePct(q: FeedQuote | undefined): number | null {
  if (!q || !q.prevClose) return null;
  return ((q.price - q.prevClose) / q.prevClose) * 100;
}

/** Which real instruments each proof scenario is actually settled against. */
export const SCENARIO_FEED: Record<
  string,
  { ccy: string; symbols: string[]; why: string }
> = {
  bloomberg: {
    ccy: "SGD",
    symbols: ["^GSPC", "^STI"],
    why: "The ₹ ticket funds a Singapore WOS; the corridor prints SGD and the equity reference is SGX, with S&P 500 setting the USD funding session.",
  },
  reuters: {
    ccy: "USD",
    symbols: ["^FTSE", "^NSEI"],
    why: "Screening a Mauritius intermediary on a USD-settled OPI ticket; London sets the screening-vendor session and Nifty the onshore side.",
  },
  rbi: {
    ccy: "USD",
    symbols: ["^NSEI"],
    why: "A FIRMS filing is denominated onshore; Nifty 50 is the domestic reference the AD bank and RBI both read.",
  },
  cleartax: {
    ccy: "USD",
    symbols: ["^GSPC"],
    why: "Section 195 on a USD SaaS invoice — the withholding is computed on the USD amount at the live print.",
  },
  swift: {
    ccy: "USD",
    symbols: ["^GSPC", "^FTSE"],
    why: "A correspondent-chain payment priced in USD, cleared through the New York and London sessions.",
  },
};

/**
 * Observed cross-venue dispersion, mapped onto the 0-100 jurisdiction-risk knob.
 * Calm tape → low reading; a wide session move on the relevant benchmarks lifts
 * the counterparty/jurisdiction risk the incumbent lane has to absorb.
 */
export function riskFromTape(f: LiveFeed, symbols: string[]): number | null {
  const moves = symbols
    .map((s) => movePct(f.quotes[s]))
    .filter((m): m is number => m !== null)
    .map(Math.abs);
  if (!moves.length) return null;
  const avg = moves.reduce((a, b) => a + b, 0) / moves.length;
  return Math.max(5, Math.min(95, Math.round((15 + avg * 28) / 5) * 5));
}
