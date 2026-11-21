import { describe, expect, it } from "vitest";
import { allocationBudget, RESOURCE_PLAN } from "@/lib/feasibility";
describe("resource allocation calculations", () => {
  it("multiplies quantity, monthly rate and duration before adding contingency", () => {
    const result = allocationBudget([{ quantity: 2, monthlyLakh: 1.8, months: 6 }], 15);
    expect(result.subtotalLakh).toBeCloseTo(21.6); expect(result.contingencyLakh).toBeCloseTo(3.24); expect(result.totalLakh).toBeCloseTo(24.84);
  });
  it("totals the illustrative six-month staffing and tool plan", () => {
    const result = allocationBudget(RESOURCE_PLAN, 15);
    expect(result.subtotalLakh).toBeCloseTo(84); expect(result.totalLakh).toBeCloseTo(96.6);
  });
  it("rejects invalid values instead of reporting a misleading budget", () => {
    expect(() => allocationBudget([{ quantity: 1, monthlyLakh: -1, months: 6 }], 15)).toThrow();
    expect(() => allocationBudget([], Number.NaN)).toThrow();
  });
});