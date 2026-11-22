import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Landmark, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveBankSheet } from "@/lib/bank-forward.functions";
import { BANK_MAX_AGE_DAYS, BANK_TENORS, addMonths, bankForwardFor, parsePastedTenors, saveBankSheetSchema, sheetMid, type SaveBankSheetData } from "@/lib/bank-forward";
import { BANK_SHEETS_KEY, type BankSheetState } from "@/lib/use-bank-sheet";

const px = (v: number) => v.toFixed(4);
const field = "mt-1 block w-full border border-input bg-background px-2 py-1.5 font-mono-ui text-sm text-foreground";
type Row = { settlementDate: string; bid: string; ask: string };

function EntryForm({ today, onSaved }: { today: string; onSaved: () => void }) {
  const saveFn = useServerFn(saveBankSheet);
  const [bankName, setBankName] = useState("");
  const [quoteDate, setQuoteDate] = useState(today);
  const [spotDate, setSpotDate] = useState(today);
  const [spotBid, setSpotBid] = useState("");
  const [spotAsk, setSpotAsk] = useState("");
  const [note, setNote] = useState("");
  const [paste, setPaste] = useState("");
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => { if (today && !quoteDate) { setQuoteDate(today); setSpotDate(today); } }, [today]); // eslint-disable-line react-hooks/exhaustive-deps
  const settleFor = (t: string) => rows[t]?.settlementDate || (spotDate ? addMonths(spotDate, Number(t.replace("M", ""))) : "");
  const setRow = (t: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [t]: { settlementDate: settleFor(t), bid: "", ask: "", ...r[t], ...patch } }));

  const save = useMutation({
    mutationFn: (data: SaveBankSheetData) => saveFn({ data }),
    onSuccess: () => { setMsg("Saved. US dollar forwards now price from this sheet."); setRows({}); setPaste(""); setNote(""); onSaved(); },
    onError: (e) => setMsg(e instanceof Error ? e.message : "The rate sheet could not be saved."),
  });

  function applyPaste() {
    const got = parsePastedTenors(paste);
    const n = Object.keys(got).length;
    if (!n) { setMsg("No lines like \"3M 94.12 94.18\" were found."); return; }
    Object.entries(got).forEach(([t, v]) => setRow(t, { bid: String(v.bid), ask: String(v.ask) }));
    setMsg(`Filled ${n} tenor${n === 1 ? "" : "s"} from the pasted text — check them, then save.`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const points = BANK_TENORS.flatMap((t) => {
      const r = rows[t];
      if (!r || (!r.bid && !r.ask)) return [];
      return [{ tenor: t, settlementDate: settleFor(t), bid: Number(r.bid), ask: Number(r.ask) }];
    });
    const input = { bankName, quoteDate, spotDate, spotBid: Number(spotBid), spotAsk: Number(spotAsk), points, note };
    const v = saveBankSheetSchema.safeParse(input);
    if (!v.success) { setMsg(v.error.issues[0]?.message ?? "Please check the figures."); return; }
    save.mutate(v.data);
  }

  return (
    <form onSubmit={submit} className="space-y-3 border-t border-rule/20 bg-muted/10 px-5 py-4" aria-label="Enter today's bank rate sheet">
      <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Rate desk · enter today's sheet</div>
      <div className="grid gap-3 sm:grid-cols-5">
        <label className="text-xs text-muted-foreground sm:col-span-2">Bank<input aria-label="Bank name" required value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. your AD bank" className={field} /></label>
        <label className="text-xs text-muted-foreground">Quote date<input aria-label="Quote date" type="date" required value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className={field} /></label>
        <label className="text-xs text-muted-foreground">Spot date<input aria-label="Spot date" type="date" required value={spotDate} onChange={(e) => setSpotDate(e.target.value)} className={field} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">Spot buy<input aria-label="Spot buy rate" type="number" step="0.0001" required value={spotBid} onChange={(e) => setSpotBid(e.target.value)} className={field} /></label>
          <label className="text-xs text-muted-foreground">Spot sell<input aria-label="Spot sell rate" type="number" step="0.0001" required value={spotAsk} onChange={(e) => setSpotAsk(e.target.value)} className={field} /></label>
        </div>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-primary">Paste from the bank's email</summary>
        <textarea aria-label="Pasted bank rates" value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder={"1M 93.05 93.12\n3M 93.62 93.71\n6M 94.30 94.41"} className={`${field} font-mono-ui`} />
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={applyPaste}>Fill tenors</Button>
      </details>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground"><tr><th className="py-1 pr-2">Tenor</th><th className="py-1 pr-2">Settlement date</th><th className="py-1 pr-2">Bank buys USD (₹)</th><th className="py-1">Bank sells USD (₹)</th></tr></thead>
          <tbody>
            {BANK_TENORS.map((t) => (
              <tr key={t}>
                <td className="py-1 pr-2 font-mono-ui">{t}</td>
                <td className="py-1 pr-2"><input aria-label={`${t} settlement date`} type="date" value={settleFor(t)} onChange={(e) => setRow(t, { settlementDate: e.target.value })} className={field.replace("mt-1 ", "")} /></td>
                <td className="py-1 pr-2"><input aria-label={`${t} bank buy rate`} type="number" step="0.0001" value={rows[t]?.bid ?? ""} onChange={(e) => setRow(t, { bid: e.target.value })} className={field.replace("mt-1 ", "")} /></td>
                <td className="py-1"><input aria-label={`${t} bank sell rate`} type="number" step="0.0001" value={rows[t]?.ask ?? ""} onChange={(e) => setRow(t, { ask: e.target.value })} className={field.replace("mt-1 ", "")} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="block text-xs text-muted-foreground">Note (optional)<input aria-label="Sheet note" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 10:30 IST sheet from dealer" className={field} /></label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={save.isPending}><Save className="mr-1 h-3.5 w-3.5" />{save.isPending ? "Saving…" : "Save rate sheet"}</Button>
        <span className="text-[11px] text-muted-foreground">Leave a tenor blank to skip it. Saved sheets can't be edited — enter a corrected sheet and the newest one is used.</span>
        {msg && <p role="status" className={`w-full text-xs ${msg.startsWith("Saved") || msg.startsWith("Filled") ? "text-primary" : "text-destructive"}`}>{msg}</p>}
      </div>
    </form>
  );
}

/** The bank's daily forward rate sheet: what US dollar forwards price from when a current sheet exists. */
export function BankRateSheet({ bank, spot }: { bank: BankSheetState; spot: number | undefined }) {
  const qc = useQueryClient();
  const s = bank.latest;
  const status = bank.pending ? "Loading the bank rate sheet…"
    : bank.error ? bank.error
    : !s ? "No bank rate sheet has been entered yet, so US dollar forwards use FBIL's benchmark."
    : bank.stale ? `The latest sheet (${s.bankName}, ${s.quoteDate}) is more than ${BANK_MAX_AGE_DAYS} days old, so US dollar forwards use FBIL's benchmark until a new sheet is entered.`
    : `US dollar forwards price from ${s.bankName}'s sheet of ${s.quoteDate}, scaled to live spot. The bank's spread is its margin, so no extra margin is added.`;
  return (
    <div className="border border-rule/30" data-testid="bank-rate-sheet">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule/30 bg-muted/30 px-5 py-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Bank forward rate sheet · US dollar</div>
          <h3 className="mt-1 flex items-center gap-2 font-display text-2xl"><Landmark className="h-5 w-5 text-primary" />{bank.sheet ? `${bank.sheet.bankName} · ${bank.sheet.quoteDate}` : "Your bank's daily quotes"}</h3>
        </div>
        <p role="status" className={`max-w-lg text-xs ${bank.sheet ? "text-foreground" : "text-muted-foreground"}`}>{status}</p>
      </div>
      {s && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr><th className="p-3">Tenor</th><th className="p-3">Settles</th><th className="p-3 text-right">Bank buys USD</th><th className="p-3 text-right">Bank sells USD</th><th className="p-3 text-right">Spread</th><th className="p-3 text-right">Sell rate at live spot</th></tr>
            </thead>
            <tbody>
              <tr className="border-t border-rule/20 text-muted-foreground"><td className="p-3 font-mono-ui">Spot</td><td className="p-3 font-mono-ui text-xs">{s.spotDate}</td><td className="p-3 text-right font-mono-ui">₹{px(s.spotBid)}</td><td className="p-3 text-right font-mono-ui">₹{px(s.spotAsk)}</td><td className="p-3 text-right font-mono-ui">{((s.spotAsk - s.spotBid) * 100).toFixed(1)} p</td><td className="p-3 text-right font-mono-ui">{spot ? `₹${px(spot * (s.spotAsk / sheetMid(s)))}` : "—"}</td></tr>
              {s.points.map((p) => {
                const live = spot ? bankForwardFor(s, spot, p.days) : null;
                return (
                  <tr key={p.tenor} className="border-t border-rule/20">
                    <td className="p-3 font-mono-ui">{p.tenor}</td>
                    <td className="p-3 font-mono-ui text-xs">{p.settlementDate}<span className="block text-[10px] text-muted-foreground">{p.days} days</span></td>
                    <td className="p-3 text-right font-mono-ui">₹{px(p.bid)}</td>
                    <td className="p-3 text-right font-mono-ui">₹{px(p.ask)}</td>
                    <td className="p-3 text-right font-mono-ui">{((p.ask - p.bid) * 100).toFixed(1)} p</td>
                    <td className="p-3 text-right font-mono-ui">{live ? `₹${px(live.ask)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-rule/20 px-5 py-2 text-[11px] text-muted-foreground">Entered figures are the bank's own. The last column moves them with today's live spot by the same proportion (p = paise). {s.note ? `Note: ${s.note}` : ""}</p>
        </div>
      )}
      {bank.signedIn && bank.canEnter && <EntryForm today={bank.today} onSaved={() => { void qc.invalidateQueries({ queryKey: BANK_SHEETS_KEY }); void qc.invalidateQueries({ queryKey: ["hedge-book"] }); }} />}
      {!bank.signedIn && <p className="border-t border-rule/20 px-5 py-3 text-[11px] text-muted-foreground">Rate desk members enter the bank's sheet after signing in with "Investor sign-in" below.</p>}
      {bank.signedIn && !bank.canEnter && !bank.deskPending && <p className="border-t border-rule/20 px-5 py-3 text-[11px] text-muted-foreground">Only the rate desk can enter sheets. Ask the CorpVidesh team to add your account.</p>}
      {bank.recent.length > 1 && (
        <p className="border-t border-rule/20 px-5 py-2 text-[11px] text-muted-foreground">Earlier sheets: {bank.recent.slice(1, 6).map((r) => `${r.bankName} ${r.quoteDate}`).join(" · ")}</p>
      )}
    </div>
  );
}
