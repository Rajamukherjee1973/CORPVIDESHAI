import { describe, expect, it } from "vitest";
import { HUBS } from "@/data/hubs";
import { AFRICA_HUBS, africaHubsInBloc } from "@/data/africa-hubs";
import { SCENARIO_HUBS, findHub } from "@/data/hub-catalog";
import { COUNTRY_META } from "@/data/currencies";
import { scenarioCurrency, validScenario } from "@/lib/treasury-scenario";

describe("African SADC & COMESA hubs", () => {
  it("adds exactly 10 African hubs while the global list stays at 52", () => {
    expect(AFRICA_HUBS).toHaveLength(10);
    expect(HUBS).toHaveLength(52);
    expect(SCENARIO_HUBS).toHaveLength(62);
  });
  it("places every new hub in SADC or COMESA and none duplicates the 52", () => {
    expect(AFRICA_HUBS.every((h) => h.blocs.some((b) => b === "SADC" || b === "COMESA"))).toBe(true);
    const global = new Set(HUBS.map((h) => h.city));
    expect(AFRICA_HUBS.some((h) => global.has(h.city))).toBe(false);
  });
  it("splits 7 SADC, 5 COMESA with Lusaka and Victoria in both", () => {
    expect(africaHubsInBloc("SADC")).toHaveLength(7);
    expect(africaHubsInBloc("COMESA")).toHaveLength(5);
    expect(africaHubsInBloc("Both").map((h) => h.city).sort()).toEqual(["Lusaka", "Victoria"]);
  });
  it("can be chosen in the treasury scenario and settles in its own currency", () => {
    expect(validScenario({ hub: "Lusaka", purpose: "ODI-001", amountCr: 475 })).toBe(true);
    expect(scenarioCurrency({ hub: "Lusaka", purpose: "ODI-001", amountCr: 475 })).toBe("ZMW");
    expect(scenarioCurrency({ hub: "Addis Ababa", purpose: "ODI-001", amountCr: 475 })).toBe("ETB");
    for (const h of AFRICA_HUBS) expect(COUNTRY_META[h.country]?.currency).toBe(h.currency);
    expect(findHub("Kigali")?.country).toBe("Rwanda");
  });
  it("does not claim treaty relief where India has no DTAA in force", () => {
    for (const city of ["Luanda", "Victoria", "Kigali"]) expect(AFRICA_HUBS.find((h) => h.city === city)?.dtaa).toBe("None");
  });
});
