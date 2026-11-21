import { describe, expect, it } from "vitest";
import { canFundAct, FUND_REGULATORS, fundProposalSchema, fundStage, type FundEvent } from "./fund-portal";

describe("Fund portal mirrors the treasury GIFT demo workflow", () => {
  const filed: FundEvent[] = [{ party: "investor", action: "filed" }];
  const bank: FundEvent[] = [...filed, { party: "ad_bank", action: "verified" }];
  it("gives each newly filed proposal the awaiting-bank status", () => {
    expect(fundStage(filed)).toBe("awaiting_bank");
  });
  it("requires AD verification before regulator review", () => {
    expect(canFundAct("rbi", filed)).toBe(false);
    expect(canFundAct("ad_bank", filed)).toBe(true);
    expect(fundStage(bank)).toBe("with_regulators");
  });
  it("requires all six demo reviewers before GIFT release", () => {
    const cleared: FundEvent[] = [...bank, ...FUND_REGULATORS.map((party) => ({ party, action: "cleared" }))];
    expect(canFundAct("ibu", cleared.slice(0, -1))).toBe(false);
    expect(canFundAct("ibu", cleared)).toBe(true);
    expect(fundStage([...cleared, { party: "ibu", action: "released" }])).toBe("released");
  });
  it("requires investor response and a new bank review after a query", () => {
    const query: FundEvent[] = [...bank, { party: "rbi", action: "queried" }];
    expect(canFundAct("investor", query)).toBe(true);
    expect(canFundAct("ad_bank", query)).toBe(false);
    const response: FundEvent[] = [...query, { party: "investor", action: "resubmitted" }];
    expect(fundStage(response)).toBe("awaiting_bank");
    expect(canFundAct("rbi", response)).toBe(false);
  });
  it("rejects blank proposals and negative commitments", () => {
    expect(fundProposalSchema.safeParse({ title: "", amount_crore: -10 }).success).toBe(false);
  });
});