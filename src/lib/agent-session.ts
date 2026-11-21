import { useSyncExternalStore } from "react";

export type AgentId = "graph" | "copilot" | "reader" | "outlook" | "tools";
export type AgentRun = { agent: AgentId; ms: number; ok: boolean; at: number };

/** Browser-session measurements of real agent runs; never persisted and never presented as production metrics. */
let runs: AgentRun[] = [];
const subs = new Set<() => void>();
const EMPTY: AgentRun[] = [];

export function logAgentRun(agent: AgentId, ms: number, ok: boolean) {
  runs = [...runs, { agent, ms: Math.max(0, Math.round(ms)), ok, at: Date.now() }].slice(-200);
  subs.forEach((f) => f());
}

export function useAgentRuns(): AgentRun[] {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => { subs.delete(f); }; },
    () => runs,
    () => EMPTY,
  );
}

export function summariseRuns(list: AgentRun[]) {
  const n = list.length;
  const ok = list.filter((r) => r.ok).length;
  return {
    runs: n,
    avgMs: n ? Math.round(list.reduce((a, r) => a + r.ms, 0) / n) : 0,
    passRate: n ? Math.round((ok / n) * 100) : 0,
    agentsUsed: new Set(list.map((r) => r.agent)).size,
  };
}
