import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { contractRef } from "@/lib/forward-contract";
import { saveForwardSchema, type HedgeMark, type HedgeRow } from "@/lib/saved-forwards";

const COLS = "id,user_id,ref,code,side,notional,trade_date,maturity_date,margin_bp,rate,fair_at_trade,spot_at_trade,rate_overridden,booked_at";

/** The signed-in account's saved forwards and their daily profit/loss marks; refreshes today's mark first. */
export const readHedgeBook = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  const { data, error } = await context.supabase.from("hedge_contracts").select(COLS).order("booked_at", { ascending: false }).limit(200);
  if (error) throw new Error("Your saved contracts could not be loaded. Please retry.");
  const rows = (data ?? []) as unknown as HedgeRow[];
  let markNote = "";
  if (rows.length) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { markHedgeRows } = await import("@/lib/saved-forwards.server");
      const r = await markHedgeRows(supabaseAdmin, rows);
      if (r.skipped) markNote = `${r.skipped} contract(s) could not be valued today (${r.source || "no price"}).`;
    } catch (e) {
      console.error("hedge marks", e);
      markNote = "Today's valuation could not be saved; earlier history is shown.";
    }
  }
  const marks = rows.length
    ? await context.supabase.from("hedge_contract_marks").select("contract_id,marked_on,pnl_inr,current_forward,spot,matured,proxy").in("contract_id", rows.map((r) => r.id)).order("marked_on").limit(10000)
    : { data: [], error: null };
  if (marks.error) throw new Error("Profit/loss history could not be loaded. Please retry.");
  return { rows, marks: (marks.data ?? []) as unknown as HedgeMark[], markNote, email: (context.claims as { email?: string }).email ?? "" };
});

export const saveHedgeContract = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => saveForwardSchema.parse(input)).handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const year = Number(data.tradeDate.slice(0, 4));
    const prefix = `FWD-${year}-${data.code}-`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { count, error: cErr } = await context.supabase.from("hedge_contracts").select("id", { count: "exact", head: true }).like("ref", `${prefix}%`);
      if (cErr) throw new Error("The contract could not be saved. Please retry.");
      const ref = contractRef(year, data.code, (count ?? 0) + 1 + attempt);
      const { data: row, error } = await context.supabase.from("hedge_contracts").insert({
        user_id: context.userId, ref, code: data.code, side: data.side, notional: data.notional, trade_date: data.tradeDate, maturity_date: data.maturityDate,
        margin_bp: data.marginBp, rate: data.rate, fair_at_trade: data.fairAtTrade, spot_at_trade: data.spotAtTrade, rate_overridden: data.rateOverridden,
      }).select("id,ref").single();
      if (!error && row) return row;
      if (error?.code !== "23505") throw new Error("The contract could not be saved. Please retry.");
    }
    throw new Error("The contract could not be saved. Please retry.");
  });

export const removeHedgeContract = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { error } = await context.supabase.from("hedge_contracts").delete().eq("id", data.id);
    if (error) throw new Error("The contract could not be removed. Please retry.");
    return { ok: true };
  });
