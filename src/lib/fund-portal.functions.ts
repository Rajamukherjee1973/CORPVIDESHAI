import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { canFundAct, fundEventSchema, fundProposalSchema, fundStage, type FundParty } from "./fund-portal";

async function fundAccess(client: SupabaseClient<Database>, userId: string) {
  const [fund, reviewer] = await Promise.all([
    client.from("fund_portal_roles").select("fund_name").eq("user_id", userId).maybeSingle(),
    client.from("gift_portal_roles").select("party,org_name").eq("user_id", userId).maybeSingle(),
  ]);
  if (fund.error || reviewer.error) throw new Error("Account access could not be checked. Retry shortly.");
  if (fund.data) return { party: "investor" as FundParty, org: fund.data.fund_name };
  if (reviewer.data && reviewer.data.party !== "treasury") return { party: reviewer.data.party as FundParty, org: reviewer.data.org_name };
  return null;
}

export const readFundPortal = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  const me = await fundAccess(context.supabase, context.userId);
  if (!me) return { me: null, proposals: [], events: [] };
  const { data, error } = await context.supabase.from("fund_proposals").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("Proposals could not be loaded. Please retry.");
  const proposals = data ?? [];
  if (!proposals.length) return { me, proposals, events: [] };
  const events = await context.supabase.from("fund_proposal_events").select("*").in("proposal_id", proposals.map((row) => row.id)).order("seq").limit(5000);
  if (events.error) throw new Error("Proposal history could not be loaded. Please retry.");
  const history = events.data ?? [];
  return { me, proposals: proposals.map((proposal) => ({ ...proposal, status: fundStage(history.filter((event) => event.proposal_id === proposal.id).map((event) => ({ party: event.party as FundParty, action: event.action }))) })), events: history };
});

export const submitFundProposal = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => fundProposalSchema.parse(input)).handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const me = await fundAccess(context.supabase, context.userId);
    if (me?.party !== "investor") throw new Error("An assigned fund account is required to submit proposals.");
    // The database atomically appends the initial filing entry and derives the fund name from its trusted assignment.
    const result = await context.supabase.from("fund_proposals").insert({ ...data, created_by: context.userId }).select("id,tracking_number").single();
    if (result.error || !result.data) throw new Error("Proposal could not be saved. Check your entries and retry.");
    return { id: result.data.id, trackingNumber: result.data.tracking_number, status: "awaiting_bank" as const };
  });

export const appendFundEvent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => fundEventSchema.parse(input)).handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const me = await fundAccess(context.supabase, context.userId);
    if (!me) throw new Error("This account has no fund portal access.");
    const result = await context.supabase.from("fund_proposal_events").select("party,action").eq("proposal_id", data.proposal_id).order("seq");
    if (result.error) throw new Error("Proposal could not be read.");
    if (!canFundAct(me.party, (result.data ?? []).map((row) => ({ party: row.party as FundParty, action: row.action })))) throw new Error("This proposal is not waiting on your desk. Refresh its status.");
    const allowed = me.party === "investor" ? ["resubmitted"] : me.party === "ad_bank" ? ["verified", "queried"] : me.party === "ibu" ? ["released", "queried"] : ["cleared", "queried"];
    if (!allowed.includes(data.action)) throw new Error("This action is not available to your desk.");
    const saved = await context.supabase.from("fund_proposal_events").insert({ ...data, actor: context.userId, party: me.party });
    if (saved.error) throw new Error("Entry could not be saved. Refresh before trying again.");
    return { ok: true };
  });