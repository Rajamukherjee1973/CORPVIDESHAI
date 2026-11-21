import { describe, expect, it } from "vitest";
import { HUBS } from "@/data/hubs";
import { LISTED_1000 } from "@/data/listed";
import { DEMO_REVIEWERS, demoReviewStatus, scenarioAmounts, scenarioCurrency, setTreasuryScenario, useTreasuryScenario, validScenario } from "./treasury-scenario";
import { renderHook, act } from "@testing-library/react";

describe("connected treasury demonstration", () => {
  it("offers 1,000 unique company entries grouped into sectors", () => {
    expect(LISTED_1000).toHaveLength(1000);
    expect(new Set(LISTED_1000.map((c) => c.name)).size).toBe(1000);
    expect(LISTED_1000.every((c) => c.sector.length > 0)).toBe(true);
  });
  it("offers all 52 hub choices", () => {
    expect(HUBS).toHaveLength(52);
    expect(HUBS.every((h) => validScenario({ hub: h.city, purpose: "ODI-001", amountCr: 475 }))).toBe(true);
  });
  it("computes foreign amount from the chosen remittance and observed rate", () => {
    expect(scenarioAmounts(475, 100).foreignAmount).toBe(47_500_000);
    expect(scenarioAmounts(950, 100).foreignAmount).toBe(95_000_000);
    expect(scenarioAmounts(475, undefined).foreignAmount).toBeNull();
  });
  it("includes the six requested independent demo lenses", () => {
    expect(DEMO_REVIEWERS.map((r) => r.code).sort()).toEqual(["RBI", "IFSCA", "MoF", "FIU-IND", "DPIIT", "CBDT"].sort());
    expect(demoReviewStatus(1300, 0)).toBe("Response ready");
    expect(demoReviewStatus(1300, 5)).toBe("Reviewing");
    expect(demoReviewStatus(-1, 0)).toBe("Queued");
  });
  it("rejects invalid demonstration inputs", () => {
    expect(validScenario({ hub: "Singapore", purpose: "ODI-001", amountCr: -1 })).toBe(false);
    expect(validScenario({ hub: "Unknown", purpose: "ODI-001", amountCr: 475 })).toBe(false);
    expect(validScenario({ hub: "Singapore", purpose: "fake", amountCr: 475 })).toBe(false);
  });
  it("drops a picked currency when the hub changes from any other picker", () => {
    const { result } = renderHook(() => useTreasuryScenario());
    act(() => { setTreasuryScenario({ hub: "Singapore", currency: "USD" }); });
    expect(scenarioCurrency(result.current[0])).toBe("USD");
    act(() => { setTreasuryScenario({ hub: "London" }); });
    expect(scenarioCurrency(result.current[0])).toBe("GBP");
  });
  it("keeps a picked currency when only the amount changes", () => {
    const { result } = renderHook(() => useTreasuryScenario());
    act(() => { setTreasuryScenario({ hub: "Singapore", currency: "USD" }); });
    act(() => { setTreasuryScenario({ amountCr: 900 }); });
    expect(scenarioCurrency(result.current[0])).toBe("USD");
  });
});
