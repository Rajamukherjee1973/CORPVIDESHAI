import { describe, expect, it } from "vitest";
import { priceCase, ledgerToCsv, type LedgerCase } from "@/lib/ledger";
import { ledgerTax } from "@/lib/ledger-tax";

const london: LedgerCase = { id: "tax-test", at: 1, iso: "2026-10-30T00:00:00Z", desk: "Treasury ledger", entity: "Infosys", hub: "London", country: "United Kingdom", code: "GBP", crore: 950, rateAt: 110, seq: 1, digest: "tax-test", route: "ODI", source: "booked" };

describe("corridor withholding", () => {
  it("does not tax the 950 crore investment principal", () => {
    const row = priceCase(london, 110);
    expect(row.whtInr).toBe(0);
    expect(row.allInBps).toBeCloseTo(16.523664210526316, 8);
    expect(row.chargesInr).toBe(15697481);
  });
  it("applies the UK 15% general royalty ceiling only to a 2 crore chargeable component", () => {
    const row = priceCase({ ...london, tax: { income: "royalty", taxableCr: 2, treatyEligible: true } }, 110);
    expect(row.whtPct).toBe(15);
    expect(row.whtInr).toBe(3_000_000);
    expect(row.chargesInr).toBe(18_697_481);
    expect(ledgerToCsv([row])).toContain("royalty,2,true");
  });
  it("uses Singapore's 10% royalty reference instead of the UK 15% ceiling", () => {
    expect(ledgerTax("Singapore", 950, { income: "royalty", taxableCr: 2, treatyEligible: true }).withholdingInr).toBe(2_000_000);
  });
  it("keeps unknown country tax unpriced in quotes and exports", () => {
    const row = priceCase({ ...london, country: "Unknown", tax: { income: "interest", taxableCr: 2, treatyEligible: true } }, 110);
    expect(row.whtPct).toBeNull();
    expect(row.allInBps).toBeNull();
    expect(row.taxAssessment.priced).toBe(false);
  });
  it("does not apply a treaty ceiling without confirmed eligibility", () => {
    const tax = ledgerTax("United Kingdom", 950, { income: "royalty", taxableCr: 2, treatyEligible: false });
    expect(tax.appliedPct).toBeNull();
    expect(tax.priced).toBe(false);
  });
  it("leaves unclassified captured payments unpriced instead of tax-free", () => {
    expect(ledgerTax("—", 950, { income: "unknown", taxableCr: 0, treatyEligible: false }).priced).toBe(false);
  });
});