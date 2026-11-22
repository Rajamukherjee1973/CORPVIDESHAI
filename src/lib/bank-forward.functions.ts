import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { saveBankSheetSchema } from "@/lib/bank-forward";

/** Rate desk only: append a bank sheet. Sheets are never edited; a correction is a newer sheet. */
export const saveBankSheet = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => saveBankSheetSchema.parse(input)).handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: member } = await context.supabase.from("bank_quote_desk_members").select("user_id").eq("user_id", context.userId).maybeSingle();
    if (!member) throw new Error("This account isn't on the rate desk, so it can't enter bank rates.");
    const { data: row, error } = await context.supabase.from("bank_forward_sheets").insert({
      bank_name: data.bankName, quote_date: data.quoteDate, spot_date: data.spotDate, spot_bid: data.spotBid, spot_ask: data.spotAsk,
      points: data.points, note: data.note, entered_by: context.userId,
    }).select("id").single();
    if (error || !row) throw new Error("The rate sheet could not be saved. Please retry.");
    return { id: row.id };
  });
