// Live performance telemetry for the 3D breach theatre.
// Pure functions: the same parameters always produce the same numbers, so a
// saved preset reproduces an outcome exactly.

import { FED_NODES, THREAT_TOTAL_MS, type Threat } from "@/lib/security";

export type BreachParams = {
  intensity: number;
  density: number;
  quorumPct: number;
  windowSec: number;
  holdSec: number;
};

export const DEFAULT_PARAMS: BreachParams = {
  intensity: 1,
  density: 8,
  quorumPct: 75,
  windowSec: THREAT_TOTAL_MS / 1000,
  holdSec: 1.6,
};

export const REG_LANES = FED_NODES.filter((n) => n.kind === "regulator");

/** Nodes still holding the canonical chain for this threat. */
export function liveNodes(threat: Threat | null, p: BreachParams): number {
  const total = Math.round(p.density);
  return threat?.id === "tamper" ? total - 1 : total;
}

export function quorumNeeded(p: BreachParams): number {
  return Math.ceil((p.quorumPct / 100) * Math.round(p.density));
}

/** Deterministic per-lane processing latency in ms under these parameters. */
export function laneLatencyMs(index: number, p: BreachParams): number {
  const lane = REG_LANES[index];
  const base = (lane?.durationMs ?? 10000) / 24; // rail-time compression
  const load = 0.55 + (quorumNeeded(p) / Math.max(1, Math.round(p.density))) * 0.9;
  return Math.round((base * load) / Math.max(0.2, p.intensity));
}

/** When the mesh reaches quorum on the containment decision, in run ms. */
export function timeToQuorumMs(threat: Threat | null, p: BreachParams): number {
  if (!threat) return 0;
  const contain = threat.steps.find((s) => s.kind === "contain") ?? threat.steps[1] ?? threat.steps[0];
  const spread = quorumNeeded(p) / Math.max(1, Math.round(p.density));
  return Math.round(((contain?.atMs ?? 0) * (0.55 + spread * 0.75)) / Math.max(0.2, p.intensity));
}

/** Containment holds only when enough honest nodes remain to reach quorum. */
export function containmentHolds(threat: Threat | null, p: BreachParams): boolean {
  return liveNodes(threat, p) >= quorumNeeded(p);
}

export type RunRecord = {
  id: string;
  threatId: string;
  threatLabel: string;
  at: number;
  ttqMs: number;
  avgLatencyMs: number;
  contained: boolean;
  params: BreachParams;
};

export function summarise(runs: RunRecord[]) {
  if (runs.length === 0) return { n: 0, rate: 0, ttq: 0, latency: 0 };
  const ok = runs.filter((r) => r.contained).length;
  return {
    n: runs.length,
    rate: (ok / runs.length) * 100,
    ttq: Math.round(runs.reduce((a, r) => a + r.ttqMs, 0) / runs.length),
    latency: Math.round(runs.reduce((a, r) => a + r.avgLatencyMs, 0) / runs.length),
  };
}

/* ---------------- preset persistence ---------------- */

export type Preset = { name: string; params: BreachParams; savedAt: number };
const KEY = "cv.breach.presets.v1";

export function loadPresets(): Preset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as Preset[]) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function savePresets(list: Preset[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — presets stay in-session */
  }
}

/* ---------------- alert thresholds ---------------- */

export type AlertThresholds = {
  /** Per-lane processing latency ceiling, in ms. */
  laneLatencyMs: number;
  /** Time-to-quorum ceiling, in ms. */
  ttqMs: number;
  /** Containment success-rate floor across completed runs, in %. */
  successRatePct: number;
};

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  laneLatencyMs: 420,
  ttqMs: 1600,
  successRatePct: 80,
};

const T_KEY = "cv.breach.thresholds.v1";

export function loadThresholds(): AlertThresholds {
  if (typeof window === "undefined") return DEFAULT_THRESHOLDS;
  try {
    const raw = window.localStorage.getItem(T_KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    return { ...DEFAULT_THRESHOLDS, ...(JSON.parse(raw) as Partial<AlertThresholds>) };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export function saveThresholds(t: AlertThresholds) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(T_KEY, JSON.stringify(t));
  } catch {
    /* storage unavailable */
  }
}

export type Alert = {
  id: string;
  at: number;
  atMs: number;
  severity: "warning" | "critical";
  kind: "lane-latency" | "time-to-quorum" | "success-rate" | "containment";
  scope: string;
  observed: number;
  threshold: number;
  message: string;
};

export type LaneObservation = { id: string; label: string; latency: number; done: boolean };

/**
 * Deviation checks for the live run. Returns every breach of a configured
 * threshold; the caller de-duplicates by `id` so an alert fires once per run.
 */
export function evaluateAlerts(input: {
  runKey: string;
  clockMs: number;
  threatLabel: string;
  lanes: LaneObservation[];
  ttqMs: number;
  ttqReached: boolean;
  contained: boolean;
  successRatePct: number;
  completedRuns: number;
  thresholds: AlertThresholds;
}): Alert[] {
  const { thresholds: th, runKey, clockMs } = input;
  const now = Date.now();
  const out: Alert[] = [];

  for (const lane of input.lanes) {
    if (lane.done && lane.latency > th.laneLatencyMs) {
      out.push({
        id: `${runKey}:lane:${lane.id}`,
        at: now,
        atMs: Math.round(clockMs),
        severity: lane.latency > th.laneLatencyMs * 1.5 ? "critical" : "warning",
        kind: "lane-latency",
        scope: lane.label,
        observed: lane.latency,
        threshold: th.laneLatencyMs,
        message: `${lane.label} took ${lane.latency} ms to clear, above the ${th.laneLatencyMs} ms lane ceiling.`,
      });
    }
  }

  if (input.ttqReached && input.ttqMs > th.ttqMs) {
    out.push({
      id: `${runKey}:ttq`,
      at: now,
      atMs: Math.round(clockMs),
      severity: input.ttqMs > th.ttqMs * 1.5 ? "critical" : "warning",
      kind: "time-to-quorum",
      scope: input.threatLabel,
      observed: input.ttqMs,
      threshold: th.ttqMs,
      message: `Quorum reached at ${input.ttqMs} ms, above the ${th.ttqMs} ms ceiling.`,
    });
  }

  if (!input.contained) {
    out.push({
      id: `${runKey}:containment`,
      at: now,
      atMs: Math.round(clockMs),
      severity: "critical",
      kind: "containment",
      scope: input.threatLabel,
      observed: 0,
      threshold: 1,
      message: `Containment short of quorum on ${input.threatLabel} — the rail would stall rather than commit.`,
    });
  }

  if (input.completedRuns > 0 && input.successRatePct < th.successRatePct) {
    out.push({
      id: `${runKey}:rate:${input.completedRuns}`,
      at: now,
      atMs: Math.round(clockMs),
      severity: input.successRatePct < th.successRatePct * 0.75 ? "critical" : "warning",
      kind: "success-rate",
      scope: `${input.completedRuns} runs`,
      observed: Math.round(input.successRatePct),
      threshold: th.successRatePct,
      message: `Containment success rate ${input.successRatePct.toFixed(0)}% is below the ${th.successRatePct}% floor.`,
    });
  }

  return out;
}

/* ---------------- telemetry export ---------------- */

export type TelemetryExport = {
  generatedAt: string;
  desk: "CorpVidesh AI · breach theatre";
  thresholds: AlertThresholds;
  currentParams: BreachParams;
  summary: ReturnType<typeof summarise>;
  runs: RunRecord[];
  lanes: LaneObservation[];
  alerts: Alert[];
};

export function buildTelemetry(input: {
  thresholds: AlertThresholds;
  params: BreachParams;
  runs: RunRecord[];
  lanes: LaneObservation[];
  alerts: Alert[];
}): TelemetryExport {
  return {
    generatedAt: new Date().toISOString(),
    desk: "CorpVidesh AI · breach theatre",
    thresholds: input.thresholds,
    currentParams: input.params,
    summary: summarise(input.runs),
    runs: input.runs,
    lanes: input.lanes,
    alerts: input.alerts,
  };
}

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function telemetryToCsv(t: TelemetryExport): string {
  const rows: string[][] = [
    ["section", "field_1", "field_2", "field_3", "field_4", "field_5", "field_6", "field_7"],
    ["meta", "generatedAt", t.generatedAt, "desk", t.desk, "", "", ""],
    [
      "thresholds",
      "laneLatencyMs",
      String(t.thresholds.laneLatencyMs),
      "ttqMs",
      String(t.thresholds.ttqMs),
      "successRatePct",
      String(t.thresholds.successRatePct),
      "",
    ],
    [
      "params",
      `intensity=${t.currentParams.intensity}`,
      `density=${t.currentParams.density}`,
      `quorumPct=${t.currentParams.quorumPct}`,
      `windowSec=${t.currentParams.windowSec}`,
      `holdSec=${t.currentParams.holdSec}`,
      "",
      "",
    ],
    [
      "summary",
      `runs=${t.summary.n}`,
      `successRatePct=${t.summary.rate.toFixed(1)}`,
      `meanTtqMs=${t.summary.ttq}`,
      `meanLaneLatencyMs=${t.summary.latency}`,
      "",
      "",
      "",
    ],
    ["runs_header", "at", "attack", "ttqMs", "avgLaneLatencyMs", "contained", "params", ""],
    ...t.runs.map((r) => [
      "run",
      new Date(r.at).toISOString(),
      r.threatLabel,
      String(r.ttqMs),
      String(r.avgLatencyMs),
      r.contained ? "contained" : "quorum-short",
      `${r.params.intensity}x/${r.params.density}n/${r.params.quorumPct}%/${r.params.windowSec}s/${r.params.holdSec}s`,
      "",
    ]),
    ["lanes_header", "lane", "latencyMs", "cleared", "", "", "", ""],
    ...t.lanes.map((l) => ["lane", l.label, String(l.latency), l.done ? "yes" : "no", "", "", "", ""]),
    ["alerts_header", "at", "runClockMs", "severity", "kind", "scope", "observed", "threshold"],
    ...t.alerts.map((a) => [
      "alert",
      new Date(a.at).toISOString(),
      String(a.atMs),
      a.severity,
      a.kind,
      a.scope,
      String(a.observed),
      String(a.threshold),
    ]),
  ];
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}

export function downloadFile(name: string, mime: string, body: string) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
