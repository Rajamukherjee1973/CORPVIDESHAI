import { describe, expect, it } from "vitest";
import { summariseRuns, type AgentRun } from "@/lib/agent-session";

describe("agent session impact figures", () => {
  it("reports zeros before any run instead of invented numbers", () => {
    expect(summariseRuns([])).toEqual({ runs: 0, avgMs: 0, passRate: 0, agentsUsed: 0 });
  });
  it("averages real runs, counts failures and distinct agents", () => {
    const r: AgentRun[] = [
      { agent: "graph", ms: 30000, ok: true, at: 1 },
      { agent: "copilot", ms: 10000, ok: false, at: 2 },
      { agent: "graph", ms: 20000, ok: true, at: 3 },
      { agent: "tools", ms: 0, ok: true, at: 4 },
    ];
    expect(summariseRuns(r)).toEqual({ runs: 4, avgMs: 15000, passRate: 75, agentsUsed: 3 });
  });
});
