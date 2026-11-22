/**
 * Comparative predictive analytics across every hub — the 52 global hubs and
 * the 10 African SADC/COMESA hubs run through the identical `forecastAll`
 * model with identical case inputs, so differences come only from the
 * corridor (paper-route days, AD margin band, settlement-currency volatility,
 * India's arrangement stack). Pure and deterministic; indicative, not advice.
 */
import type { Hub } from "@/data/hubs";
import { HUBS } from "@/data/hubs";
import { AFRICA_HUBS, BLOC_HUBS_IN_52, type AfricanBloc } from "@/data/africa-hubs";
import { COUNTRY_META } from "@/data/currencies";
import { arrangementDepth, arrangementFor } from "@/data/india-arrangements";
import { forecastAll, verdict, type Forecast, type RouteKind } from "@/lib/predict";

export type HubGroup = "global" | "africa";
export type HubUniverse = "all" | "global" | "africa" | "SADC" | "COMESA";

export const UNIVERSE_LABEL: Record<HubUniverse, string> = {
  all: "All 62",
  global: "Global 52",
  africa: "African 10",
  SADC: "SADC bloc",
  COMESA: "COMESA bloc",
};

export type CompareInput = {
  notionalCr: number;
  route: RouteKind;
  docsReady: number;
  firstTimeFiler: boolean;
  section195: boolean;
  /** Live INR per unit, keyed by currency. Optional: only shown, never scored. */
  inrPer?: Record<string, number>;
};

export type HubCompareRow = {
  hub: Hub;
  group: HubGroup;
  blocs: AfricanBloc[];
  ccy: string;
  rateNow: number | null;
  forecasts: Forecast[];
  verdict: ReturnType<typeof verdict>;
  /** All-in bank cost, bps (cost forecast p50). */
  costBps: number;
  /** 95% FX tail on the unhedged window, ₹ crore. */
  driftP90Cr: number;
  /** The same tail as a share of the ticket, %. */
  driftPct: number;
  railMin: number;
  legacyDays: number;
  queryPct: number;
  depth: number;
  dtaa: "In force" | "Limited" | "None";
  /** 0–100 composite; higher is a better corridor for this case. */
  score: number;
  rank: number;
};

/** Composite weights — printed beside the board so any score is reproducible. */
export const SCORE_WEIGHTS = { depth: 0.3, cost: 0.25, drift: 0.25, days: 0.2 } as const;

const AFRICA_SET = new Set(AFRICA_HUBS.map((h) => h.city));

export function hubGroup(city: string): HubGroup {
  return AFRICA_SET.has(city) ? "africa" : "global";
}

export function hubBlocs(city: string): AfricanBloc[] {
  return (
    AFRICA_HUBS.find((h) => h.city === city)?.blocs ??
    BLOC_HUBS_IN_52.find((h) => h.city === city)?.blocs ??
    []
  );
}

export function hubsIn(universe: HubUniverse): Hub[] {
  const all: Hub[] = [...HUBS, ...AFRICA_HUBS];
  if (universe === "all") return all;
  if (universe === "global") return HUBS;
  if (universe === "africa") return AFRICA_HUBS;
  return all.filter((h) => hubBlocs(h.city).includes(universe));
}

const pick = (fs: Forecast[], id: string) => fs.find((f) => f.id === id);

function norm(v: number, lo: number, hi: number, higherBetter: boolean): number {
  if (hi === lo) return 1;
  const x = (v - lo) / (hi - lo);
  return higherBetter ? x : 1 - x;
}

/** Run the shared forecast model across hubs and rank them on one composite. */
export function compareHubs(hubs: Hub[], i: CompareInput): HubCompareRow[] {
  const base = hubs.map((hub) => {
    const ccy = COUNTRY_META[hub.country]?.currency ?? "USD";
    const rateNow = i.inrPer?.[ccy] ?? null;
    const forecasts = forecastAll(
      { hub, notionalCr: i.notionalCr, route: i.route, docsReady: i.docsReady, firstTimeFiler: i.firstTimeFiler, section195: i.section195, rateNow },
      ccy,
    );
    const a = arrangementFor(hub.country);
    const driftP90Cr = pick(forecasts, "drift")?.p90 ?? 0;
    return {
      hub,
      group: hubGroup(hub.city),
      blocs: hubBlocs(hub.city),
      ccy,
      rateNow,
      forecasts,
      verdict: verdict(forecasts),
      costBps: pick(forecasts, "cost")?.p50 ?? 0,
      driftP90Cr,
      driftPct: i.notionalCr > 0 ? Number(((driftP90Cr / i.notionalCr) * 100).toFixed(3)) : 0,
      railMin: pick(forecasts, "clearance")?.p50 ?? 0,
      legacyDays: hub.days,
      queryPct: pick(forecasts, "rework")?.p50 ?? 0,
      depth: arrangementDepth(a),
      dtaa: a.dtaa,
    };
  });
  if (base.length === 0) return [];
  const span = (k: "depth" | "costBps" | "driftPct" | "legacyDays") => {
    const v = base.map((r) => r[k]);
    return [Math.min(...v), Math.max(...v)] as const;
  };
  const [dLo, dHi] = span("depth");
  const [cLo, cHi] = span("costBps");
  const [fLo, fHi] = span("driftPct");
  const [yLo, yHi] = span("legacyDays");
  const scored = base.map((r) => ({
    ...r,
    score: Math.round(
      100 *
        (SCORE_WEIGHTS.depth * norm(r.depth, dLo, dHi, true) +
          SCORE_WEIGHTS.cost * norm(r.costBps, cLo, cHi, false) +
          SCORE_WEIGHTS.drift * norm(r.driftPct, fLo, fHi, false) +
          SCORE_WEIGHTS.days * norm(r.legacyDays, yLo, yHi, false)),
    ),
  }));
  scored.sort((a, b) => b.score - a.score || a.costBps - b.costBps || a.hub.city.localeCompare(b.hub.city));
  return scored.map((r, idx) => ({ ...r, rank: idx + 1 }));
}

export type GroupSummary = {
  group: HubGroup;
  count: number;
  avgScore: number;
  avgCostBps: number;
  avgDriftPct: number;
  avgDays: number;
  dtaaShare: number;
  best: HubCompareRow | null;
};

export function summariseGroups(rows: HubCompareRow[]): GroupSummary[] {
  return (["global", "africa"] as HubGroup[]).map((group) => {
    const g = rows.filter((r) => r.group === group);
    const avg = (f: (r: HubCompareRow) => number) => (g.length ? g.reduce((s, r) => s + f(r), 0) / g.length : 0);
    return {
      group,
      count: g.length,
      avgScore: Math.round(avg((r) => r.score)),
      avgCostBps: Number(avg((r) => r.costBps).toFixed(1)),
      avgDriftPct: Number(avg((r) => r.driftPct).toFixed(3)),
      avgDays: Number(avg((r) => r.legacyDays).toFixed(1)),
      dtaaShare: g.length ? Math.round((g.filter((r) => r.dtaa === "In force").length / g.length) * 100) : 0,
      best: g[0] ?? null,
    };
  });
}
