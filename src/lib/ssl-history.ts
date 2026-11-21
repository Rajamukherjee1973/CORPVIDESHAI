// Persistent record of every SSL probe, kept on this device so the timeline
// survives reloads. Prototype storage: no server database is involved.

export type SslStatus = "live" | "dns" | "fail" | "wait";

export type SslSample = {
  at: number;
  host: string;
  status: SslStatus;
  label: string;
  httpStatus: number | null;
  latencyMs: number | null;
  note: string | null;
};

export type SslEvent = SslSample & {
  /** milliseconds this state was held before it changed (null while current) */
  heldMs: number | null;
  previous: SslStatus | null;
};

const KEY = "corpvidesh.ssl.history.v1";
const EVT = "corpvidesh:ssl-history";
const MAX = 400;
/** A state other than "live" held longer than this counts as a delay. */
export const DELAY_THRESHOLD_MS = 30 * 60 * 1000;

export function loadHistory(): SslSample[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SslSample[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(rows: SslSample[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows.slice(-MAX)));
  } catch {
    /* storage unavailable — the timeline stays in memory for this view */
  }
  window.dispatchEvent(new CustomEvent(EVT));
}

/**
 * Appends a probe result. Only status changes are recorded as new rows; a
 * repeat of the same status refreshes the latest row so the timeline reads as
 * durations rather than a wall of identical polls.
 */
export function recordSample(sample: SslSample) {
  if (typeof window === "undefined") return;
  const rows = loadHistory();
  const lastForHost = [...rows].reverse().find((r) => r.host === sample.host);
  if (lastForHost && lastForHost.status === sample.status) {
    lastForHost.httpStatus = sample.httpStatus;
    lastForHost.latencyMs = sample.latencyMs;
    lastForHost.note = sample.note;
    persist(rows);
    return;
  }
  persist([...rows, sample]);
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVT));
}

/** Turns raw samples into a per-host timeline with how long each state held. */
export function buildTimeline(rows: SslSample[], host: string, now: number): SslEvent[] {
  const forHost = rows.filter((r) => r.host === host).sort((a, b) => a.at - b.at);
  return forHost.map((row, i) => {
    const next = forHost[i + 1];
    return {
      ...row,
      heldMs: next ? next.at - row.at : now - row.at,
      previous: i > 0 ? forHost[i - 1]!.status : null,
    };
  });
}

export function isDelay(evt: SslEvent) {
  return evt.status !== "live" && (evt.heldMs ?? 0) > DELAY_THRESHOLD_MS;
}

export function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function subscribeHistory(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVT, fn);
    window.removeEventListener("storage", fn);
  };
}