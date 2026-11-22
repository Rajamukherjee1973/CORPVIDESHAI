import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Activity, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runCurrencyOutlook } from "@/lib/currency-outlook.functions";
import { currencyScenario } from "@/lib/currency-outlook";
import { RAIL_CURRENCIES } from "@/lib/opi-signal";
import { inrPer, useLiveFeed } from "@/lib/live-feed";
import { recordCapture } from "@/lib/fx-stream";
import { logAgentRun } from "@/lib/agent-session";
import { guestExamplesFor } from "@/lib/agent-training";
import { LearningNote, RateAnswer } from "@/components/site/AgentLearning";

type AgentResult = Extract<Awaited<ReturnType<typeof runCurrencyOutlook>>, { ok: true }>["result"];

export function CurrencyOutlookAgent({ corridorCode, compact = false }: { corridorCode: string; compact?: boolean }) {
  const feed = useLiveFeed();
  const run = useServerFn(runCurrencyOutlook);
  const [override, setOverride] = useState<string | null>(null);
  const code = override ?? corridorCode;
  const [budgetCr, setBudgetCr] = useState(50);
  const [months, setMonths] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const rate = inrPer(feed, code);
  const changed = result && (result.snapshot.code !== code || result.budgetCr !== budgetCr || result.months !== months);
  const scenario = result ? currencyScenario(result.snapshot.spot, result.answer.centralMovePct, result.budgetCr, result.answer.allocationPct, result.answer.hedgePct) : null;

  async function generate() {
    setBusy(true);
    setError("");
    setResult(null);
    const t0 = performance.now();
    try {
      const response = await run({ data: { code, budgetCr, months, examples: guestExamplesFor("currency", `${code} / INR · ${budgetCr} crore · ${months} months`) } });
      logAgentRun("outlook", performance.now() - t0, response.ok);
      if (!response.ok) { setError(response.error); return; }
      setResult(response.result);
      recordCapture("Prediction currency agent", "action", `${code} outlook generated from ${response.result.snapshot.source}`, code, budgetCr);
    } catch (e) {
      logAgentRun("outlook", performance.now() - t0, false);
      setError(e instanceof Error ? e.message : "The currency outlook could not be generated.");
    } finally { setBusy(false); }
  }

  return (
    <section aria-label="Predictive currency agent" className={compact ? "" : "mt-8 border-t-2 border-primary"}>
      <div className={`flex flex-wrap items-start justify-between gap-5 ${compact ? "pb-3" : "py-6"}`}>
        {compact ? <p className="font-mono-ui text-xs uppercase text-primary">Currency intelligence · AI-powered</p> : <div><p className="font-mono-ui text-xs uppercase text-primary">Currency intelligence · AI-powered</p><h2 className="font-display mt-2 text-3xl">An outlook. A next move. The evidence.</h2></div>}
        <div className="font-mono-ui text-right text-xs"><p className="text-primary">{rate ? `₹${rate.toFixed(4)} / ${code}` : "Provider rate unavailable"}</p><p className="mt-1 max-w-xs text-muted-foreground">{feed.source || "Connecting to provider"}</p><p className="mt-1 text-muted-foreground">{feed.stamp}</p></div>
      </div>
      <div className="grid items-end gap-4 border-y border-rule/20 py-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-muted-foreground">Currency<select aria-label="Outlook currency" className="mt-2 block h-10 w-full border border-rule/30 bg-background px-3 text-foreground" value={code} disabled={busy} onChange={(e) => setOverride(e.target.value)}>{RAIL_CURRENCIES.map((r) => <option key={r.code} value={r.code}>{r.code} · {r.name}</option>)}</select></label>
        <label className="text-xs text-muted-foreground">OPI budget · ₹ crore<input aria-label="Outlook OPI budget" className="mt-2 block h-10 w-full border border-rule/30 bg-background px-3 text-foreground" type="number" min="1" max="100000" value={budgetCr} disabled={busy} onChange={(e) => setBudgetCr(Number(e.target.value))} /></label>
        <label className="text-xs text-muted-foreground">Outlook horizon<select aria-label="Outlook horizon" className="mt-2 block h-10 w-full border border-rule/30 bg-background px-3 text-foreground" value={months} disabled={busy} onChange={(e) => setMonths(Number(e.target.value))}>{[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} months</option>)}</select></label>
        <Button onClick={() => void generate()} disabled={busy || !rate || budgetCr <= 0 || budgetCr > 100000} className="h-10 rounded-none">{busy ? <LoaderCircle className="motion-safe:animate-spin" /> : <Activity />}{busy ? "Analysing provider rate…" : "Generate currency outlook"}</Button>
      </div>
      {error && <p role="alert" className="my-5 border-l-2 border-destructive pl-4 text-sm text-destructive">{error}</p>}
      {busy && <p role="status" className="py-5 text-sm text-muted-foreground">Reviewing the rate snapshot, OPI safeguards and conditional currency scenarios.</p>}
      {result && scenario && <div aria-label="Currency agent result" className="py-6">
        {changed && <p role="status" className="mb-4 text-sm text-primary">Selections changed — this outlook still uses the previous snapshot. Generate a new outlook to update it.</p>}
        <p className="font-mono-ui text-xs text-muted-foreground">{result.snapshot.code} · {result.months}-month conditional outlook · captured {result.snapshot.capturedAt}</p>
        <h3 className="font-display mt-3 max-w-4xl text-2xl">{result.answer.outlook}</h3>
        <div className="mt-5 border-l-2 border-primary pl-4"><p className="font-mono-ui text-xs uppercase text-primary">Recommended OPI review action</p><p className="mt-2 text-base font-medium">{result.answer.action}</p></div>
        <div className="mt-6 grid gap-5 border-y border-rule/20 py-5 sm:grid-cols-2 lg:grid-cols-4">{[
          ["Captured → scenario INR/unit", `₹${result.snapshot.spot.toFixed(4)} → ₹${scenario.projectedRate.toFixed(4)}`],
          ["Proposed allocation", `₹${scenario.allocationCr.toFixed(2)} cr · ${result.answer.allocationPct.toFixed(0)}%`],
          ["Proposed hedge", `₹${scenario.hedgeCr.toFixed(2)} cr · ${result.answer.hedgePct.toFixed(0)}%`],
          ["Scenario translation after hedge", `${scenario.translationCr >= 0 ? "+" : ""}₹${scenario.translationCr.toFixed(3)} cr`],
        ].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="font-mono-ui mt-2 break-words text-sm text-primary">{value}</p></div>)}</div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2"><div><h4 className="font-mono-ui text-xs uppercase text-primary">Reasoning summary · evidence and assumptions</h4><ol className="mt-3 space-y-3">{result.answer.rationale.map((r, i) => <li key={i} className="flex gap-3 text-sm leading-relaxed"><span className="font-mono-ui text-primary">0{i + 1}</span><span>{r}</span></li>)}</ol></div><div><h4 className="font-mono-ui text-xs uppercase text-primary">Risks & review trigger</h4><ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-muted-foreground">{result.answer.risks.map((r, i) => <li key={i}>{r}</li>)}</ul><p className="mt-4 text-sm font-medium">{result.answer.reviewTrigger}</p></div></div>
        <p className="mt-5 text-xs text-muted-foreground">Evidence: {result.snapshot.source} · provider timestamp {result.snapshot.providerStamp} · {result.snapshot.tier} feed. Latest displayed provider rate: {rate ? `₹${rate.toFixed(4)}/${code}` : "unavailable"}. Generated outlooks do not refresh automatically.</p>
        <div className="mt-5 space-y-2"><LearningNote learning={result.learning} /><RateAnswer key={result.snapshot.capturedAt} agent="currency" question={`${result.snapshot.code} / INR · ${result.budgetCr} crore · ${result.months} months`} answer={`Outlook: ${result.answer.outlook}\nAction: ${result.answer.action}`} /></div>
        <Button asChild variant="outline" className="mt-4 rounded-none"><a href="/portfolio">Review OPI portfolio book <ArrowUpRight /></a></Button>
      </div>}
      <p className="pb-5 pt-4 text-xs leading-relaxed text-muted-foreground">Conditional planning scenarios, not calibrated probabilities or investment advice. Provider rates may be daily reference composites, not executable tick prices. No synthetic history or simulated ticks enter this agent. OPI requires security eligibility, headroom and AD-bank review; nothing is invested automatically. Translation excludes asset returns, fees, tax and hedge carry. AI requests use workspace credits.</p>
    </section>
  );
}