/**
 * Scenario assumption model for the Proof Desk.
 *
 * Each proof scenario has a baseline (as-demonstrated) incumbent duration and
 * rail duration. The knobs below re-price both lanes so a viewer can change the
 * assumptions of the case — ticket size, route, document readiness, counterparty
 * risk, calendar friction — and watch the workflow difference move.
 *
 * Multipliers are capability statements about where work accumulates on each
 * rail, not market forecasts.
 */

export type Assumptions = {
  /** Ticket size in INR crore. */
  ticket: number;
  /** Documentation readiness at intake, 0-100. */
  readiness: number;
  /** Counterparty / jurisdiction risk, 0-100. */
  risk: number;
  /** Approval route instead of Automatic. */
  approvalRoute: boolean;
  /** Section 195 withholding question is live on the file. */
  s195: boolean;
  /** First-time filer — no prior UIN on record. */
  firstTime: boolean;
  /** Quarter-end / festive calendar friction. */
  calendar: boolean;
  /** All six regulators attached to the ledger in parallel. */
  quorumLive: boolean;
};

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  ticket: 475,
  readiness: 70,
  risk: 35,
  approvalRoute: false,
  s195: true,
  firstTime: false,
  calendar: false,
  quorumLive: true,
};

type Base = { rivalDays: number; railSeconds: number; rivalTouches: number; railTouches: number };

/** Baseline durations behind the as-demonstrated totals on each scenario. */
export const BASELINE: Record<string, Base> = {
  bloomberg: { rivalDays: 26, railSeconds: 552, rivalTouches: 11, railTouches: 2 },
  reuters: { rivalDays: 17, railSeconds: 424, rivalTouches: 8, railTouches: 2 },
  rbi: { rivalDays: 28, railSeconds: 552, rivalTouches: 14, railTouches: 2 },
  cleartax: { rivalDays: 11, railSeconds: 278, rivalTouches: 7, railTouches: 1 },
  swift: { rivalDays: 24, railSeconds: 552, rivalTouches: 12, railTouches: 2 },
};

export type Factor = {
  label: string;
  /** Human-readable effect on the incumbent lane. */
  rival: string;
  /** Human-readable effect on the rail. */
  rail: string;
  /** True when the knob is currently moving the model. */
  live: boolean;
};

export type Modelled = {
  rivalDays: number;
  railSeconds: number;
  rivalTouches: number;
  railTouches: number;
  rivalLabel: string;
  railLabel: string;
  speedup: number;
  factors: Factor[];
};

function fmtDays(d: number): string {
  if (d < 1) return `${Math.round(d * 8)} h`;
  return `${d.toFixed(d < 10 ? 1 : 0)} days`;
}

export function fmtSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m ? `${m} min ${String(r).padStart(2, "0")} s` : `${r} s`;
}

/** Re-price both lanes under the current assumptions. */
export function model(key: string, a: Assumptions): Modelled {
  const b = BASELINE[key] ?? BASELINE["bloomberg"]!;

  let days = b.rivalDays;
  let secs = b.railSeconds;
  let rt = b.rivalTouches;
  let ct = b.railTouches;
  const factors: Factor[] = [];

  // Ticket size: incumbent escalates through committees; the rail re-reads a number.
  const sizeMul = 0.82 + Math.min(a.ticket, 5000) / 2600;
  days *= sizeMul;
  secs *= 1 + Math.min(a.ticket, 5000) / 26000;
  factors.push({
    label: `Ticket ₹${a.ticket.toLocaleString("en-IN")} cr`,
    rival: `×${sizeMul.toFixed(2)} — larger tickets escalate through more committees and a second legal opinion.`,
    rail: "Ceiling and headroom are the same computation at any size; only the proof time moves.",
    live: a.ticket !== DEFAULT_ASSUMPTIONS.ticket,
  });

  // Document readiness: the dominant driver of incumbent elapsed time.
  const gap = (100 - a.readiness) / 100;
  days *= 0.7 + gap * 1.1;
  secs *= 1 + gap * 0.25;
  rt += Math.round(gap * 5);
  factors.push({
    label: `Documents ${a.readiness}% ready at intake`,
    rival: `Chasing TRC, 10F, board resolutions and valuation reports by email is the single largest block of elapsed days.`,
    rail: "Missing artefacts are flagged at intake with the provision that requires them; nothing waits in an inbox.",
    live: a.readiness !== DEFAULT_ASSUMPTIONS.readiness,
  });

  // Counterparty / jurisdiction risk.
  const riskMul = 1 + (a.risk / 100) * 0.75;
  days *= riskMul;
  secs *= 1 + (a.risk / 100) * 0.35;
  factors.push({
    label: `Counterparty risk ${a.risk}/100`,
    rival: `×${riskMul.toFixed(2)} — adverse-media hits trigger a manual EDD cycle outside the filing.`,
    rail: "Screening result attaches to the same record FIU-IND already reads; no separate cycle.",
    live: a.risk !== DEFAULT_ASSUMPTIONS.risk,
  });

  if (a.approvalRoute) {
    days += 21;
    secs += 190;
    rt += 4;
    ct += 1;
    factors.push({
      label: "Approval route",
      rival: "+21 days — RBI Overseas Investment Division sanction sought by physical annexure pack.",
      rail: "+3 min 10 s — sanction leg added to the quorum with the justification already keyed.",
      live: true,
    });
  }
  if (a.s195) {
    days += 5;
    secs += 88;
    rt += 2;
    factors.push({
      label: "Section 195 live",
      rival: "+5 days — chargeability, DTAA article and 15CB signed by a separate professional.",
      rail: "+1 min 28 s — Royalty/FTS branch walked from the facts already on the file.",
      live: true,
    });
  }
  if (a.firstTime) {
    days += 6;
    secs += 42;
    rt += 3;
    factors.push({
      label: "First-time filer (no UIN)",
      rival: "+6 days — AD bank re-verifies the entity from scratch and opens a fresh file.",
      rail: "+42 s — UIN requested inside the same dossier the AD bank is already signing.",
      live: true,
    });
  }
  if (a.calendar) {
    days *= 1.35;
    factors.push({
      label: "Quarter-end / festive calendar",
      rival: "×1.35 — desks queue behind closing and holidays.",
      rail: "No effect — the rail has no queue to join.",
      live: true,
    });
  }
  if (!a.quorumLive) {
    secs *= 3.4;
    ct += 3;
    factors.push({
      label: "Regulator quorum offline",
      rival: "No effect — the incumbent path never had a live quorum.",
      rail: "×3.4 — checks fall back to serial officer review; this is the rail's own worst case.",
      live: true,
    });
  }

  const railSeconds = Math.round(secs);
  const rivalDays = Math.round(days * 10) / 10;
  return {
    rivalDays,
    railSeconds,
    rivalTouches: rt,
    railTouches: ct,
    rivalLabel: fmtDays(rivalDays),
    railLabel: fmtSeconds(railSeconds),
    speedup: Math.round((rivalDays * 8 * 3600) / Math.max(railSeconds, 1)),
    factors,
  };
}
