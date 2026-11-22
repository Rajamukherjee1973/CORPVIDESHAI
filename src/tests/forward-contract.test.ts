import { describe, expect, it } from "vitest";
import { contractRef, daysBetween, markToMarket, maturityPnl, quoteForward, validateTerms, type ForwardContract } from "@/lib/forward-contract";

const terms = { side: "buy" as const, notional: 1_000_000, tradeDate: "2026-11-22", maturityDate: "2027-02-20", marginBp: 0 };

describe("hedge contract builder", () => {
  it("counts calendar days between trade and maturity", () => {
    expect(daysBetween("2026-11-22", "2027-02-20")).toBe(90);
  });

  it("rejects a maturity on or before the trade date", () => {
    expect(validateTerms({ ...terms, maturityDate: "2026-11-22" })).toMatch(/after the trade date/);
  });

  it("prices a 90-day USD forward by covered parity with no margin", () => {
    const q = quoteForward(terms, 90, 5.5, 3.5)!;
    // 90 × (1 + 0.055 × 90/365) / (1 + 0.035 × 90/365)
    expect(q.rate).toBeCloseTo(90.440, 3);
    expect(q.inrCr).toBeCloseTo(9.0440, 3);
  });

  it("charges the bank margin against the customer on both sides", () => {
    const fair = quoteForward(terms, 90, 5.5, 3.5)!.fair;
    const m = 90 * 0.005 * (90 / 365); // 50 bp a year
    expect(quoteForward({ ...terms, marginBp: 50 }, 90, 5.5, 3.5)!.rate).toBeCloseTo(fair + m, 6);
    expect(quoteForward({ ...terms, side: "sell", marginBp: 50 }, 90, 5.5, 3.5)!.rate).toBeCloseTo(fair - m, 6);
  });

  it("shows a buyer's profit when the rupee settles weaker than the contract rate", () => {
    expect(maturityPnl({ side: "buy", notional: 1_000_000, rate: 90 }, 92)).toBe(2_000_000);
    expect(maturityPnl({ side: "sell", notional: 1_000_000, rate: 90 }, 92)).toBe(-2_000_000);
  });

  it("marks a contract booked at fair value to zero on the day it is booked", () => {
    const q = quoteForward(terms, 90, 5.5, 3.5)!;
    const c: ForwardContract = { ref: "x", code: "USD", ...terms, rate: q.rate, fairAtTrade: q.fair, spotAtTrade: 90, rateOverridden: false, bookedAt: "" };
    expect(markToMarket(c, "2026-11-22", 90, 5.5, 3.5).pnlInr).toBeCloseTo(0, 6);
  });

  it("settles against spot once maturity has passed", () => {
    const c: ForwardContract = { ref: "x", code: "USD", ...terms, rate: 90, fairAtTrade: 90, spotAtTrade: 90, rateOverridden: true, bookedAt: "" };
    const v = markToMarket(c, "2027-03-01", 91, 5.5, 3.5);
    expect(v.matured).toBe(true);
    expect(v.pnlInr).toBe(1_000_000);
  });

  it("numbers contracts sequentially per year and currency", () => {
    expect(contractRef(2026, "usd", 7)).toBe("FWD-2026-USD-0007");
  });
});
