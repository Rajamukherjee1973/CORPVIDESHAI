/**
 * Saved hedge book: shared types, input validation and history aggregation for
 * forwards stored against a signed-in account. Values are indicative fair-value
 * marks from live spot and official policy rates, never bank quotes or trades.
 */
import { z } from "zod";
import { MAX_TENOR_DAYS, daysBetween, type ForwardContract } from "@/lib/forward-contract";

export const saveForwardSchema = z.object({
  code: z.string().regex(/^[A-Z]{3}$/),
  side: z.enum(["buy", "sell"]),
  notional: z.number().positive().max(1e12),
  tradeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  marginBp: z.number().min(0).max(1000),
  rate: z.number().positive().max(1e6),
  fairAtTrade: z.number().positive().max(1e6),
  spotAtTrade: z.number().positive().max(1e6),
  rateOverridden: z.boolean(),
}).refine((v) => { const d = daysBetween(v.tradeDate, v.maturityDate); return d >= 1 && d <= MAX_TENOR_DAYS; }, "Maturity must be 1 day to 3 years after the trade date.");
export type SaveForwardInput = z.infer<typeof saveForwardSchema>;

export type HedgeRow = {
  id: string; ref: string; code: string; side: string; notional: number; trade_date: string; maturity_date: string;
  margin_bp: number; rate: number; fair_at_trade: number; spot_at_trade: number; rate_overridden: boolean; booked_at: string;
};
export type HedgeMark = { contract_id: string; marked_on: string; pnl_inr: number; current_forward: number; spot: number; matured: boolean; proxy: boolean };

export type SavedContract = ForwardContract & { id: string };

export function rowToContract(r: HedgeRow): SavedContract {
  return {
    id: r.id, ref: r.ref, code: r.code, side: r.side === "sell" ? "sell" : "buy", notional: Number(r.notional),
    tradeDate: r.trade_date, maturityDate: r.maturity_date, marginBp: Number(r.margin_bp), rate: Number(r.rate),
    fairAtTrade: Number(r.fair_at_trade), spotAtTrade: Number(r.spot_at_trade), rateOverridden: r.rate_overridden, bookedAt: r.booked_at,
  };
}

/**
 * Book-level profit/loss per day. A contract with no mark on a given date
 * carries its last known mark forward (from its first mark onwards), so the
 * total never drops just because a day was missed.
 */
export function bookHistory(marks: HedgeMark[]): { date: string; pnlInr: number; contracts: number }[] {
  const dates = [...new Set(marks.map((m) => m.marked_on))].sort();
  const byContract = new Map<string, Map<string, number>>();
  for (const m of marks) {
    if (!byContract.has(m.contract_id)) byContract.set(m.contract_id, new Map());
    byContract.get(m.contract_id)!.set(m.marked_on, Number(m.pnl_inr));
  }
  const last = new Map<string, number>();
  return dates.map((date) => {
    for (const [id, series] of byContract) { const v = series.get(date); if (v != null) last.set(id, v); }
    let pnlInr = 0;
    for (const v of last.values()) pnlInr += v;
    return { date, pnlInr, contracts: last.size };
  });
}

/** Which contracts still need a mark today: started, and not past maturity. */
export const needsMark = (c: Pick<ForwardContract, "tradeDate" | "maturityDate">, today: string) => c.tradeDate <= today && today <= c.maturityDate;
