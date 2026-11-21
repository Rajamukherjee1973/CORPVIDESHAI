import { describe, expect, it } from "vitest";
import { aprDue, filingsFor, formFcDue, groupByCompany } from "@/lib/filings";

const row = { party: "A LTD", jv: "A BV", kind: "WOS", country: "Netherlands", activity: "x", equity: 2, loan: 0, guarantee: 3, total: 5, partyCount: 1, partyTotal: 5, sharedJv: 1 };

describe("filings", () => {
  it("Form FC due 30 days after the reporting month ends", () => expect(formFcDue("August 2026")).toBe("2026-09-30"));
  it("APR due 31 December", () => expect(aprDue("August 2026")).toBe("2026-12-31"));
  it("one Form FC per funded part plus APR", () => expect(filingsFor(row, "August 2026").map((f) => f.part)).toEqual(["equity", "guarantee", "annual"]));
  it("groups rows by company", () => expect(groupByCompany([row, { ...row, total: 1 }], "August 2026")[0]!.totalUsdMn).toBe(6));
});
