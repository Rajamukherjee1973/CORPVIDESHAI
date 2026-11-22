import { describe, expect, it } from "vitest";
import { compareHubs, hubsIn, summariseGroups, type CompareInput } from "@/lib/hub-compare";

const CASE: CompareInput = { notionalCr: 475, route: "ODI", docsReady: 90, firstTimeFiler: false, section195: true };

describe("comparative predictive analytics across hubs", () => {
  it("covers the 52 global hubs and the 10 African hubs as one 62-hub universe", () => {
    expect(hubsIn("all")).toHaveLength(62);
    expect(hubsIn("global")).toHaveLength(52);
    expect(hubsIn("africa")).toHaveLength(10);
  });

  it("SADC and COMESA views include bloc members already inside the 52", () => {
    const sadc = hubsIn("SADC").map((h) => h.city);
    expect(sadc).toContain("Johannesburg");
    expect(sadc).toContain("Gaborone");
    expect(hubsIn("COMESA").map((h) => h.city)).toContain("Nairobi");
  });

  it("runs the identical forecast model on every hub and ranks 1..n", () => {
    const rows = compareHubs(hubsIn("all"), CASE);
    expect(rows).toHaveLength(62);
    expect(rows.map((r) => r.rank)).toEqual(Array.from({ length: 62 }, (_, i) => i + 1));
    for (const r of rows) {
      expect(r.forecasts.map((f) => f.id).sort()).toEqual(["clearance", "cost", "drift", "rework"]);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
    // Same case inputs → identical rail clearance and query risk everywhere.
    expect(new Set(rows.map((r) => r.railMin)).size).toBe(1);
    expect(new Set(rows.map((r) => r.queryPct)).size).toBe(1);
  });

  it("prices African currencies with their own volatility, not a shared default", () => {
    const rows = compareHubs(hubsIn("africa"), CASE);
    const tail = (city: string) => rows.find((r) => r.hub.city === city)!.driftPct;
    expect(tail("Addis Ababa")).toBeGreaterThan(tail("Maputo"));
    expect(tail("Windhoek")).toBeGreaterThan(tail("Gaborone"));
  });

  it("GIFT IFSC, with the shortest route and lowest margin, outranks Luanda", () => {
    const rows = compareHubs(hubsIn("all"), CASE);
    const rank = (c: string) => rows.find((r) => r.hub.city === c)!.rank;
    expect(rank("GIFT IFSC")).toBeLessThan(rank("Luanda"));
  });

  it("summarises the global and African groups separately", () => {
    const s = summariseGroups(compareHubs(hubsIn("all"), CASE));
    expect(s.find((g) => g.group === "global")!.count).toBe(52);
    expect(s.find((g) => g.group === "africa")!.count).toBe(10);
  });
});
