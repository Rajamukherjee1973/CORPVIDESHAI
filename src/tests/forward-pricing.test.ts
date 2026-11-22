import { describe, expect, it } from "vitest";
import { forwardRate, hedgeCarry, premiumPa, ratesFromObservations } from "@/lib/forward-pricing";

const today = new Date("2026-11-22");
const map = { IN: "INR", US: "USD", XM: "EUR", DE: "EUR", ZA: "ZAR" };

describe("forward pricing from official rates", () => {
  it("3-month USD forward at spot ₹90, INR 5.5% and USD 3.875%: ₹90.36", () => {
    const f = forwardRate(90, 5.5, 3.875, 91);
    expect(f).toBeCloseTo(90 * (1 + 0.055 * 91 / 365) / (1 + 0.03875 * 91 / 365), 8);
    expect(f).toBeCloseTo(90.36, 2);
    expect(premiumPa(90, f, 91)).toBeCloseTo(0.0161, 3);
  });
  it("drops stale and missing observations; pegged AED borrows the US rate, labelled", () => {
    const r = ratesFromObservations([
      { area: "US", date: "2026-11-17", value: 3.875 },
      { area: "DE", date: "1998-12-31", value: 3 },
      { area: "XM", date: "2026-11-17", value: 2.5 },
      { area: "ZA", date: "2026-11-16", value: Number.NaN },
    ], map, today);
    expect(r["EUR"]!.ratePct).toBe(2.5);
    expect(r["ZAR"]).toBeUndefined();
    expect(r["AED"]).toMatchObject({ ratePct: 3.875, proxyOf: "USD" });
  });
  it("hedging ₹100 cr of USD fully for 13 weeks earns the premium; margin reduces it; unpriced currency uses the fallback cost", () => {
    const rates = { INR: { ratePct: 5.5, date: "d", area: "IN" }, USD: { ratePct: 3.875, date: "d", area: "US" } };
    const pos = [{ code: "USD", exposureCr: 100, hedgeRatio: 1 }, { code: "SGD", exposureCr: 100, hedgeRatio: 0.5 }];
    const out = hedgeCarry(pos, { USD: 90, SGD: 70 }, rates, 13, 0.002, 0.02);
    const usd = out.lines[0]!;
    expect(usd.priced).toBe(true);
    expect(usd.carryCr).toBeCloseTo(100 * (usd.premiumPa! - 0.002) * 0.25, 8);
    expect(usd.carryCr).toBeGreaterThan(0);
    expect(out.lines[1]).toMatchObject({ priced: false, carryCr: -100 * 0.5 * 0.02 * 0.25 });
  });
});
