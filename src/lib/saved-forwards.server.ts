/** Server-only daily marking of saved forwards from live spot and BIS policy rates. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { valueContract } from "@/lib/forward-contract";
import { needsMark, rowToContract, type HedgeRow } from "@/lib/saved-forwards";

/**
 * Writes (or refreshes) today's mark for each contract that is live today.
 * Callers pass rows they are entitled to: the owner's RLS-scoped rows or, for
 * the scheduled job, every live contract. Writes use the service client
 * because marks are server-computed and read-only to owners.
 */
export async function markHedgeRows(admin: SupabaseClient<Database>, rows: HedgeRow[], today = new Date().toISOString().slice(0, 10)) {
  const live = rows.map(rowToContract).filter((c) => needsMark(c, today));
  if (!live.length) return { marked: 0, skipped: 0, source: "" };
  const [{ getRates }, { readPolicyRates }] = await Promise.all([import("@/lib/fx-sources"), import("@/lib/services/policy-rates.server")]);
  const [fx, policy] = await Promise.all([getRates(), readPolicyRates()]);
  const usd = fx?.payload.rates["INR"];
  if (!fx || !usd) return { marked: 0, skipped: live.length, source: "no live feed" };
  const owner = new Map(rows.map((r) => [r.id, (r as HedgeRow & { user_id?: string }).user_id]));
  const source = `${fx.payload.source} · ${policy.source}`;
  const marks = live.flatMap((c) => {
    const perUsd = fx.payload.rates[c.code];
    const user = owner.get(c.id);
    if (!perUsd || !user) return [];
    const spot = usd / perUsd;
    const v = valueContract(c, today, spot, policy.rates["INR"]?.ratePct, policy.rates[c.code]?.ratePct);
    return [{ contract_id: c.id, user_id: user, marked_on: today, spot, current_forward: v.currentForward, pnl_inr: Math.round(v.pnlInr), matured: v.matured, proxy: v.proxy, source }];
  });
  if (marks.length) {
    const { error } = await admin.from("hedge_contract_marks").upsert(marks, { onConflict: "contract_id,marked_on" });
    if (error) throw new Error(`marks: ${error.message}`);
  }
  return { marked: marks.length, skipped: live.length - marks.length, source };
}
