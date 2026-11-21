import { memoryContext, toolAccess, validateQa } from "./agents/execution";
import { auditedWork } from "./services/audited-work";

export type ProofCheck = { id: string; name: string; passed: boolean; detail: string };
export async function runPocChecks(): Promise<ProofCheck[]> {
  let workCalls = 0;
  let writes = 0;
  let auditFailureVisible = false;
  try {
    await auditedWork({
      work: async () => { workCalls += 1; return "generated"; },
      summarize: (value) => value,
      accepted: () => true,
      safeError: () => "Work failed",
      persist: async () => { writes += 1; throw new Error("Controlled storage failure"); },
    });
  } catch (error) {
    auditFailureVisible = error instanceof Error && error.message.includes("history could not be saved");
  }
  const context = memoryContext([
    { agent: "tool", status: "completed", input_summary: "excluded-tool", context_summary: "excluded-tool" },
    { agent: "currency", status: "failed", input_summary: "excluded-failure", context_summary: "excluded-failure" },
    ...Array.from({ length: 6 }, (_, i) => ({ agent: "copilot", status: "completed", input_summary: `run${i}:` + "a".repeat(400), context_summary: "b".repeat(800) })),
  ]);
  return [
    { id: "private", name: "Private reads require identity", passed: !toolAccess("ledger.read", false).allowed && toolAccess("ledger.read", true).allowed, detail: "Evaluated the real access policy for anonymous and verified callers. Not a hosted account-isolation test." },
    { id: "mutation", name: "Unconnected actions stay denied", passed: [false, true].every((verified) => ["filing.submit", "ledger.stamp", "unknown"].every((name) => !toolAccess(name, verified).allowed)), detail: "Official filing, ledger mutation and unknown tools are refused, including for verified callers." },
    { id: "qa", name: "Malformed quality output fails closed", passed: !validateQa({ pass: true, confidence: 2, issues: [] }, true).pass && !validateQa("invalid", true).pass, detail: "Invalid confidence and malformed output cannot become accepted evidence." },
    { id: "packet", name: "Missing draft cannot pass quality", passed: !validateQa({ pass: true, confidence: 0.9, issues: [] }, false).pass, detail: "A claimed quality pass without a draft packet is rejected." },
    { id: "memory", name: "Agent context stays bounded", passed: context.length > 0 && context.length <= 1400 && !context.includes("excluded-") && !context.includes("run3:"), detail: "Only the first three completed non-tool outcomes contribute; context is capped at 1,400 characters." },
    { id: "audit", name: "Audit failure never replays work", passed: workCalls === 1 && writes === 1 && auditFailureVisible, detail: "Injected one storage failure: one work call, one write attempt and a visible failure. No network or model call made." },
  ];
}

export function projectPocUsage(runs: number, inputTokens: number, outputTokens: number, inputCreditsPerMillion: number, outputCreditsPerMillion: number) {
  const values = [runs, inputTokens, outputTokens, inputCreditsPerMillion, outputCreditsPerMillion];
  if (values.some((v) => !Number.isFinite(v) || v < 0)) throw new Error("Usage assumptions must be finite and non-negative.");
  return runs * (inputTokens * inputCreditsPerMillion + outputTokens * outputCreditsPerMillion) / 1_000_000;
}

export type TestEvidence = { measuredAt: string; tests: { total: number; passed: number; failed: number }; scope: string };
export function parseTestEvidence(value: unknown): TestEvidence {
  if (!value || typeof value !== "object") throw new Error("Test evidence is malformed.");
  const report = value as Record<string, unknown>;
  const counts = report["tests"] as Record<string, unknown> | undefined;
  if (typeof report["measuredAt"] !== "string" || !Number.isFinite(Date.parse(report["measuredAt"])) || typeof report["scope"] !== "string" || !counts) throw new Error("Test evidence is malformed.");
  const { total, passed, failed } = counts;
  if ([total, passed, failed].some((n) => typeof n !== "number" || !Number.isInteger(n) || n < 0) || typeof total !== "number" || typeof passed !== "number" || typeof failed !== "number" || total === 0 || passed + failed !== total || report["success"] !== (failed === 0)) throw new Error("Test evidence counts are inconsistent.");
  return { measuredAt: report["measuredAt"], scope: report["scope"], tests: { total, passed, failed } };
}