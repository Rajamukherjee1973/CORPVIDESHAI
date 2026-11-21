import { describe, expect, it } from "vitest";
import { canSubmitCompany, reportingStatus } from "@/lib/corporate-access";
describe("Corporate filing scope", () => {
  it("allows an assigned company", () => expect(canSubmitCompany("A LTD", ["A LTD"])).toBe(true));
  it("denies another company", () => expect(canSubmitCompany("B LTD", ["A LTD"])).toBe(false));
  it("denies unassigned accounts", () => expect(canSubmitCompany("A LTD", [])).toBe(false));
  it("keeps recorded filings labelled as simulations", () => expect(reportingStatus("2026-09-30", true, "2026-10-26")).toBe("Recorded (simulation)"));
  it("flags estimated past deadlines without declaring a violation", () => expect(reportingStatus("2026-09-30", false, "2026-10-26")).toBe("Past estimated deadline · verify"));
});