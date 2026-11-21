import { describe, it, expect } from "vitest";
import { evaluateLegalCase } from "@/lib/services/legal-policy";
import { legalCaseSchema, type LegalCase } from "@/lib/services/contracts";
const base: LegalCase = { investment: "ODI", investor: "listed", netWorthCr: 100, existingExposureCr: 200, proposedCr: 50, activity: "operating", denomination: "foreign", nocRequired: false, nocAvailable: false, evidenceComplete: true };
describe("Conservative overseas investment route service", () => {
  it("calculates the general ODI 400% ceiling and includes existing commitments", () => { const r = evaluateLegalCase(base); expect(r.ceilingCr).toBe(400); expect(r.totalExposureCr).toBe(250); expect(r.headroomCr).toBe(150); expect(r.route).toBe("AD-bank review"); });
  it("requires prior-approval review above the general ODI ceiling", () => { expect(evaluateLegalCase({ ...base, proposedCr: 201 }).route).toBe("Prior approval review"); });
  it("calculates the general OPI 50% ceiling without silently waiving it", () => { const r = evaluateLegalCase({ ...base, investment: "OPI", existingExposureCr: 40, proposedCr: 11 }); expect(r.ceilingCr).toBe(50); expect(r.route).toBe("Hold / specialist review"); });
  it("does not treat an unlisted investor as freely eligible for OPI", () => { expect(evaluateLegalCase({ ...base, investment: "OPI", investor: "unlisted", existingExposureCr: 0, proposedCr: 10 }).findings.some((f) => f.code === "investor" && f.status === "hold")).toBe(true); });
  it("holds a prohibited gambling activity", () => { expect(evaluateLegalCase({ ...base, activity: "gambling" }).route).toBe("Hold / specialist review"); });
  it("distinguishes INR denomination from dealing in INR-linked products", () => { expect(evaluateLegalCase({ ...base, denomination: "INR" }).route).toBe("AD-bank review"); expect(evaluateLegalCase({ ...base, activity: "inr-linked" }).route).toBe("Prior approval review"); });
  it("holds a required missing NOC rather than inventing approval", () => { expect(evaluateLegalCase({ ...base, nocRequired: true }).route).toBe("Hold / specialist review"); });
  it("holds incomplete evidence", () => { expect(evaluateLegalCase({ ...base, evidenceComplete: false }).route).toBe("Hold / specialist review"); });
  it("rejects negative exposure at the service boundary", () => { expect(legalCaseSchema.safeParse({ ...base, existingExposureCr: -1 }).success).toBe(false); });
});