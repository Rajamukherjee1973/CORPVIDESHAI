import { describe, expect, it } from "vitest";
import { parseTestEvidence, projectPocUsage, runPocChecks } from "../lib/poc-evaluation";

describe("Executable PoC safeguards", () => {
  for (const id of ["private", "mutation", "qa", "packet", "memory", "audit"]) {
    it(`passes the real ${id} policy check`, async () => {
      const checks = await runPocChecks();
      expect(checks.find((c) => c.id === id)?.passed).toBe(true);
    });
  }
  it("calculates usage from supplied rates, not an invented provider tariff", () => {
    expect(projectPocUsage(1000, 3000, 1000, 2, 8)).toBe(14);
    expect(projectPocUsage(1000, 3000, 1000, 0, 0)).toBe(0);
    expect(() => projectPocUsage(-1, 3000, 1000, 2, 8)).toThrow();
  });
  it("preserves the saved report date and rejects inconsistent results", () => {
    const report = { measuredAt: "2026-10-26T12:25:59Z", scope: "Tests", success: true, tests: { total: 66, passed: 66, failed: 0 } };
    expect(parseTestEvidence(report).measuredAt).toBe(report.measuredAt);
    expect(() => parseTestEvidence({ ...report, tests: { total: 66, passed: 65, failed: 0 } })).toThrow();
    expect(() => parseTestEvidence({ ...report, success: false })).toThrow();
    expect(() => parseTestEvidence({ ...report, measuredAt: "invalid" })).toThrow();
  });
});