import { describe, expect, it } from "vitest";
import { currencyScenario, normalizeOutlook } from "@/lib/currency-outlook";

describe("live-rate currency outlook", () => {
  it("prices the outlook from its supplied INR-per-unit snapshot", () => {
    const s = currencyScenario(75.24, 2, 50, 20, 50);
    expect(s.projectedRate).toBeCloseTo(76.7448);
    expect(s.allocationCr).toBe(10);
    expect(s.hedgeCr).toBe(5);
    expect(s.translationCr).toBeCloseTo(0.1);
  });
  it("prevents allocation to a currency without supported OPI coverage", () => {
    const answer = normalizeOutlook({ outlook: "Review", action: "Review", centralMovePct: 100, allocationPct: 90, hedgePct: 150, rationale: [], risks: [], reviewTrigger: "Review" }, false);
    expect(answer.allocationPct).toBe(0);
    expect(answer.centralMovePct).toBe(15);
    expect(answer.hedgePct).toBe(100);
  });
  it("a fully hedged simplified scenario offsets currency translation", () => {
    expect(currencyScenario(95, -5, 50, 100, 100).translationCr).toBe(0);
  });
});