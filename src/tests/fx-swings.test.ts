import { describe, expect, it } from "vitest";
import { bookRisk, hedgeCost, horizonMove, policyRatio, shockPnl, swingStats } from "@/lib/fx-swings";

const wk = (k: number) => `2026-w${String(k).padStart(2, "0")}`;
const series = (f: (k: number) => number) => Array.from({ length: 53 }, (_, k) => ({ date: wk(k), inrPer: f(k) }));
const zig = series((k) => (k % 2 ? 91 : 90));
const zag = series((k) => (k % 2 ? 90 : 91));

describe("historical swings", () => {
  it("reports 1-week and 52-week change, range and drawdown from the observations", () => {
    const s = swingStats("USD", series((k) => (k === 20 ? 100 : 90 + k * 0.1)))!;
    expect(s.chg52w).toBeCloseTo(95.2 / 90 - 1, 6);
    expect(s.chg1w).toBeCloseTo(95.2 / 95.1 - 1, 6);
    expect(s.high).toBe(100);
    expect(s.highDate).toBe(wk(20));
    expect(s.maxDrawdown).toBeCloseTo(92.1 / 100 - 1, 6);
  });
  it("returns null without at least two observations", () => {
    expect(swingStats("USD", [{ date: "a", inrPer: 90 }])).toBeNull();
  });
  it("95% one-sided move over 13 weeks at 10% vol is 1.645 × 5%", () => {
    expect(horizonMove(0.1, 13).p95).toBeCloseTo(0.08225, 5);
  });
});

describe("hedge book risk", () => {
  it("a fully hedged book carries no residual loss", () => {
    const r = bookRisk([{ code: "USD", exposureCr: 100, hedgeRatio: 1 }], { USD: zig }, 4)!;
    expect(r.hedgedVar).toBe(0);
    expect(r.unhedgedVar).toBeGreaterThan(0);
  });
  it("opposite-moving currencies offset; identical ones give no diversification", () => {
    const off = bookRisk([{ code: "A", exposureCr: 100, hedgeRatio: 0 }, { code: "B", exposureCr: 100, hedgeRatio: 0 }], { A: zig, B: zag }, 4)!;
    expect(off.corr[0]![1]).toBeCloseTo(-1, 2);
    expect(off.hedgedVar).toBeLessThan(off.standaloneVar * 0.05);
    const same = bookRisk([{ code: "A", exposureCr: 100, hedgeRatio: 0 }, { code: "B", exposureCr: 100, hedgeRatio: 0 }], { A: zig, B: zig }, 4)!;
    expect(same.diversification).toBeCloseTo(0, 6);
  });
  it("halving the hedge ratio from 100% leaves half the unhedged loss", () => {
    const r = bookRisk([{ code: "USD", exposureCr: 200, hedgeRatio: 0.5 }], { USD: zig }, 13)!;
    expect(r.hedgedVar).toBeCloseTo(r.unhedgedVar / 2, 6);
  });
  it("refuses with fewer than 26 shared weeks", () => {
    expect(bookRisk([{ code: "USD", exposureCr: 1, hedgeRatio: 0 }], { USD: zig.slice(0, 20) }, 4)).toBeNull();
  });
  it("forward cost: ₹500 cr, 60% hedged, 2% a year for 26 weeks = ₹3 cr", () => {
    expect(hedgeCost([{ code: "USD", exposureCr: 500, hedgeRatio: 0.6 }], 0.02, 26)).toBeCloseTo(3, 6);
  });
  it("a 5% rupee appreciation on ₹400 cr, 75% hedged, loses ₹20 cr unhedged and ₹5 cr hedged", () => {
    const p = shockPnl([{ code: "USD", exposureCr: 400, hedgeRatio: 0.75 }], -0.05);
    expect(p.unhedged).toBeCloseTo(-20, 6);
    expect(p.hedged).toBeCloseTo(-5, 6);
  });
  it("policy bands: under 6% vol → 25%, 6–12% → 50%, 12%+ → 75%", () => {
    expect(policyRatio(0.05).ratio).toBe(0.25);
    expect(policyRatio(0.08).ratio).toBe(0.5);
    expect(policyRatio(0.2).ratio).toBe(0.75);
  });
});
