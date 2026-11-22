import { describe, expect, it } from "vitest";
import { measureFromSnapshots, realisedVol, snapshotDates, FX_RISK_MIN_RETURNS } from "@/lib/fx-risk";
import { compareHubs, hubCurrencies, hubsIn, type CompareInput } from "@/lib/hub-compare";

const CASE: CompareInput = { notionalCr: 475, route: "ODI", docsReady: 90, firstTimeFiler: false, section195: true };

describe("measured currency risk from real rates", () => {
  it("samples 52 weekly changes (53 dated snapshots, 7 days apart)", () => {
    const d = snapshotDates(new Date(Date.UTC(2026, 10, 21)));
    expect(d).toHaveLength(53);
    expect(d[52]).toBe("2026-11-21");
    expect(d[51]).toBe("2026-11-14");
  });

  it("a flat rate measures zero volatility; alternating ±1% weekly measures about 7.25%", () => {
    const flat = Array.from({ length: 53 }, (_, k) => ({ date: `w${String(k).padStart(2, "0")}`, inrPer: 90 }));
    expect(realisedVol("USD", flat)?.vol).toBe(0);
    const zig = flat.map((p, k) => ({ ...p, inrPer: k % 2 ? 90 * 1.01 : 90 }));
    expect(realisedVol("USD", zig)!.vol).toBeCloseTo(0.0725, 3);
  });

  it("refuses to measure with fewer than the minimum weekly changes", () => {
    const few = Array.from({ length: FX_RISK_MIN_RETURNS }, (_, k) => ({ date: `d${k}`, inrPer: 90 + k }));
    expect(realisedVol("USD", few)).toBeNull();
  });

  it("converts units-per-INR snapshots and reports unmeasurable codes as missing", () => {
    const snaps = Array.from({ length: 53 }, (_, k) => ({ date: `2026-${k}`, perInr: { usd: k % 2 ? 1 / 91 : 1 / 90 } }));
    const out = measureFromSnapshots(["USD", "AOA"], snaps);
    expect(out.vols["USD"]!.observations).toBe(52);
    expect(out.missing).toEqual(["AOA"]);
  });

  it("measured volatility replaces the fixed estimate in the hub comparison", () => {
    const vols = { BWP: { code: "BWP", vol: 0.5, observations: 52, from: "a", to: "b" } };
    const row = (v?: CompareInput["vols"]) => compareHubs(hubsIn("africa"), { ...CASE, ...(v ? { vols: v } : {}) }).find((r) => r.ccy === "BWP")!;
    const assumed = row();
    const measured = row(vols);
    expect(assumed.volSource).toBe("assumed");
    expect(measured.volSource).toBe("measured");
    expect(measured.vol).toBe(0.5);
    expect(measured.driftP90Cr).toBeGreaterThan(assumed.driftP90Cr);
  });

  it("requests every settlement currency of the 62 hubs once", () => {
    const c = hubCurrencies();
    expect(new Set(c).size).toBe(c.length);
    for (const code of ["USD", "SGD", "BWP", "ETB", "ZMW"]) expect(c).toContain(code);
  });
});
