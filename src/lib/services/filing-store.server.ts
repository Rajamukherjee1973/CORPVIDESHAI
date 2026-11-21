import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { z } from "zod";
import type { secureFilingSchema } from "@/lib/regulator-filing-schema";
import RBI_ODI from "@/data/rbi-odi-aug2026.json";
import type { RbiFlow } from "@/lib/frontier";

export type FilingContext = { supabase: SupabaseClient<Database>; userId: string };
export type CleanFiling = z.infer<typeof secureFilingSchema>;

/** Both portals snapshot the same source, after their independent access checks. */
export async function appendFilingSnapshot(clean: CleanFiling, context: FilingContext) {
  let rows = RBI_ODI.rows as RbiFlow[];
  if (clean.period !== RBI_ODI.period) {
    const { data: release, error } = await context.supabase.from("rbi_odi_releases").select("rows").eq("period", clean.period).eq("status", "loaded").maybeSingle();
    if (error || !Array.isArray(release?.rows)) throw new Error("The reporting month is unavailable. Refresh and retry.");
    rows = release.rows as unknown as RbiFlow[];
  }
  const snapshot = rows.filter((row) => row.party === clean.company);
  if (!snapshot.length) throw new Error("No published ODI entries exist for this company in this month.");
  const { data: record, error } = await context.supabase.from("form_fc_records").insert({
    user_id: context.userId, company: clean.company, period: clean.period, filed_on: clean.filedOn,
    officer: clean.officer, authority: clean.authority, simulation: true,
    transfer_snapshot: snapshot as unknown as Json,
  }).select().single();
  if (error || !record) throw new Error("The filing was not saved. Your entered details are retained; please retry.");
  return record;
}