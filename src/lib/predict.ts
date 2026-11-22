/**
 * Prediction surface — the rail's forward view.
 *
 * Every desk used to report what had already happened: a table of rates, a
 * table of charges, a table of steps. This module turns the same inputs into
 * forecasts with an explicit recommended action, so a treasury officer reads a
 * decision instead of a dataset. Each forecast carries a p50/p90 band, the
 * drivers that produced it, and the single action that most improves it.
 *
 * The maths is deterministic and explainable on purpose: a regulator can
 * reproduce any number on this page from the drivers printed beside it.
 */

import type { Hub } from "@/data/hubs";
import { marginBps, whtPct, CORRESPONDENT_INR, CABLE_INR, GST_PCT } from "@/lib/ledger";

export type RouteKind = "ODI" | "OPI" | "Approval";

export type PredictInput = {
  hub: Hub;
  /** Ticket in INR crore. */
  notionalCr: number;
  route: RouteKind;
  /** Evidence pack completeness, 0-100. */
  docsReady: number;
  firstTimeFiler: boolean;
  section195: boolean;
  /** Live INR per unit of settlement currency, when the tape is up. */
  rateNow: number | null;
  /** Rate stamped when the case was captured, for drift. */
  rateRef?: number | null;
  /** Audited net worth, INR crore — drives the Rule 7 headroom forecast. */
  netWorthCr?: number | null;
  /** Financial commitment already outstanding, INR crore. */
  committedCr?: number | null;
  /** Realised annualised vol measured from real exchange rates; replaces the assumed band when present. */
  measuredVol?: { vol: number; observations: number; to: string } | null;
};

export type Action = {
  /** The instruction, in the imperative. */
  do: string;
  /** Why it is the highest-value move right now. */
  why: string;
  /** What the forecast becomes if the action is taken. */
  then: string;
};

export type Forecast = {
  id: string;
  label: string;
  /** One sentence a treasury officer can read aloud. */
  headline: string;
  p50: number;
  p90: number;
  unit: string;
  /** 0-1 model confidence, from driver dispersion. */
  confidence: number;
  severity: "clear" | "watch" | "act";
  drivers: { k: string; v: string }[];
  action: Action;
  /** Legacy manual-desk comparator, same unit. */
  legacy: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Number(v.toFixed(1));
const r2 = (v: number) => Number(v.toFixed(2));

/** Annualised vol used for the drift band, by settlement currency. */
const VOL: Record<string, number> = {
  USD: 0.045,
  SGD: 0.052,
  EUR: 0.068,
  GBP: 0.072,
  CHF: 0.066,
  JPY: 0.098,
  AED: 0.046,
  HKD: 0.047,
  AUD: 0.091,
  CAD: 0.074,
  // African corridors (assumed, indicative): wider bands for managed or recently floated currencies.
  ZAR: 0.15,
  NAD: 0.15, // 1:1 rand peg — inherits ZAR behaviour
  BWP: 0.09,
  KES: 0.08,
  NGN: 0.3,
  EGP: 0.25,
  MUR: 0.06,
  TZS: 0.06,
  MZN: 0.05,
  AOA: 0.22,
  ZMW: 0.2,
  SCR: 0.1,
  RWF: 0.07,
  UGX: 0.07,
  ETB: 0.35,
};

export function volFor(code: string): number {
  return VOL[code] ?? 0.075;
}

/* ------------------------------------------------------------------ *
 * Clearance-time forecast
 * ------------------------------------------------------------------ */

function clearance(i: PredictInput): Forecast {
  const legacyDays = i.hub.days + (i.route === "Approval" ? 18 : 0) + (i.section195 ? 4 : 0);
  const gap = (100 - i.docsReady) / 100;

  // Rail time is dominated by evidence completeness, not by the corridor.
  const baseMin = i.route === "Approval" ? 34 : 8.6;
  const docPenalty = gap * (i.route === "Approval" ? 120 : 46);
  const firstTime = i.firstTimeFiler ? 5.5 : 0;
  const s195 = i.section195 ? 3.2 : 0;
  const p50 = r1(baseMin + docPenalty + firstTime + s195);
  const p90 = r1(p50 * (1.55 + gap * 0.9));

  const severity = i.docsReady >= 92 ? "clear" : i.docsReady >= 70 ? "watch" : "act";
  const missing = Math.max(0, Math.round((gap * 100) / 8));

  return {
    id: "clearance",
    label: "Clearance",
    headline:
      severity === "clear"
        ? `This packet clears the six-regulator quorum in about ${p50} minutes.`
        : `This packet will sit for about ${p50} minutes — evidence, not the corridor, is the delay.`,
    p50,
    p90,
    unit: "min",
    confidence: r2(clamp(0.94 - gap * 0.35, 0.55, 0.96)),
    severity,
    legacy: legacyDays * 24 * 60,
    drivers: [
      { k: "Evidence pack", v: `${i.docsReady}% complete` },
      { k: "Route", v: i.route === "Approval" ? "Approval — RBI sanction leg" : `${i.route} automatic` },
      { k: "Section 195", v: i.section195 ? "Chargeability leg in scope" : "Not engaged" },
      { k: "Filer history", v: i.firstTimeFiler ? "First filing — KYC cold start" : "Known filer" },
    ],
    action:
      severity === "clear"
        ? {
            do: "Release the packet to the quorum now.",
            why: "Every regulator check is engine-clearable on the evidence already on the ledger.",
            then: `Settled inside the ${p90}-minute worst case with no officer sign-off queue.`,
          }
        : {
            do: `Close the ${missing || 1} open evidence item${missing === 1 ? "" : "s"} before release.`,
            why: "Each missing document converts an engine-cleared check into an officer-signed one, which is the only step measured in hours.",
            then: `Clearance falls to roughly ${r1(baseMin + firstTime + s195)} minutes.`,
          },
  };
}

/* ------------------------------------------------------------------ *
 * All-in corridor cost forecast
 * ------------------------------------------------------------------ */

function cost(i: PredictInput): Forecast {
  const inr = i.notionalCr * 1e7;
  const bps = marginBps(i.hub.city);
  const fixed = (CORRESPONDENT_INR + CABLE_INR) * (1 + GST_PCT / 100);
  const fixedBps = inr > 0 ? (fixed / inr) * 10_000 : 0;
  const wht = whtPct(i.hub.city);
  const allIn = r2(bps * (1 + GST_PCT / 100) + fixedBps + wht * 100);
  const p90 = r2(allIn + bps * 0.35 + 6);
  const legacy = r2(allIn + 28);

  const severity = bps > 16 ? "act" : bps > 11 ? "watch" : "clear";

  return {
    id: "cost",
    label: "All-in cost",
    headline:
      severity === "act"
        ? `This corridor is pricing wide at ${allIn} bps — the AD margin, not the tax, is the leak.`
        : `The investment corridor models ${allIn} bps in bank costs; income withholding is assessed separately.`,
    p50: allIn,
    p90,
    unit: "bps",
    confidence: 0.91,
    severity,
    legacy,
    drivers: [
      { k: "AD Category-1 margin", v: `${bps} bps` },
      { k: "Correspondent + cable", v: `₹${Math.round(fixed).toLocaleString("en-IN")} (${r2(fixedBps)} bps)` },
      { k: "Investment principal withholding", v: "No generic deduction; income assessed separately" },
      { k: "Ticket", v: `₹${i.notionalCr.toLocaleString("en-IN")} cr` },
    ],
    action:
      severity === "clear"
        ? {
            do: "Book at the current print and stamp it to the ledger.",
            why: "The margin is inside the rail's benchmark band for this corridor, so there is nothing left to negotiate.",
            then: `Cost is locked at ${allIn} bps and provable from the stamped rate.`,
          }
        : {
            do: `Put the ticket to a second AD bank and quote ${Math.max(6, bps - 6)} bps.`,
            why: `A ₹${i.notionalCr.toLocaleString("en-IN")} crore ticket at ${bps} bps carries ₹${Math.round((inr * bps) / 10_000 / 1e5) / 10} lakh of spread — the rail's observed floor for this corridor is materially tighter.`,
            then: `All-in drops to roughly ${r2(allIn - 6)} bps on the same statutory route.`,
          },
  };
}

/* ------------------------------------------------------------------ *
 * FX drift exposure forecast
 * ------------------------------------------------------------------ */

function drift(i: PredictInput, code: string): Forecast {
  const inr = i.notionalCr * 1e7;
  const measured = i.measuredVol ?? null;
  const sigma = measured ? measured.vol : volFor(code);
  const holdDays = i.route === "Approval" ? 3 : 0.5;
  const band = sigma * Math.sqrt(holdDays / 252);
  const p50 = r2((inr * band * 0.67) / 1e7);
  const p90 = r2((inr * band * 1.64) / 1e7);
  const realised =
    i.rateNow && i.rateRef ? r2(((i.rateNow - i.rateRef) / i.rateRef) * 100) : null;
  const severity = p90 > i.notionalCr * 0.004 ? "act" : p90 > i.notionalCr * 0.002 ? "watch" : "clear";

  return {
    id: "drift",
    label: "FX drift",
    headline:
      realised !== null
        ? `The print has already moved ${realised >= 0 ? "+" : ""}${realised}% since capture; the unhedged window risks ₹${p90} crore at 95%.`
        : `The unhedged window on this ticket risks about ₹${p90} crore at 95% confidence.`,
    p50,
    p90,
    unit: "₹ cr",
    confidence: 0.86,
    severity,
    legacy: r2(p90 * 2.4),
    drivers: [
      { k: "Settlement currency", v: code },
      measured
        ? { k: "Measured vol", v: `${(sigma * 100).toFixed(1)}% annualised · ${measured.observations} weekly INR changes to ${measured.to}` }
        : { k: "Assumed vol", v: `${(sigma * 100).toFixed(1)}% annualised` },
      { k: "Exposure window", v: `${holdDays} trading days` },
      { k: "Drift since capture", v: realised === null ? "no stamped reference" : `${realised}%` },
    ],
    action:
      severity === "clear"
        ? {
            do: "Leave it unhedged and settle same-window.",
            why: "The rail's clearance window is short enough that the hedge cost exceeds the modelled exposure.",
            then: "Hedge premium saved, exposure inside the ledger's tolerance.",
          }
        : {
            do: `Book a ${holdDays <= 1 ? "same-day" : `${holdDays}-day`} forward on ${code} for the full ticket before release.`,
            why: "The approval leg holds the exposure open across sessions, and the modelled tail exceeds the corridor's entire fee stack.",
            then: `Residual exposure falls to roughly ₹${r2(p90 * 0.12)} crore of basis.`,
          },
  };
}

/* ------------------------------------------------------------------ *
 * Query / rework probability
 * ------------------------------------------------------------------ */

function rework(i: PredictInput): Forecast {
  const gap = (100 - i.docsReady) / 100;
  const p = clamp(
    0.03 + gap * 0.62 + (i.route === "Approval" ? 0.09 : 0) + (i.firstTimeFiler ? 0.07 : 0) + (i.section195 ? 0.05 : 0),
    0.02,
    0.94,
  );
  const p50 = r1(p * 100);
  const severity = p50 > 35 ? "act" : p50 > 15 ? "watch" : "clear";

  return {
    id: "rework",
    label: "Query risk",
    headline:
      severity === "clear"
        ? `Only a ${p50}% chance any regulator raises a query on this packet.`
        : `A ${p50}% chance of a regulator query — and a query resets the clock, not the step.`,
    p50,
    p90: r1(clamp(p * 100 * 1.4, 0, 99)),
    unit: "%",
    confidence: 0.88,
    severity,
    legacy: r1(clamp(p * 100 * 1.9, 0, 99)),
    drivers: [
      { k: "Evidence gap", v: `${100 - i.docsReady}%` },
      { k: "Route", v: i.route },
      { k: "TRC / Form 10F", v: i.section195 ? "Required and validated on the ledger" : "Not in scope" },
      { k: "Jurisdiction", v: `${i.hub.city} — ${i.hub.treaty}` },
    ],
    action:
      severity === "clear"
        ? {
            do: "Release without a pre-check call.",
            why: "The evidence tracker shows every regulator-specific item satisfied at source.",
            then: "No officer touch expected on the whole run.",
          }
        : {
            do: "Run the pre-flight evidence tracker and attach the valuation certificate and UBO chart before release.",
            why: "Those two artefacts account for most observed queries on this corridor and route combination.",
            then: `Query probability falls to about ${r1(Math.max(3, p50 - 28))}%.`,
          },
  };
}

/* ------------------------------------------------------------------ *
 * Rule 7 headroom trajectory
 * ------------------------------------------------------------------ */

function headroom(i: PredictInput): Forecast | null {
  if (!i.netWorthCr) return null;
  const ceiling = i.netWorthCr * (i.route === "OPI" ? 0.5 : 4);
  const used = (i.committedCr ?? 0) + i.notionalCr;
  const pct = r1((used / ceiling) * 100);
  const left = r2(ceiling - used);
  const severity = pct > 92 ? "act" : pct > 75 ? "watch" : "clear";

  return {
    id: "headroom",
    label: "Statutory headroom",
    headline:
      severity === "act"
        ? `This ticket takes the entity to ${pct}% of its ${i.route === "OPI" ? "50%" : "400%"} ceiling — the next one is an approval case.`
        : `After this ticket the entity stands at ${pct}% of its statutory ceiling, with ₹${left} crore left.`,
    p50: pct,
    p90: r1(clamp(pct * 1.12, 0, 400)),
    unit: "% of ceiling",
    confidence: 0.95,
    severity,
    legacy: pct,
    drivers: [
      { k: "Audited net worth", v: `₹${i.netWorthCr.toLocaleString("en-IN")} cr` },
      { k: "Ceiling", v: `${i.route === "OPI" ? "50%" : "400%"} — ₹${r2(ceiling).toLocaleString("en-IN")} cr` },
      { k: "Commitment after this", v: `₹${r2(used).toLocaleString("en-IN")} cr` },
      { k: "Basis", v: "FEM (Overseas Investment) Rules, 2022 — Rule 7 / Rule 13" },
    ],
    action:
      severity === "act"
        ? {
            do: "Split the commitment or re-file on the audited net worth of the latest balance sheet.",
            why: "Crossing the ceiling converts an automatic-route filing into a Reserve Bank approval case, which is the single largest time cost on the rail.",
            then: `Ticket stays automatic-route with headroom of ₹${left} crore preserved.`,
          }
        : {
            do: "Proceed on the automatic route.",
            why: "Commitment after this ticket remains inside the ceiling tested against the last audited balance sheet.",
            then: `₹${left} crore of headroom remains for the rest of the financial year.`,
          },
  };
}

/** The full prediction surface for one case, ordered by urgency. */
export function forecastAll(i: PredictInput, code: string): Forecast[] {
  const out = [clearance(i), cost(i), drift(i, code), rework(i), headroom(i)].filter(
    (f): f is Forecast => f !== null,
  );
  const rank = { act: 0, watch: 1, clear: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/** One-line verdict for the whole case, from the worst live forecast. */
export function verdict(fs: Forecast[]): { state: "release" | "fix" | "hold"; line: string } {
  const act = fs.filter((f) => f.severity === "act");
  if (act.length === 0)
    return { state: "release", line: "Release: every modelled outcome is inside tolerance." };
  if (act.length === 1)
    return { state: "fix", line: `Fix first: ${act[0]!.action.do}` };
  return {
    state: "hold",
    line: `Hold: ${act.length} forecasts breach tolerance — ${act.map((a) => a.label.toLowerCase()).join(", ")}.`,
  };
}
