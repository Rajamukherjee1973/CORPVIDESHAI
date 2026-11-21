import { describe, expect, it } from "vitest";
import { memoryContext, toolAccess, validateQa } from "@/lib/agents/execution";

describe("server integration boundaries", () => {
  it("never permits official filing or ledger mutation without an integration", () => {
    expect(toolAccess("filing.submit", true).allowed).toBe(false);
    expect(toolAccess("ledger.stamp", true).allowed).toBe(false);
  });
  it("requires a verified identity for private records", () => {
    expect(toolAccess("ledger.read", false).allowed).toBe(false);
    expect(toolAccess("ledger.read", true).allowed).toBe(true);
    expect(toolAccess("unknown", true).allowed).toBe(false);
  });
  it("fails closed on malformed QA and missing filing packets", () => {
    expect(validateQa(null, true).pass).toBe(false);
    expect(validateQa({ pass: true, confidence: 0.9, issues: [] }, false).pass).toBe(false);
    expect(validateQa({ pass: true, confidence: 2, issues: [] }, true).pass).toBe(false);
    expect(validateQa({ pass: true, confidence: 0.9, issues: [] }, true).pass).toBe(true);
  });
  it("only replays completed non-tool outcomes into bounded context", () => {
    const context = memoryContext([
      { agent: "copilot", status: "failed", input_summary: "failed-secret", context_summary: "" },
      { agent: "tool", status: "completed", input_summary: "tool-secret", context_summary: "" },
      { agent: "statutory", status: "completed", input_summary: "ODI", context_summary: "automatic" },
    ]);
    expect(context).toBe("statutory: ODI | automatic");
  });
});