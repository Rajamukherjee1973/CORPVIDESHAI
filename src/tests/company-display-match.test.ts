import { describe, expect, it } from "vitest";
import { matchDisplayCompany } from "@/lib/company-display-match";
import { canSubmitCompany } from "@/lib/corporate-access";

describe("Console disclosure linkage", () => {
  it("links the same company across display spelling", () => {
    expect(matchDisplayCompany("Tata Steel", ["TATA STEEL LTD"], (v) => v)).toBe("TATA STEEL LTD");
  });
  it("does not substitute a subsidiary for its parent", () => {
    expect(matchDisplayCompany("Reliance Industries", ["RELIANCE STRATEGIC BUSINESS VENTURES LIMITED"], (v) => v)).toBeUndefined();
  });
  it("keeps exact trusted assignments as the permission boundary", () => {
    expect(canSubmitCompany("Tata Steel", ["TATA STEEL LTD"])).toBe(false);
  });
});