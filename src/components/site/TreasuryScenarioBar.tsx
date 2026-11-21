import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyPicker } from "./CompanyPicker";
import { findHub } from "@/data/hub-catalog";
import { HubOptions } from "./HubOptions";
import { ODI_PURPOSES, OPI_PURPOSES, findPurpose } from "@/data/purposes";
import { findListed } from "@/data/listed";
import { useTreasuryFocus } from "@/lib/treasury-focus";
import { useTreasuryScenario, scenarioAmounts, scenarioCurrency, DEMO_REVIEWERS, demoReviewStatus } from "@/lib/treasury-scenario";
import { useFxStream } from "@/lib/fx-stream";

const DOCUMENT_ROUTES = ["/architecture", "/investors", "/decks", "/ssl", "/security", "/proof"];
const selectClass = "mt-1 h-10 w-full min-w-0 border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-primary";

/** Document and console pages carry their own scenario controls, so the shared strip hides there. */
export function scenarioBarVisible(path: string): boolean {
  return !(DOCUMENT_ROUTES.includes(path) || path === "/console" || path === "/corporate-dashboard");
}

export function ScenarioSummary() {
  const [name] = useTreasuryFocus();
  const [scenario] = useTreasuryScenario();
  return <>{name} → {scenario.hub} · ₹{scenario.amountCr.toLocaleString("en-IN")} cr · {scenario.purpose.startsWith("OPI") ? "OPI" : "ODI"}</>;
}

/** Expanded scenario controls, shown full width under the context strip. */
export function ScenarioPanel() {
  const [name, setName] = useTreasuryFocus();
  const [scenario, setScenario] = useTreasuryScenario();
  const [elapsed, setElapsed] = useState(-1);
  const company = findListed(name);
  const hub = findHub(scenario.hub);
  const purpose = findPurpose(scenario.purpose);
  const currency = scenarioCurrency(scenario);
  const fx = useFxStream();
  const rate = currency ? fx.inrPer[currency] : undefined;
  const amounts = scenarioAmounts(scenario.amountCr, rate);
  useEffect(() => { setElapsed(-1); }, [name, scenario.hub, scenario.purpose, scenario.amountCr]);
  useEffect(() => {
    if (elapsed < 0 || elapsed >= 4000) return;
    const id = setTimeout(() => setElapsed((e) => e + 100), 100);
    return () => clearTimeout(id);
  }, [elapsed]);
  return (
    <section aria-label="Connected treasury scenario" id="treasury-scenario-controls" className="border-t-2 border-primary pb-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.4fr_0.7fr]">
            <div className="min-w-0"><span className="font-mono-ui text-[10px] text-primary">01 / COMPANY & SECTOR</span><div className="mt-1"><CompanyPicker value={name} onChange={setName} /></div></div>
            <label className="min-w-0 font-mono-ui text-[10px] text-primary">02 / DESTINATION HUB
              <select aria-label="Scenario hub" className={selectClass} value={scenario.hub} onChange={(e) => setScenario({ hub: e.target.value })}><HubOptions /></select>
            </label>
            <label className="min-w-0 font-mono-ui text-[10px] text-primary">03 / INVESTMENT PURPOSE
              <select aria-label="Scenario purpose" className={selectClass} value={scenario.purpose} onChange={(e) => setScenario({ purpose: e.target.value })}>
                <optgroup label="ODI · strategic investment scenarios">{ODI_PURPOSES.map((p) => <option value={p.code} key={p.code}>{p.code} · {p.label}</option>)}</optgroup>
                <optgroup label="OPI · portfolio investment scenarios">{OPI_PURPOSES.map((p) => <option value={p.code} key={p.code}>{p.code} · {p.label}</option>)}</optgroup>
              </select>
            </label>
            <label className="min-w-0 font-mono-ui text-[10px] text-primary">04 / INR CRORE
              <input aria-label="Scenario amount INR crore" type="number" min="0.01" step="0.01" className={selectClass} value={scenario.amountCr} onChange={(e) => setScenario({ amountCr: Number(e.target.value) })} />
            </label>
          </div>
          <div className="mt-3 grid gap-px border-y border-border bg-border sm:grid-cols-4">
            {[["Sector / exchange", company ? `${company.sector} · ${company.exchange}` : "Not matched"], ["Foreign amount · indicative", amounts.foreignAmount ? `${currency} ${(amounts.foreignAmount / 1e6).toLocaleString("en-IN", { maximumFractionDigits: 2 })}m` : "Rate unavailable"], ["1% adverse FX cost", `₹${amounts.adverseFxCostCr.toLocaleString("en-IN")} cr`], ["Balance-sheet basis", company?.balanceSheet ? "Filed FY26 input" : "Illustrative input"]].map(([label, value]) => <div key={label} className="min-w-0 bg-background p-3"><div className="font-mono-ui text-[9px] text-muted-foreground">{label}</div><div className="mt-1 break-words font-display text-lg">{value}</div></div>)}
          </div>
          <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2"><p><span className="font-semibold text-primary">Investment rationale / </span>{purpose?.plain}</p><p><span className="font-semibold text-primary">Hub context / </span>{hub?.country} · {hub?.treaty}. Treaty eligibility and investment classification require transaction-specific verification.</p></div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm" className="rounded-none" disabled={elapsed >= 0 && elapsed < 4000} onClick={() => setElapsed(0)}><Play />{elapsed < 0 ? "Simulate six responses" : elapsed < 4000 ? "Reviewing demo packet…" : "Run again"}</Button>
            <Button variant="ghost" size="icon" title="Reset simulated responses" aria-label="Reset simulated responses" onClick={() => setElapsed(-1)}><RotateCcw /></Button>
            <Button variant="link" size="sm" asChild><Link to="/evidence" search={{ view: "company" }}>Case timeline<ArrowRight /></Link></Button>
            <Button variant="link" size="sm" asChild><Link to="/gift-portal">Open secure GIFT portal<ArrowRight /></Link></Button>
          </div>
          {elapsed >= 0 && <div aria-live="polite" className="mt-3 grid gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">{DEMO_REVIEWERS.map((r, i) => <div key={r.code} className="min-w-0 bg-background p-3"><div className="flex items-center justify-between"><span className="font-display text-lg">{r.code}</span><span className={`h-2 w-2 ${demoReviewStatus(elapsed, i) === "Response ready" ? "bg-primary" : "animate-pulse bg-muted-foreground"}`} /></div><p className="mt-1 text-xs text-primary">{demoReviewStatus(elapsed, i)} · demo</p><p className="mt-1 text-[11px]">{r.lens}</p><p className="mt-2 text-[10px] text-muted-foreground">{r.evidence}</p></div>)}</div>}
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">1,000-entry demonstration universe, not a verified exchange ranking; entries 501–1,000 are generated examples. Proposals are hypothetical, not actual corporate transfers. FX uses {fx.source || "indicative fallback"} · {fx.anchor || "awaiting observation"}, with simulated ticks between observations. Responses are local simulations, not filings, approval or regulatory service times; MoF, DPIIT and CBDT do not form a universal ODI approval quorum. Secure records still require assigned account access.</p>
    </section>
  );
}