import { z } from "zod";

export const AgentKind = z.enum(["statutory", "copilot", "document", "currency", "tool"]);
export const ToolInput = z.object({
  name: z.enum(["fx.rate", "market.quote", "statute.search", "ledger.read", "ledger.stamp", "filing.submit"]),
  query: z.string().max(600).default(""),
  code: z.string().regex(/^[A-Z]{3}$/).default("USD"),
  symbol: z.string().max(40).default("^NSEI"),
});

export function toolAccess(name: string, verified: boolean) {
  if (name === "filing.submit" || name === "ledger.stamp") {
    return { allowed: false, reason: "External filing and ledger mutation are not connected. No official submission or approval was made." };
  }
  if (name === "ledger.read" && !verified) {
    return { allowed: false, reason: "A verified signed-in identity is required to read private agent records. A demonstration role grants no access." };
  }
  const allowed = ["fx.rate", "market.quote", "statute.search", "ledger.read"].includes(name);
  return { allowed, reason: allowed ? "Read-only server function permitted." : "Unknown tool refused." };
}

const Qa = z.object({ pass: z.boolean(), confidence: z.number(), issues: z.array(z.string()) });
export function validateQa(raw: unknown, hasDraft: boolean) {
  const parsed = Qa.safeParse(raw);
  if (!parsed.success || !hasDraft || parsed.data.confidence < 0 || parsed.data.confidence > 1) {
    return { pass: false, confidence: 0, issues: ["Quality response or filing packet is invalid; human review required."] };
  }
  return parsed.data;
}

export function memoryContext(rows: { agent: string; status: string; input_summary: string; context_summary: string }[]) {
  return rows.filter((r) => r.status === "completed" && r.agent !== "tool")
    .slice(0, 3).map((r) => `${r.agent}: ${r.input_summary.slice(0, 200)} | ${r.context_summary.slice(0, 400)}`)
    .join("\n").slice(0, 1400);
}