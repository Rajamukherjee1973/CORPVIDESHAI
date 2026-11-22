import { describe, expect, it } from "vitest";
import { benchmarkForward, curveFromRows, curveIsCurrent, premiaPctFor } from "@/lib/fbil-forward";
import { quoteForward, valueContract, type ForwardContract } from "@/lib/forward-contract";
import { hedgeCarry } from "@/lib/forward-pricing";

// Shape and values from FBIL's public release of 13 Nov 2026.
const row = (tenorName: string, settlementDate: string, rate: string, usdInrPremiaRs: string) => ({ processRunDate: "2026-11-13 00:00:00", displayTime: "2026-11-13 16:45:00", tenorName, settlementDate: `${settlementDate} 00:00:00`, rate, usdInrPremiaRs, comments: "" });
const rows = [
  row("O/N", "2026-11-16", "3.4344", "0.0266"),
  row("1M", "2026-12-17", "4.5517", "0.3525"),
  row("2M", "2027-01-19", "5.3502", "0.8699"),
  row("3M", "2027-02-17", "5.1188", "1.2154"),
  row("6M", "2027-05-18", "4.7508", "2.2321"),
  row("12M", "2027-11-17", "4.0815", "3.8447"),
  row("FBD April", "2027-04-02", "5.1484", "1.8070"),
  row("Spot", "2026-11-17", "", ""),
  { ...row("3M", "2027-02-16", "9.9", "9.9"), processRunDate: "2026-11-12 00:00:00" },
];
const curve = curveFromRows(rows)!;
const terms = { side: "buy" as const, notional: 1_000_000, tradeDate: "2026-11-22", maturityDate: "2027-02-22", marginBp: 0 };

describe("FBIL USD/INR forward premia", () => {
  it("keeps only the latest day's monthly tenors, measured from the spot date", () => {
    expect(curve.asOf).toBe("2026-11-13");
    expect(curve.points.map((p) => p.tenor)).toEqual(["1M", "2M", "3M", "6M", "12M"]);
    expect(curve.points[2]).toMatchObject({ days: 92, premiaPct: 5.1188 });
  });

  it("reproduces FBIL's own rupee premium for the 3-month tenor", () => {
    const fwd = benchmarkForward(94.2, curve, 92)!;
    expect(fwd - 94.2).toBeCloseTo(1.2154, 2);
  });

  it("interpolates between published tenors", () => {
    expect(premiaPctFor(curve, 92)).toBeCloseTo(5.1188, 6);
    const mid = premiaPctFor(curve, (92 + 182) / 2)!;
    expect(mid).toBeCloseTo((5.1188 + 4.7508) / 2, 3);
  });

  it("gives no benchmark beyond 12 months", () => {
    expect(premiaPctFor(curve, 365 + 30)).toBeNull();
  });

  it("treats a release older than three weeks as unavailable", () => {
    expect(curveIsCurrent(curve, "2026-11-22")).toBe(true);
    expect(curveIsCurrent(curve, "2026-12-10")).toBe(false);
  });

  it("prices a USD contract from FBIL and adds the bank margin on top", () => {
    const q = quoteForward(terms, 94.2, 5.5, 4.25, curve)!;
    expect(q.basis).toBe("fbil");
    expect(q.fair).toBeCloseTo(94.2 * (1 + (premiaPctFor(curve, 92)! / 100) * (92 / 365)), 6);
    const withMargin = quoteForward({ ...terms, marginBp: 40 }, 94.2, 5.5, 4.25, curve)!;
    expect(withMargin.rate).toBeGreaterThan(q.rate);
  });

  it("falls back to rate parity past 12 months", () => {
    const q = quoteForward({ ...terms, maturityDate: "2028-01-22" }, 94.2, 5.5, 4.25, curve)!;
    expect(q.basis).toBe("parity");
  });

  it("marks saved USD contracts against the FBIL forward", () => {
    const c: ForwardContract = { ref: "x", code: "USD", side: "buy", notional: 1e6, tradeDate: "2026-11-22", maturityDate: "2027-02-22", marginBp: 0, rate: 94, fairAtTrade: 95, spotAtTrade: 94, rateOverridden: false, bookedAt: "" };
    const v = valueContract(c, "2026-11-22", 94.2, 5.5, 4.25, curve);
    expect(v.basis).toBe("fbil");
    expect(v.proxy).toBe(false);
  });

  it("uses FBIL for USD hedge carry only", () => {
    const { lines } = hedgeCarry([{ code: "USD", exposureCr: 100, hedgeRatio: 1 }, { code: "GBP", exposureCr: 100, hedgeRatio: 1 }], { USD: 94.2, GBP: 124.6 }, { INR: { ratePct: 5.5, date: "", area: "IN" }, USD: { ratePct: 4.25, date: "", area: "US" }, GBP: { ratePct: 4, date: "", area: "GB" } }, 13, 0, 0.02, curve);
    expect(lines[0]!.basis).toBe("fbil");
    expect(lines[1]!.basis).toBe("parity");
  });
});
