/**
 * Predictive OPI signal engine.
 *
 * Takes the live 24x7 rupee tape (live-streamed anchors + microstructure walk)
 * and the five-year series for the same currency, and turns them into a
 * forward view a treasury head can act on: expected twelve-month rupee move,
 * a p50/p90 band, a suggested hedge ratio, a tranche size against the OPI
 * budget, and one recommended action.
 *
 * The engine is deterministic — same inputs, same call. Nothing here is
 * investment advice; it is a prototype decision surface.
 */

import { COUNTRY_META } from "@/data/currencies";
import { HUBS } from "@/data/hubs";
import { fiveYearSeries } from "@/lib/fx-history";
import type { FxTape } from "@/lib/fx-stream";

export type CurrencyRow = {
  code: string;
  name: string;
  region: "AMER" | "EMEA" | "APAC" | "MENA" | "AFR";
};

/** The 52 currencies the rail quotes against the rupee, 24 hours a day. */
export const RAIL_CURRENCIES: CurrencyRow[] = [
  { code: "USD", name: "US Dollar", region: "AMER" },
  { code: "EUR", name: "Euro", region: "EMEA" },
  { code: "GBP", name: "Pound Sterling", region: "EMEA" },
  { code: "JPY", name: "Japanese Yen", region: "APAC" },
  { code: "CHF", name: "Swiss Franc", region: "EMEA" },
  { code: "SGD", name: "Singapore Dollar", region: "APAC" },
  { code: "HKD", name: "Hong Kong Dollar", region: "APAC" },
  { code: "AUD", name: "Australian Dollar", region: "APAC" },
  { code: "CAD", name: "Canadian Dollar", region: "AMER" },
  { code: "NZD", name: "New Zealand Dollar", region: "APAC" },
  { code: "CNY", name: "Chinese Yuan", region: "APAC" },
  { code: "KRW", name: "Korean Won", region: "APAC" },
  { code: "TWD", name: "Taiwan Dollar", region: "APAC" },
  { code: "THB", name: "Thai Baht", region: "APAC" },
  { code: "MYR", name: "Malaysian Ringgit", region: "APAC" },
  { code: "IDR", name: "Indonesian Rupiah", region: "APAC" },
  { code: "PHP", name: "Philippine Peso", region: "APAC" },
  { code: "VND", name: "Vietnamese Dong", region: "APAC" },
  { code: "LKR", name: "Sri Lankan Rupee", region: "APAC" },
  { code: "BDT", name: "Bangladeshi Taka", region: "APAC" },
  { code: "PKR", name: "Pakistani Rupee", region: "APAC" },
  { code: "SEK", name: "Swedish Krona", region: "EMEA" },
  { code: "NOK", name: "Norwegian Krone", region: "EMEA" },
  { code: "DKK", name: "Danish Krone", region: "EMEA" },
  { code: "PLN", name: "Polish Zloty", region: "EMEA" },
  { code: "CZK", name: "Czech Koruna", region: "EMEA" },
  { code: "HUF", name: "Hungarian Forint", region: "EMEA" },
  { code: "RON", name: "Romanian Leu", region: "EMEA" },
  { code: "TRY", name: "Turkish Lira", region: "EMEA" },
  { code: "KZT", name: "Kazakhstani Tenge", region: "EMEA" },
  { code: "AED", name: "UAE Dirham", region: "MENA" },
  { code: "SAR", name: "Saudi Riyal", region: "MENA" },
  { code: "QAR", name: "Qatari Riyal", region: "MENA" },
  { code: "BHD", name: "Bahraini Dinar", region: "MENA" },
  { code: "OMR", name: "Omani Rial", region: "MENA" },
  { code: "KWD", name: "Kuwaiti Dinar", region: "MENA" },
  { code: "JOD", name: "Jordanian Dinar", region: "MENA" },
  { code: "ILS", name: "Israeli Shekel", region: "MENA" },
  { code: "EGP", name: "Egyptian Pound", region: "MENA" },
  { code: "MAD", name: "Moroccan Dirham", region: "AFR" },
  { code: "ZAR", name: "South African Rand", region: "AFR" },
  { code: "NGN", name: "Nigerian Naira", region: "AFR" },
  { code: "KES", name: "Kenyan Shilling", region: "AFR" },
  { code: "GHS", name: "Ghanaian Cedi", region: "AFR" },
  { code: "TZS", name: "Tanzanian Shilling", region: "AFR" },
  { code: "MUR", name: "Mauritian Rupee", region: "AFR" },
  { code: "BRL", name: "Brazilian Real", region: "AMER" },
  { code: "MXN", name: "Mexican Peso", region: "AMER" },
  { code: "CLP", name: "Chilean Peso", region: "AMER" },
  { code: "COP", name: "Colombian Peso", region: "AMER" },
  { code: "PEN", name: "Peruvian Sol", region: "AMER" },
  { code: "ARS", name: "Argentine Peso", region: "AMER" },
];

export type OpiVerdict = "Accumulate" | "Phase in" | "Hold" | "Defer";

export type OpiSignal = {
  code: string;
  name: string;
  region: CurrencyRow["region"];
  /** INR per unit, live. */
  spot: number | null;
  /** Tick direction against the previous print. */
  tick: 1 | 0 | -1;
  /** Session move against the anchor print, percent. */
  sessionPct: number;
  /** Five-year rupee move, percent. */
  fiveYearPct: number;
  cagrPct: number;
  volPct: number;
  /** Expected twelve-month rupee move in this pair, percent (p50). */
  p50Pct: number;
  /** Adverse twelve-month case, percent. */
  p90Pct: number;
  /** 0-100 conviction. */
  score: number;
  confidence: number;
  verdict: OpiVerdict;
  /** Suggested share of the OPI budget, percent. */
  allocationPct: number;
  /** Suggested hedge ratio on the tranche, percent. */
  hedgePct: number;
  /** Hub that settles this currency, when the rail has one. */
  hub: string | null;
  opiEligible: boolean;
  whtNote: string;
  /** One-line reason a treasury head can repeat in a board note. */
  driver: string;
  action: string;
};

function hubFor(code: string): { hub: string; route: string; wht: string } | null {
  for (const h of HUBS) {
    const meta = COUNTRY_META[h.country];
    if (meta && meta.currency === code) return { hub: h.city, route: h.route, wht: h.wht };
  }
  return null;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function opiSignal(tape: FxTape, row: CurrencyRow): OpiSignal {
  const spot = tape.inrPer[row.code] ?? null;
  const prev = tape.prev[row.code] ?? spot;
  const tick: 1 | 0 | -1 = spot == null || prev == null || spot === prev ? 0 : spot > prev ? 1 : -1;

  const series = fiveYearSeries(row.code, spot ?? 1);
  const sessionPct = spot && prev ? ((spot - prev) / prev) * 100 : 0;

  // Twelve-month central case: structural drift, nudged by live momentum.
  const p50 = series.cagrPct + clamp(sessionPct * 8, -1.5, 1.5);
  // Adverse case: one standard deviation against the position.
  const p90 = p50 - series.volPct;

  // Conviction: reward carry-adjusted drift, punish volatility.
  const raw = p50 * 6 - series.volPct * 2.2;
  const score = Math.round(clamp(50 + raw, 2, 98));
  const confidence = Math.round(clamp(88 - series.volPct * 1.8, 46, 93));

  const h = hubFor(row.code);
  const opiEligible = h ? h.route.includes("OPI") : false;

  let verdict: OpiVerdict =
    score >= 70 ? "Accumulate" : score >= 55 ? "Phase in" : score >= 40 ? "Hold" : "Defer";
  if (!opiEligible && verdict === "Accumulate") verdict = "Phase in";

  const allocationPct = Math.round(
    clamp((score - 38) / 3.1, 0, 18) * (opiEligible ? 1 : 0.4),
  );
  const hedgePct = Math.round(clamp(series.volPct * 3.4, 15, 85) / 5) * 5;

  const driver =
    p50 >= 2.5
      ? `Rupee has depreciated ${series.cagrPct.toFixed(1)}% a year against the ${row.code} over five years — an unhedged holding gained on translation alone.`
      : p50 >= 0
        ? `Flat-to-mild drift of ${series.cagrPct.toFixed(1)}% a year; the return has to come from the asset, not the currency.`
        : `The ${row.code} has lost ground to the rupee (${series.cagrPct.toFixed(1)}% a year) — translation works against a rupee-reporting balance sheet.`;

  const action = !opiEligible
    ? `Not an OPI corridor on the rail today — route as ODI or pick the ${h?.hub ?? "nearest"} alternative.`
    : verdict === "Accumulate"
      ? `Release the next OPI tranche at ${allocationPct}% of budget into ${h?.hub}; hedge ${hedgePct}% and file Rule 7 headroom before the window closes.`
      : verdict === "Phase in"
        ? `Split the ${allocationPct}% allocation across three monthly tranches into ${h?.hub}; hedge ${hedgePct}%.`
        : verdict === "Hold"
          ? `Hold existing exposure, do not add; revisit if the twelve-month drift crosses +2%.`
          : `Defer new exposure — the adverse case is ${p90.toFixed(1)}% and volatility is ${series.volPct.toFixed(1)}%.`;

  return {
    code: row.code,
    name: row.name,
    region: row.region,
    spot,
    tick,
    sessionPct,
    fiveYearPct: series.changePct,
    cagrPct: series.cagrPct,
    volPct: series.volPct,
    p50Pct: p50,
    p90Pct: p90,
    score,
    confidence,
    verdict,
    allocationPct,
    hedgePct,
    hub: h?.hub ?? null,
    opiEligible,
    whtNote: h?.wht ?? "—",
    driver,
    action,
  };
}

export function opiBoard(tape: FxTape): OpiSignal[] {
  return RAIL_CURRENCIES.map((r) => opiSignal(tape, r));
}

/** Portfolio view across the board for a given OPI budget, in ₹ crore. */
export function opiPortfolio(signals: OpiSignal[], budgetCr: number) {
  const picks = signals
    .filter((s) => s.opiEligible && s.allocationPct > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const total = picks.reduce((a, s) => a + s.allocationPct, 0) || 1;
  const rows = picks.map((s) => {
    const cr = (s.allocationPct / total) * budgetCr;
    return {
      ...s,
      tranche: cr,
      expected: (cr * s.p50Pct) / 100,
      adverse: (cr * s.p90Pct) / 100,
    };
  });
  return {
    rows,
    expected: rows.reduce((a, r) => a + r.expected, 0),
    adverse: rows.reduce((a, r) => a + r.adverse, 0),
    hedge: rows.length
      ? Math.round(rows.reduce((a, r) => a + r.hedgePct * r.tranche, 0) / (budgetCr || 1))
      : 0,
  };
}

export function opiCsv(signals: OpiSignal[]): string {
  const head = [
    "currency", "name", "region", "inr_per_unit", "session_pct", "five_year_pct",
    "cagr_pct", "vol_pct", "p50_12m_pct", "p90_12m_pct", "score", "confidence",
    "verdict", "allocation_pct", "hedge_pct", "hub", "opi_eligible", "action",
  ].join(",");
  const body = signals.map((s) =>
    [
      s.code, `"${s.name}"`, s.region, s.spot?.toFixed(4) ?? "", s.sessionPct.toFixed(3),
      s.fiveYearPct.toFixed(2), s.cagrPct.toFixed(2), s.volPct.toFixed(2), s.p50Pct.toFixed(2),
      s.p90Pct.toFixed(2), s.score, s.confidence, s.verdict, s.allocationPct, s.hedgePct,
      `"${s.hub ?? ""}"`, s.opiEligible ? "yes" : "no", `"${s.action.replace(/"/g, "'")}"`,
    ].join(","),
  );
  return [head, ...body].join("\n");
}
