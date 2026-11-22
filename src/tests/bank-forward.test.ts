import { describe, expect, it } from "vitest";
import { bankForwardFor, latestSheet, parsePastedTenors, saveBankSheetSchema, sheetFromRow, sheetIsCurrent, type BankSheetRow } from "@/lib/bank-forward";
import { quoteForward, valueContract, type ForwardContract } from "@/lib/forward-contract";
import { hedgeCarry } from "@/lib/forward-pricing";
import { curveFromRows } from "@/lib/fbil-forward";

const row = (over: Partial<BankSheetRow> = {}): BankSheetRow => ({
  id: "s1", bank_name: "Example AD Bank", quote_date: "2026-11-23", spot_date: "2026-11-25", spot_bid: "92.80", spot_ask: "92.90", note: "", created_at: "2026-11-23T05:00:00Z",
  points: [
    { tenor: "1M", settlementDate: "2026-12-25", bid: 93.10, ask: 93.22 },
    { tenor: "3M", settlementDate: "2027-02-25", bid: 93.70, ask: 93.86 },
    { tenor: "6M", settlementDate: "2027-05-25", bid: 94.40, ask: 94.60 },
  ],
  ...over,
});
const sheet = sheetFromRow(row())!;
const terms = { side: "buy" as const, notional: 1_000_000, tradeDate: "2026-11-25", maturityDate: "2027-02-25", marginBp: 40 };

describe("bank forward rate sheet", () => {
  it("reproduces the bank's own 3M rates when live spot equals the sheet's spot mid", () => {
    const q = bankForwardFor(sheet, 92.85, 92)!;
    expect(q.bid).toBeCloseTo(93.70, 6);
    expect(q.ask).toBeCloseTo(93.86, 6);
  });

  it("moves the bank's rates in proportion to live spot", () => {
    const q = bankForwardFor(sheet, 92.85 * 1.01, 92)!;
    expect(q.ask).toBeCloseTo(93.86 * 1.01, 6);
  });

  it("a company buying dollars pays the bank's sell rate, with no extra margin added", () => {
    const q = quoteForward(terms, 92.85, 5.5, 4.25, null, sheet)!;
    expect(q.basis).toBe("bank");
    expect(q.rate).toBeCloseTo(93.86, 6);
  });

  it("a company selling dollars receives the bank's buy rate", () => {
    const q = quoteForward({ ...terms, side: "sell" }, 92.85, 5.5, 4.25, null, sheet)!;
    expect(q.rate).toBeCloseTo(93.70, 6);
  });

  it("falls back to FBIL past the last quoted tenor plus 10 days", () => {
    const fbil = curveFromRows([
      { processRunDate: "2026-11-20", tenorName: "Spot", settlementDate: "2026-11-24" },
      ...[["3M", "2027-02-24", "5.1"], ["6M", "2027-05-24", "4.8"], ["12M", "2027-11-24", "4.1"]].map(([t, d, r]) => ({ processRunDate: "2026-11-20", tenorName: t, settlementDate: d, rate: r, usdInrPremiaRs: "1" })),
    ]);
    const q = quoteForward({ ...terms, maturityDate: "2027-08-25" }, 92.85, 5.5, 4.25, fbil, sheet)!;
    expect(q.basis).toBe("fbil");
  });

  it("is used for at most 4 days after its quote date", () => {
    expect(sheetIsCurrent(sheet, "2026-11-27")).toBe(true);
    expect(sheetIsCurrent(sheet, "2026-11-28")).toBe(false);
  });

  it("a corrected sheet for the same day replaces the earlier one", () => {
    const fixed = row({ id: "s2", created_at: "2026-11-23T06:00:00Z", spot_bid: "92.81" });
    expect(latestSheet([row(), fixed])!.id).toBe("s2");
    expect(latestSheet([row({ id: "old", quote_date: "2026-11-20", created_at: "2026-11-23T07:00:00Z" }), row()])!.id).toBe("s1");
  });

  it("values a saved dollar contract at the bank sheet mid", () => {
    const c: ForwardContract = { ref: "FWD-2026-USD-0001", code: "USD", side: "buy", notional: 1_000_000, tradeDate: "2026-11-25", maturityDate: "2027-02-25", marginBp: 0, rate: 93.0, fairAtTrade: 93, spotAtTrade: 92.85, rateOverridden: false, bookedAt: "" };
    const v = valueContract(c, "2026-11-25", 92.85, 5.5, 4.25, null, sheet);
    expect(v.basis).toBe("bank");
    expect(v.currentForward).toBeCloseTo((93.70 + 93.86) / 2, 6);
  });

  it("prices the hedge-cost table's dollar line at the bank's buy rate", () => {
    const r = hedgeCarry([{ code: "USD", exposureCr: 100, hedgeRatio: 1 }], { USD: 92.85 }, { INR: { ratePct: 5.5, date: "", area: "IN" }, USD: { ratePct: 4.25, date: "", area: "US" } }, 13, 0.004, 0.02, null, sheet);
    expect(r.lines[0]!.basis).toBe("bank");
    expect(r.lines[0]!.forward).toBeCloseTo(bankForwardFor(sheet, 92.85, 91)!.bid, 6);
  });

  it("rejects a sheet whose sell rate is below its buy rate", () => {
    const bad = saveBankSheetSchema.safeParse({ bankName: "Bank", quoteDate: "2026-11-23", spotDate: "2026-11-25", spotBid: 92.8, spotAsk: 92.9, points: [{ tenor: "3M", settlementDate: "2027-02-25", bid: 93.9, ask: 93.7 }] });
    expect(bad.success).toBe(false);
  });

  it("reads tenor lines pasted from the bank's email", () => {
    expect(parsePastedTenors("1M 93.10 93.22\n3 Months: 93.70 / 93.86\nnoise")).toEqual({ "1M": { bid: 93.10, ask: 93.22 }, "3M": { bid: 93.70, ask: 93.86 } });
  });
});
