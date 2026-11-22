import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, CircleDashed, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFxStream } from "@/lib/fx-stream";
import { policyRates } from "@/lib/forward-pricing.functions";
import { measuredFxRisk } from "@/lib/fx-risk.functions";
import { readGlobalBenchmarks } from "@/lib/global-benchmarks.functions";
import { assessInvestmentRoute } from "@/lib/legal-services.functions";
import { integrationStatus } from "@/lib/agent-integration.functions";
import { quoteForward, addDays } from "@/lib/forward-contract";
import { appendBlock, evaluateDesks, firstBrokenBlock } from "@/lib/regulator-desk";

type Result = { ok: boolean; ms: number; detail: string };
type Check = { id: string; name: string; proves: string; to: string; search?: Record<string, string>; run: () => Promise<string> };

/** Plain-language walkthrough for a stakeholder meeting; each stop links to a working desk. */
const SCRIPT = [
  { n: "01", to: "/access", title: "Six-regulator desk", click: "Seal and run a file, then arm \"Swap the overseas bank account\".", proves: "File numbering, parallel checks, officer quorum and tamper detection in one view.", boundary: "Proposed model; not an official approval." },
  { n: "02", to: "/console", title: "Treasury console", click: "Pick a top-1,000 company, a hub and an amount.", proves: "Headroom, route triage, FEMA references and a sourced document checklist.", boundary: "Advisory triage, not a legal opinion." },
  { n: "03", to: "/intelligence", search: { view: "hedging" }, title: "Hedge desk", click: "Book a 3-month USD forward with a 40 bp margin.", proves: "Live forward pricing, profit or loss today and payoff at maturity.", boundary: "Fair-value prices, not bank quotes." },
  { n: "04", to: "/currency-risk", title: "62-hub currency risk", click: "Sort by one-year swing and add a currency to the hedge book.", proves: "Measured volatility from dated reference rates across 62 hubs.", boundary: "History, not a forecast." },
  { n: "05", to: "/agents", title: "Agent desk", click: "Ask the copilot whether an ODI fits the automatic route.", proves: "Cited AI answers with deterministic rules holding the veto.", boundary: "AI drafts; it never decides." },
  { n: "06", to: "/regulator-portal", title: "Secure regulator portal", click: "Sign in with a public showcase desk and act on a Form FC record.", proves: "Account-protected, append-only records with isolated demo desks.", boundary: "Demo records, never sent to RBI." },
] as const;

export function InvestorReadiness() {
  const tape = useFxStream();
  const [results, setResults] = useState<Record<string, Result | "running">>({});
  const [ranAt, setRanAt] = useState("");

  const checks: Check[] = [
    { id: "fx", name: "Live interbank FX feed", proves: "Rupee prices refresh every minute from a named provider.", to: "/currency-risk", run: async () => {
      const n = Object.keys(tape.anchorInrPer).length;
      if (tape.status === "loading" || n < 10) throw new Error("Feed still loading");
      return `${n} currencies · USD ₹${tape.anchorInrPer["USD"]?.toFixed(2) ?? "—"} · ${tape.source} ${tape.anchor}`;
    } },
    { id: "rates", name: "Central-bank policy rates", proves: "Forward prices use official BIS policy-rate data.", to: "/intelligence", search: { view: "hedging" }, run: async () => {
      const r = await policyRates();
      const n = Object.keys(r.rates).length;
      if (!n) throw new Error(r.error ?? "No rates");
      return `${n} currencies · India ${r.rates["INR"]?.ratePct ?? "—"}% (${r.rates["INR"]?.date ?? "n/a"})`;
    } },
    { id: "risk", name: "Measured currency risk", proves: "Volatility comes from a year of dated weekly reference rates.", to: "/currency-risk", run: async () => {
      const r = await measuredFxRisk({ data: { codes: ["USD", "GBP", "SGD", "AED", "EUR", "JPY"] } });
      const n = Object.keys(r.vols).length;
      if (!n) throw new Error("No measured series");
      return `${n} of 6 measured · USD ${(r.vols["USD"]!.vol * 100).toFixed(1)}% a year · to ${r.asOf}`;
    } },
    { id: "markets", name: "Global market indices", proves: "World benchmarks load server-side with their own timestamps.", to: "/", run: async () => {
      const r = await readGlobalBenchmarks();
      if (!r.quotes.length) throw new Error("Provider returned no quotes");
      return `${r.quotes.length} indices · ${r.source}`;
    } },
    { id: "legal", name: "FEMA route engine", proves: "A server-side rules engine classifies the route with cited findings.", to: "/architecture", run: async () => {
      const r = await assessInvestmentRoute({ data: { investment: "ODI", investor: "listed", netWorthCr: 1000, existingExposureCr: 0, proposedCr: 4500, activity: "operating", denomination: "foreign", nocRequired: false, nocAvailable: false, evidenceComplete: true } });
      return `₹4,500 cr on ₹1,000 cr net worth → ${r.route} · ${r.findings.length} cited findings`;
    } },
    { id: "forward", name: "Forward contract pricing", proves: "Contract rates combine live spot, policy rates and the bank margin.", to: "/intelligence", search: { view: "hedging" }, run: async () => {
      const r = await policyRates();
      const spot = tape.anchorInrPer["USD"], inr = r.rates["INR"]?.ratePct, usd = r.rates["USD"]?.ratePct;
      if (!spot || inr == null || usd == null) throw new Error("Spot or rates missing");
      const today = new Date().toISOString().slice(0, 10);
      const q = quoteForward({ side: "buy", notional: 1e6, tradeDate: today, maturityDate: addDays(today, 91), marginBp: 40 }, spot, inr, usd);
      if (!q) throw new Error("No quote");
      return `USD 3-month buy at 40 bp: ₹${q.rate.toFixed(2)} (spot ₹${spot.toFixed(2)})`;
    } },
    { id: "desk", name: "Six-regulator routing", proves: "Over-ceiling files go to the Approval route and need four officer signatures.", to: "/access", run: async () => {
      const a = evaluateDesks({ investment: "ODI", amountCr: 950, netWorthCr: 1000, existingCr: 0 }, []);
      const b = evaluateDesks({ investment: "ODI", amountCr: 4500, netWorthCr: 1000, existingCr: 0 }, []);
      const c = evaluateDesks({ investment: "ODI", amountCr: 950, netWorthCr: 1000, existingCr: 0 }, ["tamper"]);
      if (a.outcome !== "noted" || b.outcome !== "awaiting-signatures" || c.outcome !== "rejected-at-intake") throw new Error("Unexpected routing");
      return "₹950 cr → noted · ₹4,500 cr → signatures · tampered → rejected";
    } },
    { id: "chain", name: "Tamper-evident record", proves: "Editing any past entry is detected with SHA-256 in the browser.", to: "/security", search: { view: "rail" }, run: async () => {
      let c = await appendBlock([], { desk: "Treasury", action: "sealed", ref: "probe" });
      c = await appendBlock(c, { desk: "RBI", action: "signed", ref: "probe" });
      c = await appendBlock(c, { desk: "CBDT", action: "signed", ref: "probe" });
      const intact = await firstBrokenBlock(c);
      const forged = await firstBrokenBlock(c.map((b, i) => (i === 1 ? { ...b, action: "forged" } : b)));
      if (intact !== -1 || forged !== 1) throw new Error("Chain check failed");
      return "3 entries verified · forged entry #1 detected";
    } },
    { id: "ai", name: "AI agents connected", proves: "The agent desk's language model service is configured on the server.", to: "/agents", run: async () => {
      const r = await integrationStatus();
      if (!r.aiConfigured) throw new Error("AI service not configured");
      return `Model service configured · tracing ${r.tracingConfigured ? "on" : "off"} · licensed FX ${r.licensedFxConfigured ? "on" : "not connected"}`;
    } },
  ];

  const runAll = useCallback(async () => {
    setResults(Object.fromEntries(checks.map((c) => [c.id, "running" as const])));
    await Promise.all(checks.map(async (c) => {
      const t = performance.now();
      try {
        const detail = await c.run();
        setResults((r) => ({ ...r, [c.id]: { ok: true, ms: Math.round(performance.now() - t), detail } }));
      } catch (e) {
        setResults((r) => ({ ...r, [c.id]: { ok: false, ms: Math.round(performance.now() - t), detail: e instanceof Error ? e.message.slice(0, 140) : "Check failed" } }));
      }
    }));
    setRanAt(new Date().toLocaleTimeString("en-IN", { hour12: false }));
  }, [tape.status, tape.anchor]); // eslint-disable-line react-hooks/exhaustive-deps

  const [auto, setAuto] = useState(false);
  useEffect(() => { if (!auto && tape.status !== "loading") { setAuto(true); void runAll(); } }, [tape.status, auto, runAll]);

  const done = Object.values(results).filter((r) => r !== "running") as Result[];
  const passed = done.filter((r) => r.ok).length;

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-8" aria-labelledby="readiness-h">
      <div className="flex flex-wrap items-end justify-between gap-4 border-t-4 border-primary pt-4">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">Live readiness · run it in front of the room</p>
          <h2 id="readiness-h" className="font-display mt-2 text-4xl leading-none md:text-5xl">Nine working systems, checked now.</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Each line calls the real service or rule the prototype uses and reports the answer and how long it took. Nothing here is a recording.</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="font-display text-5xl" aria-live="polite">{done.length ? `${passed}/${checks.length}` : "—"}</p>
          <Button onClick={() => void runAll()}><Play className="mr-1 h-4 w-4" />Run again</Button>
        </div>
      </div>
      <ul className="mt-5 grid gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
        {checks.map((c) => {
          const r = results[c.id];
          return (
            <li key={c.id} className="flex min-w-0 flex-col bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{c.name}</p>
                {r === "running" || !r ? <CircleDashed className="h-5 w-5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" aria-label="Running" /> : r.ok ? <CheckCircle2 className="h-5 w-5 shrink-0" aria-label="Passed" /> : <XCircle className="h-5 w-5 shrink-0 text-primary" aria-label="Failed" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.proves}</p>
              <p className={`mt-3 min-h-8 font-mono-ui text-[11px] ${r && r !== "running" && !r.ok ? "text-primary" : ""}`}>{r && r !== "running" ? r.detail : "Checking…"}</p>
              <div className="mt-auto flex items-center justify-between pt-3 font-mono-ui text-[10px] text-muted-foreground">
                <span>{r && r !== "running" ? `${r.ms} ms` : ""}</span>
                <Link to={c.to} search={c.search as never} className="uppercase tracking-[0.14em] text-primary hover:underline">Open desk →</Link>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">{ranAt ? `Last run ${ranAt} in this browser.` : "Running…"} A failed line shows the provider's own reason; public feeds can be delayed or briefly unavailable. Passing checks show the prototype works, not that bank execution or regulator approval exists.</p>

      <div className="mt-10">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">Investor demo script · about ten minutes</p>
        <ol className="mt-3 grid gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
          {SCRIPT.map((s) => (
            <li key={s.n} className="flex flex-col bg-background p-5">
              <span className="font-mono-ui text-xs text-primary">{s.n}</span>
              <p className="mt-2 font-display text-2xl">{s.title}</p>
              <p className="mt-2 text-sm"><span className="text-muted-foreground">Click: </span>{s.click}</p>
              <p className="mt-1 text-sm"><span className="text-muted-foreground">Proves: </span>{s.proves}</p>
              <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">Boundary: {s.boundary}</p>
              <Button variant="outline" size="sm" asChild className="mt-4 justify-between rounded-none"><Link to={s.to} search={("search" in s ? s.search : undefined) as never}>Open {s.title.toLowerCase()}<ArrowUpRight /></Link></Button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
