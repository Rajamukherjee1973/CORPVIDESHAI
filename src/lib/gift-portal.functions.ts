import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { addEventSchema, canAct, openCaseSchema, type GiftParty } from "./gift-portal";

async function partyOf(context: { supabase: any; userId: string }): Promise<{ party: GiftParty; org: string; publicDemo: boolean } | null> {
  const { data, error } = await context.supabase.from("gift_portal_roles").select("party, org_name, public_demo").eq("user_id", context.userId).maybeSingle();
  if (error) throw new Error("Portal access could not be checked. Please retry.");
  return data ? { party: data.party as GiftParty, org: data.org_name, publicDemo: data.public_demo } : null;
}

export const readGiftPortal = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const me = await partyOf(context);
  if (!me) return { me: null, cases: [], events: [] };
  const [cases, events] = await Promise.all([
    context.supabase.from("gift_cases").select("*").order("created_at", { ascending: false }).limit(100),
    context.supabase.from("gift_case_events").select("*").order("seq", { ascending: true }).limit(2000),
  ]);
  if (cases.error || events.error) throw new Error("The shared ledger could not be loaded. Please retry.");
  return { me, cases: cases.data ?? [], events: events.data ?? [] };
});

export const openGiftCase = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i) => openCaseSchema.parse(i)).handler(async ({ data, context }) => {
    const me = await partyOf(context);
    if (me?.party !== "treasury") throw new Error("Only corporate treasury accounts can open a case.");
    const { documents, ...row } = data;
    const { data: created, error } = await context.supabase.rpc("open_gift_case", { p_case: row, p_documents: documents });
    if (error || !created) throw new Error("The case could not be opened. Please retry.");
    return { id: created as string };
  });

export const addGiftEvent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i) => addEventSchema.parse(i)).handler(async ({ data, context }) => {
    const me = await partyOf(context);
    if (!me) throw new Error("This account has not been granted portal access.");
    const { data: events, error } = await context.supabase.from("gift_case_events").select("party, action").eq("case_id", data.case_id).order("seq");
    if (error) throw new Error("The case could not be read. Please retry.");
    if (!canAct(me.party, events ?? [])) throw new Error("This case is not waiting on your desk right now.");
    const allowed = me.party === "ad_bank" ? ["verified", "queried"] : me.party === "ibu" ? ["released", "queried"] : ["cleared", "queried"];
    if (!allowed.includes(data.action)) throw new Error("That action is not available to your desk.");
    const { error: insErr } = await context.supabase.from("gift_case_events").insert({
      case_id: data.case_id, party: me.party, actor: context.userId, action: data.action, note: data.note, documents: data.documents,
    });
    if (insErr) throw new Error("Your entry could not be recorded. Please retry.");
    return { ok: true };
  });
