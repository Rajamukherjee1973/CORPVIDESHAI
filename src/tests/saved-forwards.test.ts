import { describe, expect, it } from "vitest";
import { bookHistory, needsMark, saveForwardSchema } from "@/lib/saved-forwards";
import { valueContract, type ForwardContract } from "@/lib/forward-contract";

const m = (contract_id: string, marked_on: string, pnl_inr: number) => ({ contract_id, marked_on, pnl_inr, current_forward: 0, spot: 0, matured: false, proxy: false });

describe("saved hedge book", () => {
  it("sums each day's marks across contracts", () => {
    expect(bookHistory([m("a", "2026-11-22", 100), m("b", "2026-11-22", -40)])).toEqual([{ date: "2026-11-22", pnlInr: 60, contracts: 2 }]);
  });
  it("carries a contract's last mark forward over a missed day", () => {
    const h = bookHistory([m("a", "2026-11-22", 100), m("b", "2026-11-22", 10), m("b", "2026-11-23", 30)]);
    expect(h[1]).toEqual({ date: "2026-11-23", pnlInr: 130, contracts: 2 });
  });
  it("marks a contract only from its trade date through its maturity date", () => {
    const c = { tradeDate: "2026-11-22", maturityDate: "2027-02-21" };
    expect(needsMark(c, "2026-11-21")).toBe(false);
    expect(needsMark(c, "2027-02-21")).toBe(true);
    expect(needsMark(c, "2027-02-22")).toBe(false);
  });
  it("rejects a saved forward longer than three years", () => {
    const base = { code: "USD", side: "buy", notional: 1e6, tradeDate: "2026-11-22", maturityDate: "2030-01-01", marginBp: 0, rate: 93, fairAtTrade: 93, spotAtTrade: 92, rateOverridden: false };
    expect(saveForwardSchema.safeParse(base).success).toBe(false);
  });
  it("values against spot as a labelled proxy when a policy rate is missing", () => {
    const c: ForwardContract = { ref: "x", code: "USD", side: "buy", notional: 1e6, tradeDate: "2026-11-22", maturityDate: "2027-02-21", marginBp: 0, rate: 92.5, fairAtTrade: 93, spotAtTrade: 92.9, rateOverridden: true, bookedAt: "" };
    const v = valueContract(c, "2026-11-22", 93.5, undefined, 3.5);
    expect(v.proxy).toBe(true);
    expect(v.pnlInr).toBe(1_000_000);
  });
});
