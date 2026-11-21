import { describe, expect, test } from "vitest";
import { PREDICTIVE_CASES } from "@/data/predictive-cases";
import { HUBS } from "@/data/hubs";
import { findPurpose } from "@/data/purposes";
import { ceilingCr, maxTicketCr, runCase } from "@/lib/predictive-cases";

const byId = (id: string) => {
  const c = PREDICTIVE_CASES.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};

describe("predictive intelligence cases", () => {
  test("every case uses a real hub and a real ODI/OPI purpose matching its route", () => {
    for (const c of PREDICTIVE_CASES) {
      expect(HUBS.some((h) => h.city === c.hub)).toBe(true);
      expect(findPurpose(c.purpose)).toBeDefined();
      expect(c.purpose.startsWith("OPI")).toBe(c.route === "OPI");
    }
  });

  test("portfolio ceiling is 50% of net worth and direct ceiling is 400%", () => {
    expect(ceilingCr(byId("opi-cap"))).toBe(6000);
    expect(maxTicketCr(byId("opi-cap"))).toBe(1200);
    expect(ceilingCr(byId("ceiling"))).toBe(160000);
    expect(maxTicketCr(byId("ceiling"))).toBe(18000);
  });

  test("a ticket near the ceiling must be flagged to act on headroom", () => {
    expect(runCase(byId("ceiling"), 55).decisive?.severity).toBe("act");
    expect(runCase(byId("opi-cap"), 105).decisive?.severity).toBe("act");
  });

  test("shrinking the ticket clears the headroom flag", () => {
    expect(runCase(byId("ceiling"), 55, { amountCr: 1000 }).decisive?.severity).not.toBe("act");
  });

  test("completing the document pack lowers query risk for a first-time filer", () => {
    const before = runCase(byId("first-filer"), 98).decisive!.p50;
    const after = runCase(byId("first-filer"), 98, { docsReady: 100 }).decisive!.p50;
    expect(after).toBeLessThan(before);
  });

  test("the clean Gulf case is the one released without changes", () => {
    expect(runCase(byId("release"), 24).verdict.state).toBe("release");
  });
});
