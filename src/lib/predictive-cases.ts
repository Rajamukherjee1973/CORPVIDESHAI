import { HUBS } from "@/data/hubs";
import { COUNTRY_META } from "@/data/currencies";
import type { PredictiveCase } from "@/data/predictive-cases";
import { forecastAll, verdict, type Forecast } from "@/lib/predict";

export type CaseOverrides = { amountCr?: number; docsReady?: number };

/** Runs one case through the shared forecast engine. No reference rate is stamped, so no realised drift is claimed. */
export function runCase(c: PredictiveCase, rateNow: number | null, o: CaseOverrides = {}) {
  const hub = HUBS.find((h) => h.city === c.hub);
  if (!hub) throw new Error(`Unknown hub ${c.hub}`);
  const code = COUNTRY_META[hub.country]?.currency ?? "USD";
  const forecasts: Forecast[] = forecastAll(
    {
      hub,
      notionalCr: o.amountCr ?? c.amountCr,
      route: c.route,
      docsReady: o.docsReady ?? c.docsReady,
      firstTimeFiler: c.firstTimeFiler,
      section195: c.section195,
      rateNow,
      rateRef: null,
      netWorthCr: c.netWorthCr,
      committedCr: c.committedCr,
    },
    code,
  );
  return { hub, code, forecasts, verdict: verdict(forecasts), decisive: forecasts.find((f) => f.id === c.decisive) ?? null };
}

/** Statutory ceiling for the case's route: 50% of net worth for portfolio, 400% for direct investment. */
export function ceilingCr(c: PredictiveCase): number {
  return c.netWorthCr * (c.route === "OPI" ? 0.5 : 4);
}

/** Largest ticket that keeps cumulative commitment inside the ceiling. */
export function maxTicketCr(c: PredictiveCase): number {
  return Math.max(0, ceilingCr(c) - c.committedCr);
}
