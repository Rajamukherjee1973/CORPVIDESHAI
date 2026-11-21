import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Download, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyPicker } from "./CompanyPicker";
import { HubOptions } from "./HubOptions";
import { ODI_PURPOSES, OPI_PURPOSES, findPurpose } from "@/data/purposes";
import { findListed } from "@/data/listed";
import { LEGAL_SOURCES } from "@/lib/services/legal-sources";
import { useTreasuryFocus } from "@/lib/treasury-focus";
import { SCENARIO_CURRENCIES, scenarioAmounts, scenarioCurrency, useTreasuryScenario } from "@/lib/treasury-scenario";
import { buildWorkflowChain, investmentChecklist, verifyWorkflowChain, workflowDecision, type DemoEvent } from "@/lib/treasury-workflow";
import { useFxStream } from "@/lib/fx-stream";
import { Clearance3D } from "./Clearance3D";

const input = "mt-1 h-10 w-full min-w-0 border border-input bg-background px-2 text-sm text-foreground";
type Activity = "operating" | "real-estate" | "gambling" | "inr-linked" | "financial-services";

export function TreasuryClearanceStudio() {
  const [name, setName] = useTreasuryFocus(); const [scenario, setScenario] = useTreasuryScenario(); const fx = useFxStream();
  const company = findListed(name); const purpose = findPurpose(scenario.purpose); const investment: "ODI" | "OPI" = scenario.purpose.startsWith("OPI") ? "OPI" : "ODI";
  const currency = scenarioCurrency(scenario); const rate = currency === "INR" ? 1 : fx.inrPer[currency];
  const [activity, setActivity] = useState<Activity>("operating"); const [nocRequired, setNocRequired] = useState(false); const [nocAvailable, setNocAvailable] = useState(false);
  const [checked, setChecked] = useState<string[]>([]); const [chain, setChain] = useState<DemoEvent[]>([]); const [elapsed, setElapsed] = useState(-1); const [verified, setVerified] = useState<boolean | null>(null);
  const checklist = useMemo(() => investmentChecklist(investment, nocRequired), [investment, nocRequired]);
  const facts = { investment, investor: "listed" as const, netWorthCr: company?.netWorth ?? 1, existingExposureCr: company?.used ?? 0, proposedCr: scenario.amountCr, activity, denomination: currency === "INR" ? "INR" as const : "foreign" as const, nocRequired, nocAvailable, evidenceComplete: false };
  const decision = workflowDecision(facts, checklist, checked);
  const amounts = scenarioAmounts(scenario.amountCr, rate);
  const duration = chain.at(-1)?.atSecond ?? 0;
  useEffect(() => { setChecked([]); setChain([]); setElapsed(-1); setVerified(null); }, [name, scenario.hub, scenario.purpose, scenario.amountCr, scenario.rationale, currency, activity, nocRequired, nocAvailable]);
  useEffect(() => { if (elapsed < 0 || elapsed >= duration) return; const id = setTimeout(() => setElapsed((v) => Math.min(duration, v + 5)), 80); return () => clearTimeout(id); }, [elapsed, duration]);
  async function run() { const packet = JSON.stringify({ company: company?.name, scenario: { ...scenario, currency, rationale: scenario.rationale ?? purpose?.plain ?? "" }, activity, nocRequired, nocAvailable, documents: [...checked].sort() }); const next = await buildWorkflowChain(packet, decision.handoff); setChain(next); setVerified(await verifyWorkflowChain(next)); setElapsed(0); }
  const done = chain.length > 0 && elapsed >= duration;
  function exportPacket() { const url = URL.createObjectURL(new Blob([JSON.stringify({ disclaimer: "Demonstration only — not an official filing, approval or remittance", company: company?.name, scenario: { ...scenario, currency }, decision: decision.assessment, checklist: checklist.map((c) => ({ ...c, acknowledged: checked.includes(c.id) })), chain, verified }, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "corpvidesh-clearance-demo.json"; a.click(); URL.revokeObjectURL(url); }
  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  return <section className="mx-auto max-w-[1400px] px-6 py-10">
    <div className="border-t-4 border-primary pt-5"><p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">Clearance studio · selection → evidence → six lanes</p><h2 className="font-display mt-3 text-4xl leading-none md:text-5xl">Prepare once. Watch the route handoff.</h2><p className="mt-3 max-w-3xl text-sm text-muted-foreground">Choose the company and investment, acknowledge the document pack, then run a timed, hash-linked demonstration. Results are triage and simulation only, not official compliance or approval.</p></div>
    <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1.25fr_0.75fr]">
      <div className="min-w-0 bg-background p-3 sm:col-span-2 lg:col-span-1"><span className="font-mono-ui text-[10px] text-primary">01 / TOP 1,000 COMPANY</span><CompanyPicker className="mt-1" value={name} onChange={setName} /></div>
      <label className="bg-background p-3 font-mono-ui text-[10px] text-primary">02 / HUB<select aria-label="Clearance hub" className={input} value={scenario.hub} onChange={(e) => setScenario({ hub: e.target.value, currency: undefined })}><HubOptions /></select></label>
      <label className="bg-background p-3 font-mono-ui text-[10px] text-primary">03 / CURRENCY<select aria-label="Clearance currency" className={input} value={currency} onChange={(e) => setScenario({ currency: e.target.value })}>{SCENARIO_CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="bg-background p-3 font-mono-ui text-[10px] text-primary">04 / CATEGORY & PURPOSE<select aria-label="Clearance investment purpose" className={input} value={scenario.purpose} onChange={(e) => setScenario({ purpose: e.target.value })}><optgroup label="ODI">{ODI_PURPOSES.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.label}</option>)}</optgroup><optgroup label="OPI">{OPI_PURPOSES.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.label}</option>)}</optgroup></select></label>
      <label className="bg-background p-3 font-mono-ui text-[10px] text-primary">05 / ₹ CRORE<input aria-label="Clearance amount INR crore" type="number" min="0.01" step="0.01" className={input} value={scenario.amountCr} onChange={(e) => setScenario({ amountCr: Number(e.target.value) })} /></label>
    </div>
    <div className="grid gap-px border-x border-b border-border bg-border md:grid-cols-4">{[["Sector", company ? `${company.sector} · ${company.exchange}` : "—"], ["Foreign amount", amounts.foreignAmount ? `${currency} ${(amounts.foreignAmount / 1e6).toLocaleString("en-IN", { maximumFractionDigits: 2 })}m` : "Rate unavailable"], ["Legal triage", decision.complete ? decision.assessment.route : `Documents pending · ${checked.length}/${checklist.length}`], ["Demo handoff", decision.handoff === "Approval" ? "Prior-approval referral" : "Automatic-route path"]].map(([k, v]) => <div key={k} className="bg-background p-3"><p className="font-mono-ui text-[9px] uppercase text-muted-foreground">{k}</p><p className="font-display mt-1 break-words text-xl">{v}</p></div>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="min-w-0">
        <label className="block text-sm font-medium">Reason for investment<textarea aria-label="Investment reason" maxLength={1500} className="mt-1 min-h-24 w-full border border-input bg-background p-3 text-sm" value={scenario.rationale ?? purpose?.plain ?? ""} onChange={(e) => setScenario({ rationale: e.target.value })} /></label>
        <p className="mt-1 text-xs text-muted-foreground">Category reference: {purpose?.basis}. A selected category does not establish legal eligibility.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-xs">Foreign entity activity<select aria-label="Foreign entity activity" className={input} value={activity} onChange={(e) => setActivity(e.target.value as Activity)}><option value="operating">Operating business</option><option value="financial-services">Financial services</option><option value="inr-linked">INR-linked product</option><option value="real-estate">Real estate</option><option value="gambling">Gambling</option></select></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={nocRequired} onChange={(e) => setNocRequired(e.target.checked)} />NOC condition applies</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" disabled={!nocRequired} checked={nocAvailable} onChange={(e) => setNocAvailable(e.target.checked)} />NOC evidence available</label></div>
        <div className="mt-5 border-t-2 border-primary"><div className="flex justify-between py-3"><h3 className="font-display text-2xl">Document checklist</h3><span className="font-mono-ui text-xs text-primary">{checked.length}/{checklist.length}</span></div>{checklist.map((d) => { const source = LEGAL_SOURCES.find((s) => s.id === d.source); const on = checked.includes(d.id); return <label key={d.id} className="flex cursor-pointer gap-3 border-b border-border py-3"><input className="sr-only" type="checkbox" checked={on} onChange={() => setChecked((v) => on ? v.filter((x) => x !== d.id) : [...v, d.id])} />{on ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}<span className="min-w-0"><span className="block text-sm font-medium">{d.title}</span><span className="block text-xs text-muted-foreground">{d.detail} <a className="text-primary underline" href={source?.url} target="_blank" rel="noreferrer">{source?.title}</a></span></span></label>; })}</div>
      </div>
      <div className="min-w-0 border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono-ui text-[10px] text-primary">SIX-LANE CLEARANCE SIMULATION</p><h3 className="font-display text-2xl">{company?.name ?? name} → {scenario.hub}</h3></div><Button disabled={!decision.canSimulate || (elapsed >= 0 && !done)} onClick={() => void run()}><Play />{elapsed >= 0 && !done ? `Running ${fmt(elapsed)}` : "Run timed clearance"}</Button></div>
        {!decision.complete && <p className="mt-4 border-l-2 border-primary bg-muted p-3 text-sm">Acknowledge every applicable document to unlock the simulation.</p>}
        {decision.complete && !decision.canSimulate && <p role="alert" className="mt-4 border-l-2 border-destructive p-3 text-sm">Hold / specialist review: {decision.assessment.findings.filter((f) => f.status === "hold").map((f) => f.title).join("; ")}.</p>}
        <Clearance3D chain={chain} elapsed={elapsed} />
        <ol className="mt-5 space-y-2">{(chain.length ? chain : []).map((e) => { const ready = elapsed >= e.atSecond; return <li key={e.index} className={`grid grid-cols-[4.5rem_1fr] gap-3 border p-3 transition-colors ${ready ? "border-primary bg-primary/5" : "border-border opacity-50"}`}><span className="font-mono-ui text-xs text-primary">{fmt(e.atSecond)}</span><span className="min-w-0"><span className="block text-sm font-semibold">{e.desk} · {ready ? "complete" : "queued"}</span><span className="block text-xs text-muted-foreground">{e.action}</span><span className="mt-1 block truncate font-mono-ui text-[10px]">#{e.hash.slice(0, 18)} ← {e.previousHash.slice(0, 10)}</span></span></li>; })}</ol>
        {done && <div className="mt-5 bg-primary p-4 text-primary-foreground"><p className="font-display text-2xl">{decision.handoff === "Approval" ? "Prior-approval referral assigned" : "Automatic-route handoff assigned"} · {fmt(duration)}</p><p className="mt-1 text-sm">Hash-chain integrity: {verified ? "verified" : "failed"}. This is a local demonstration—no approval, filing or remittance has occurred.</p></div>}
        <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" disabled={!chain.length} onClick={exportPacket}><Download />Export packet</Button><Button variant="outline" asChild><Link to="/gift-portal"><ShieldCheck />Secure GIFT demo portal</Link></Button><Button variant="outline" asChild><Link to="/console" search={{ view: "filings" }}>Corporate Form FC</Link></Button></div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">{decision.assessment.nextAction} MoF, DPIIT and CBDT lanes are a proposed supervisory demonstration, not a universal ODI approval quorum. Timings are illustrative, not regulatory service levels. The SHA-256 chain proves only that this browser record was not altered after generation; it is not a public blockchain or regulator consensus.</p>
      </div>
    </div>
  </section>;
}