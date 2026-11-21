import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { recordRegulatorAction } from "@/lib/regulator-filings.functions";
import { ACTION_LABELS, REGULATOR_DEMO_ACCOUNTS, REGULATOR_DEMO_PASSWORD, type RegulatorActionKind } from "@/data/regulator-demo-accounts";

type Rec = { id: string; company: string; period: string; filed_on: string; authority: string };
type Act = { id: string; record_id: string; desk: string; action: string; note: string; created_at: string };

export function RegulatorDemoGuide({ onPick }: { onPick: (email: string, password: string) => void }) {
  return (
    <section aria-labelledby="demo-desks" className="mt-12">
      <div className="h-1 w-16 bg-primary" />
      <h2 id="demo-desks" className="font-display mt-4 text-3xl">Public demonstration desks</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Eight shared showcase sign-ins. Shared password <span className="font-mono-ui text-foreground">{REGULATOR_DEMO_PASSWORD}</span>.
        These desks see only each other's showcase records, never private filings. Actions are demonstrations, not RBI, AD-bank or regulator decisions.
      </p>
      <div className="mt-6 grid gap-px border border-rule/20 bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
        {REGULATOR_DEMO_ACCOUNTS.map((a, i) => (
          <button key={a.email} type="button" onClick={() => onPick(a.email, REGULATOR_DEMO_PASSWORD)}
            className="group bg-background p-4 text-left transition-colors hover:bg-primary hover:text-primary-foreground">
            <span className="font-mono-ui text-[10px] tracking-[0.18em] text-primary group-hover:text-primary-foreground">{String(i + 1).padStart(2, "0")}</span>
            <p className="font-display mt-1 text-xl">{a.desk}</p>
            <p className="font-mono-ui mt-1 break-all text-[10px] text-muted-foreground group-hover:text-primary-foreground/80">{a.email}</p>
            <p className="mt-2 text-xs text-muted-foreground group-hover:text-primary-foreground/80">{a.does}</p>
          </button>
        ))}
      </div>
      <ol className="mt-6 grid gap-px border border-rule/20 bg-rule/15 text-sm md:grid-cols-4">
        {["Treasury files a Form FC record", "AD Bank acknowledges or queries", "Six desks flag, condition or clear", "Any desk escalates to approval route"].map((s, i) => (
          <li key={s} className="bg-background p-4"><span className="font-mono-ui mr-2 text-xs text-primary">{i + 1}</span>{s}</li>
        ))}
      </ol>
    </section>
  );
}

function verdict(acts: Act[]) {
  if (acts.some((a) => a.action === "escalate")) return "Escalated · approval route";
  if (acts.some((a) => a.action === "flag_risk" || a.action === "query")) return "Open query / risk flag";
  const cleared = new Set(acts.filter((a) => a.action === "clear" || a.action === "condition").map((a) => a.desk));
  if (cleared.size) return `${cleared.size} desk${cleared.size > 1 ? "s" : ""} cleared`;
  return acts.length ? "Acknowledged" : "Awaiting review";
}

export function RegulatorDeskBoard({ desk, records, actions }: { desk: string | null; records: Rec[]; actions: Act[] }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  const canAct = !!desk && desk !== "Corporate Treasury";
  async function act(recordId: string, action: RegulatorActionKind) {
    setBusy(recordId + action); setErr("");
    try {
      await recordRegulatorAction({ data: { recordId, action, note: notes[recordId] ?? "" } });
      setNotes((n) => ({ ...n, [recordId]: "" }));
      await qc.invalidateQueries({ queryKey: ["regulator-filings"] });
    } catch (e) { setErr(e instanceof Error ? e.message : "The action could not be recorded."); }
    setBusy("");
  }
  if (!records.length) return <p className="text-sm text-muted-foreground">No records yet. Sign in as Corporate Treasury and file a Form FC record to start.</p>;
  return (
    <div className="space-y-4">
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      {[...records].reverse().map((r) => {
        const acts = actions.filter((a) => a.record_id === r.id);
        return (
          <article key={r.id} className="border border-rule/20">
            <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule/15 px-5 py-3">
              <div>
                <p className="font-display text-xl">{r.company}</p>
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{r.period} · filed {r.filed_on} · {r.authority}</p>
              </div>
              <span className="font-mono-ui bg-primary px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-primary-foreground">{verdict(acts)}</span>
            </header>
            {acts.length > 0 && (
              <ol className="divide-y divide-rule/10 px-5 py-2 text-sm">
                {acts.map((a) => (
                  <li key={a.id} className="flex flex-wrap gap-x-3 py-1.5">
                    <span className="font-mono-ui text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                    <span className="font-mono-ui text-[11px] uppercase text-primary">{a.desk}</span>
                    <span>{ACTION_LABELS[a.action as RegulatorActionKind] ?? a.action}</span>
                    {a.note && <span className="text-muted-foreground">— {a.note}</span>}
                  </li>
                ))}
              </ol>
            )}
            {canAct && (
              <div className="border-t border-rule/15 px-5 py-3">
                <input aria-label={`Note for ${r.company}`} maxLength={600} placeholder="Optional note or condition (e.g. submit valuation certificate)"
                  value={notes[r.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  className="w-full border border-input bg-background px-3 py-2 text-sm" />
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(ACTION_LABELS) as RegulatorActionKind[]).map((k) => (
                    <Button key={k} size="sm" variant={k === "clear" ? "default" : "outline"} disabled={!!busy} onClick={() => act(r.id, k)}>
                      {busy === r.id + k ? "Saving…" : ACTION_LABELS[k]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
