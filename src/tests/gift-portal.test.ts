import { describe, expect, it } from "vitest";
import { caseStage, canAct, REGULATOR_PARTIES, type GiftEvent } from "@/lib/gift-portal";
const filed: GiftEvent[] = [{ party: "treasury", action: "filed" }];
const verified = [...filed, { party: "ad_bank", action: "verified" } as GiftEvent];
const allCleared = [...verified, ...REGULATOR_PARTIES.map((p) => ({ party: p, action: "cleared" }))];
describe("GIFT clearance workflow", () => {
  it("regulators cannot act before the AD bank verifies", () => {
    expect(caseStage(filed)).toBe("awaiting_bank");
    expect(canAct("rbi", filed)).toBe(false);
    expect(canAct("ad_bank", filed)).toBe(true);
  });
  it("IBU releases only after all six regulators clear", () => {
    expect(canAct("ibu", [...verified, ...allCleared.slice(2, 7)])).toBe(false);
    expect(caseStage(allCleared)).toBe("awaiting_release");
    expect(canAct("ibu", allCleared)).toBe(true);
  });
  it("a regulator query returns the case to the bank, and re-verification restarts the round", () => {
    const q = [...verified, { party: "rbi", action: "queried" } as GiftEvent];
    expect(caseStage(q)).toBe("queried");
    expect(canAct("ad_bank", q)).toBe(true);
    const re = [...q, { party: "ad_bank", action: "verified" } as GiftEvent];
    expect(caseStage(re)).toBe("with_regulators");
    expect(canAct("rbi", re)).toBe(true);
  });
});
