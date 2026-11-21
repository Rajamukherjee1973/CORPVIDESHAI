import { describe, expect, it } from "vitest";
import { ceilingFor, runStress, scoreFlow } from "@/lib/frontier";

const calm = { inrMovePct: 0, rateShockBps: 0, equityDrawdownPct: 0, sanctions: false, hedgeRatio: 0 };

describe("frontier", () => {
  it("ODI ceiling is 400% of net worth", () => expect(ceilingFor("ODI", 1000)).toBe(4000));
  it("OPI ceiling is 50% of net worth", () => expect(ceilingFor("OPI", 1000)).toBe(500));
  it("sanctioned destination is blocked", () => {
    expect(runStress({ croreInr: 100, netWorthCrore: 1000, usedCrore: 0, route: "ODI", shock: { ...calm, sanctions: true } }).verdict).toBe("Blocked");
  });
  it("breaching the ceiling defers", () => {
    expect(runStress({ croreInr: 600, netWorthCrore: 1000, usedCrore: 0, route: "OPI", shock: calm }).verdict).toBe("Defer");
  });
  it("full hedge removes FX cost", () => {
    expect(runStress({ croreInr: 100, netWorthCrore: 1000, usedCrore: 0, route: "ODI", shock: { ...calm, inrMovePct: 10, hedgeRatio: 1 } }).fxCostCrore).toBe(0);
  });
  it("shared beneficiary plus high utilisation is critical", () => {
    const a = scoreFlow({ id: "x", entity: "e", hub: "h", crore: 1, gapHours: 50, utilisationPct: 95, sharedBeneficiary: 3, nearThreshold: false });
    expect(a.level).toBe("Critical");
  });
});

import { scoreRbiFlow, usdMnToCrore } from "@/lib/frontier";
const base = { party: "P", jv: "J", kind: "JV", country: "France", activity: "a", equity: 1, loan: 0, guarantee: 0, total: 1, partyCount: 1, partyTotal: 1, sharedJv: 1 };
describe("rbi radar", () => {
  it("small plain flow is Watch", () => expect(scoreRbiFlow(base).level).toBe("Watch"));
  it("party over USD 1bn in month plus large guarantee ticket is Critical", () => {
    expect(scoreRbiFlow({ ...base, equity: 0, guarantee: 800, total: 800, partyTotal: 1200 }).level).toBe("Critical");
  });
  it("entity funded by 3 Indian parties in Mauritius is Elevated", () => {
    expect(scoreRbiFlow({ ...base, country: "Mauritius", sharedJv: 3 }).level).toBe("Elevated");
  });
  it("USD 10m at 95 is ₹95 crore", () => expect(usdMnToCrore(10, 95)).toBe(95));
});

import { findLatestRelease, findOfdiFile, isXlsx, parseOfdiMatrix } from "@/lib/rbi-odi";
describe("rbi auto-load parsing", () => {
  it("finds the newest release on RBI's list", () => {
    const html = `<a class='link2' href=BS_PressReleaseDisplay.aspx?prid=63623>Overseas Direct Investment for August 2026</a><a href=BS_PressReleaseDisplay.aspx?prid=63396>Overseas Direct Investment for July 2026</a>`;
    expect(findLatestRelease(html)).toEqual({ prid: "63623", period: "August 2026" });
  });
  it("finds the OFDI spreadsheet link", () => expect(findOfdiFile(`href="https://rbidocs.rbi.org.in/rdocs/content/docs/OFDI18092026.xlsx"`)).toBe("https://rbidocs.rbi.org.in/rdocs/content/docs/OFDI18092026.xlsx"));
  it("treats a bot-check HTML page as blocked", () => expect(isXlsx(new TextEncoder().encode("<!DOCTYPE html>"))).toBe(false));
  it("counts parties sharing one overseas entity", () => {
    const rows = parseOfdiMatrix([["Sr."], [1, "A LTD", "X PTE", "JV", "SINGAPORE", "MANUFACTURING", 1, 0, 0, 1], [2, "B LTD", "x pte", "JV", "SINGAPORE", "MANUFACTURING", 2, 0, 0, 2]]);
    expect(rows.map((r) => r.sharedJv)).toEqual([2, 2]);
  });
});
