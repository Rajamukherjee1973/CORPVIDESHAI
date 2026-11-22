/**
 * The bank forward rate sheet, readable by every visitor (public rates by the
 * owner's choice). Entry rights come from the rate desk membership row, which
 * an account can read only for itself; the save itself is enforced server-side.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { latestSheet, sheetFromRow, sheetIsCurrent, type BankSheetRow } from "@/lib/bank-forward";
import { useRegulatorAuth } from "@/lib/regulator-auth";

export const BANK_SHEETS_KEY = ["bank-forward-sheets"] as const;

async function loadSheets() {
  // Public reader returns recent sheets without the entering account's identity.
  const { data, error } = await supabase.rpc("recent_bank_forward_sheets", { _limit: 12 });
  if (error) throw new Error("The bank rate sheet could not be loaded. Please retry.");
  const rows = (data ?? []) as unknown as BankSheetRow[];
  return {
    latest: latestSheet(rows),
    recent: rows.map(sheetFromRow).filter((s) => s !== null).map((s) => ({ id: s.id, bankName: s.bankName, quoteDate: s.quoteDate, createdAt: s.createdAt })),
  };
}

export function useBankSheet() {
  const { user } = useRegulatorAuth();
  const [today, setToday] = useState("");
  useEffect(() => { setToday(new Date().toISOString().slice(0, 10)); }, []);
  const q = useQuery({ queryKey: BANK_SHEETS_KEY, queryFn: loadSheets, enabled: Boolean(today), staleTime: 5 * 60_000, retry: 1 });
  const desk = useQuery({
    queryKey: ["bank-rate-desk", user?.id ?? "none"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase.from("bank_quote_desk_members").select("user_id").eq("user_id", user!.id).maybeSingle();
      return Boolean(data);
    },
  });
  const latest = q.data?.latest ?? null;
  const current = latest && today && sheetIsCurrent(latest, today) ? latest : null;
  return {
    signedIn: Boolean(user),
    today,
    latest,
    /** The sheet to price with: only a current one. */
    sheet: current,
    stale: Boolean(latest && today && !current),
    recent: q.data?.recent ?? [],
    canEnter: desk.data ?? false,
    deskPending: Boolean(user) && desk.isPending,
    pending: !today || q.isPending,
    error: q.error ? (q.error as Error).message : "",
  };
}
export type BankSheetState = ReturnType<typeof useBankSheet>;
