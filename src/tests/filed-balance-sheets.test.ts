import { describe, expect, it } from "vitest";
import { FILED_BALANCE_SHEETS } from "@/data/filed-balance-sheets";
import { COMPANIES } from "@/data/companies";

describe("filed 31 March 2026 balance sheets", () => {
  it("covers the top 50 companies", () => {
    const top50 = COMPANIES.filter((c) => c.rank <= 50);
    expect(top50.every((c) => c.balanceSheet)).toBe(true);
    expect(FILED_BALANCE_SHEETS).toHaveLength(50);
  });
  it("uses filed net worth = equity capital + reserves, with ceiling at 400%", () => {
    const ril = COMPANIES.find((c) => c.name === "Reliance Industries")!;
    expect(ril.netWorth).toBe(566235);
    expect(ril.ceiling).toBe(566235 * 4);
  });
  it("leaves companies beyond the top 50 without a filed sheet", () => {
    expect(COMPANIES.find((c) => c.rank === 51)!.balanceSheet).toBeUndefined();
  });
});
