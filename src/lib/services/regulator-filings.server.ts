import { validateSecureFiling } from "@/lib/regulator-filing-schema";
import { appendFilingSnapshot, type CleanFiling, type FilingContext } from "./filing-store.server";

export async function readPortalFilings(context: FilingContext) {
  const { data: membership, error: accessError } = await context.supabase.from("filing_portal_roles").select("role, desk, public_demo").eq("user_id", context.userId).maybeSingle();
  if (accessError) throw new Error("Portal access could not be checked. Please retry.");
  if (!membership) throw new Error("This account has not been granted portal access.");
  const { data, error } = await context.supabase.from("form_fc_records").select("*").order("recorded_at", { ascending: true });
  if (error) throw new Error("The saved filings could not be loaded. Please retry.");
  const { data: actions } = membership.role === "regulator"
    ? await context.supabase.from("filing_regulator_actions").select("id, record_id, desk, action, note, created_at").order("created_at", { ascending: true })
    : { data: [] };
  return { role: membership.role, desk: membership.desk, publicDemo: membership.public_demo, records: data ?? [], actions: actions ?? [] };
}

export async function appendPortalFiling(data: CleanFiling, context: FilingContext) {
  // Preserve the existing INSERT RLS as the final access boundary for portal accounts.
  return appendFilingSnapshot(validateSecureFiling(data), context);
}
export const REGULATOR_ACTIONS = ["acknowledge", "query", "flag_risk", "condition", "clear", "escalate"] as const;
export async function appendRegulatorAction(input: { recordId: string; action: (typeof REGULATOR_ACTIONS)[number]; note: string }, context: FilingContext) {
  const { data: m } = await context.supabase.from("filing_portal_roles").select("role, desk").eq("user_id", context.userId).maybeSingle();
  if (!m || m.role !== "regulator" || !m.desk) throw new Error("Only a regulator desk can record an action.");
  const { error } = await context.supabase.from("filing_regulator_actions").insert({ record_id: input.recordId, user_id: context.userId, desk: m.desk, action: input.action, note: input.note });
  if (error) throw new Error("The action could not be recorded. Please retry.");
  return { ok: true as const };
}
