import { describe, expect, it } from "vitest";
import { ODI_HISTORY, ODI_SECTORS } from "@/data/odi-sector-history";
import { cagr, sectorShares, sectorSum, toCrore, totalIn, niceMax } from "@/lib/odi-history";

const year = (fy: string) => ODI_HISTORY.find((y) => y.fy === fy)!;

describe("26-year rupee outflow history", () => {
  it("covers 26 consecutive financial years, FY2000-01 to FY2025-26", () => {
    expect(ODI_HISTORY).toHaveLength(26);
    ODI_HISTORY.forEach((y, i) => expect(y.fy).toBe(`${2000 + i}-${String(1 + i).padStart(2, "0")}`));
  });

  it("converts the official US$26,746 mn FY2025-26 outflow at RBI's ₹88.31 average into crore", () => {
    expect(toCrore(26746, 88.31)).toBeCloseTo(236193.926, 3);
    expect(totalIn(year("2025-26"), "inr")).toBeCloseTo(236193.926, 3);
    expect(totalIn(year("2000-01"), "inr")).toBeCloseTo(3095.88, 1);
  });

  it("keeps each published sector split consistent with its year's official total", () => {
    for (const y of ODI_HISTORY.filter((r) => r.sectors)) {
      expect(Math.abs(sectorSum(y)! - y.usdMn) / y.usdMn).toBeLessThan(0.002);
    }
  });

  it("never invents a sector split for years without an official nine-sector table", () => {
    const missing = ODI_HISTORY.filter((y) => !y.sectors).map((y) => y.fy);
    expect(missing).toEqual(["2000-01", "2001-02", "2002-03", "2003-04", "2004-05", "2005-06", "2006-07", "2007-08", "2011-12", "2012-13"]);
  });

  it("shows financial & business services rising from 19% (FY2008-09) to 43% (FY2025-26) of outflow", () => {
    expect(sectorShares(year("2008-09"))!.fin).toBeCloseTo(19.1, 1);
    expect(sectorShares(year("2025-26"))!.fin).toBeCloseTo(42.56, 2);
    expect(sectorShares(year("2008-09"))!.mfg).toBeCloseTo(54.8, 1);
    const shares = sectorShares(year("2024-25"))!;
    expect(ODI_SECTORS.reduce((a, s) => a + shares[s.key], 0)).toBeCloseTo(100, 6);
  });

  it("computes compound growth and clean chart axes", () => {
    expect(cagr(100, 121, 2)).toBeCloseTo(0.1, 10);
    expect(niceMax(236194)).toBe(250000);
    expect(niceMax(26746)).toBe(30000);
  });
});
