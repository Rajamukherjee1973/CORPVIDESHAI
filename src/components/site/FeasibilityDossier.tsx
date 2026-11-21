import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rule } from "./Frame";
import { PocLab } from "./PocLab";
import { ACCEPTANCE_CRITERIA, DELIVERY_GATES, RESOURCE_PLAN, allocationBudget } from "@/lib/feasibility";

function downloadJson(name: string, content: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
const FLOWS = [
  { title: "Corporate treasury", steps: [{ title: "Forecast", to: "/intelligence", detail: "Provider rates → conditional scenarios" }, { title: "Review", to: "/console", detail: "Investment / hub → eligibility evidence" }, { title: "Assess", to: "/architecture", detail: "Validated facts → cited route findings" }, { title: "File", to: "/corporate-dashboard", detail: "Verified account + assigned company" }, { title: "Track", to: "/filings", detail: "Append-only demo record → dates / flags" }] },
  { title: "Regulator demonstration", steps: [{ title: "Identify", to: "/regulator-portal", detail: "Invited account → server role check" }, { title: "Inspect", to: "/filings", detail: "RLS-scoped register → source snapshot" }, { title: "Record", to: "/filing-submission", detail: "Officer / authority → Form FC demo" }, { title: "Audit", to: "/casefile", detail: "Simulation timeline → evidence review" }, { title: "Supervise", to: "/supervisor", detail: "Shared-record concept; no official approval" }] },
] as const;

export function FeasibilityDossier() {
  const [lines, setLines] = useState(RESOURCE_PLAN.map((line) => ({ ...line })));
  const [contingency, setContingency] = useState(15);
  const totals = allocationBudget(lines, contingency);
  const update = (index: number, key: "quantity" | "monthlyLakh" | "months", value: string) => {
    const number = Number(value); if (!Number.isFinite(number) || number < 0) return;
    setLines((current) => current.map((line, i) => i === index ? { ...line, [key]: Math.min(10000, number) } : line));
  };
  return <section className="border-y border-rule bg-secondary py-10">
    <div className="mx-auto max-w-[1400px] px-6">
      <Rule label="Proof of feasibility / evidence & delivery" />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0"><h2 className="font-display text-4xl tracking-normal sm:text-5xl">Evidence before scale.</h2><p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">Retrospective proof-of-concept acceptance baseline, recorded 26 October 2026. Measured technical checks are separated from blocked pilot criteria. The overall production gate remains open.</p></div>
        <Button size="icon" variant="outline" title="Export feasibility dossier JSON" aria-label="Export feasibility dossier JSON" onClick={() => downloadJson("CorpVidesh-Feasibility-Dossier.json", { baselineDate: "2026-10-26", criteria: ACCEPTANCE_CRITERIA, flows: FLOWS, delivery: DELIVERY_GATES, budget: { assumptions: "Illustrative INR lakh estimates; not vendor quotes", lines, contingency, ...totals }, productionApproved: false })}><Download className="size-4" /></Button>
      </div>
      <Tabs defaultValue="lab" className="mt-7">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4"><TabsTrigger value="lab">PoC lab</TabsTrigger><TabsTrigger value="validation">Validation</TabsTrigger><TabsTrigger value="maps">Flow maps</TabsTrigger><TabsTrigger value="resources">Resources</TabsTrigger></TabsList>
        <TabsContent value="lab" className="mt-6"><PocLab /></TabsContent>
        <TabsContent value="validation" className="mt-6">
          <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-rule/20 pb-4"><a href="/docs/poc-validation.json" download className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4"><Download className="size-4" />Measured service-test evidence</a><span className="text-xs text-muted-foreground">Machine-readable test report; timestamp, suite counts and assertion results. Not independent certification.</span></div>
          <div className="grid gap-x-8 md:grid-cols-2">{ACCEPTANCE_CRITERIA.map((criterion) => <article key={criterion.id} className="border-t border-rule/20 py-5"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><h3 className="min-w-0 text-base font-semibold">{criterion.id} / {criterion.name}</h3><span className="shrink-0 font-mono-ui text-[10px] uppercase text-primary">{criterion.status}</span></div><p className="mt-3 text-sm"><span className="font-semibold">Acceptance: </span>{criterion.target}</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{criterion.evidence}</p><Link to={criterion.link} className="mt-3 inline-flex items-center gap-2 text-xs text-primary">Open evidence desk <ArrowRight className="size-3" /></Link></article>)}</div>
        </TabsContent>
        <TabsContent value="maps" className="mt-6">
          {FLOWS.map((flow) => <div key={flow.title} className="mb-8"><h3 className="font-display text-2xl tracking-normal">{flow.title}</h3><ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{flow.steps.map((step, i) => <li key={step.title} className="min-w-0 border-t-2 border-primary py-4"><Link to={step.to} className="flex items-center justify-between gap-2 text-sm font-semibold"><span>{i + 1}. {step.title}</span><ArrowRight className="size-4 shrink-0 text-primary" /></Link><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.detail}</p></li>)}</ol></div>)}
          <h3 className="font-display text-2xl tracking-normal">Structural blueprint</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-4">{[{ title: "Presentation", detail: "Treasury / regulator desks and validated inputs" }, { title: "Application boundary", detail: "Typed server functions; identity, membership and no-store response" }, { title: "Domain services", detail: "Legal / filings / market / agents; isolated failure handling" }, { title: "Evidence & providers", detail: "Cloud append-only records, public rates and cited corpus" }].map((node, i) => <div key={node.title} className="border-t border-rule py-4"><p className="font-mono-ui text-xs text-primary">0{i + 1}</p><h4 className="mt-2 text-sm font-semibold">{node.title}</h4><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{node.detail}</p></div>)}</div>
          <p className="mt-4 border-l-2 border-primary pl-4 text-sm text-muted-foreground">One deployment, four bounded domains. Official bank/regulator execution remains outside the boundary. Private records require verified accounts; arrows describe handoffs, not unconditional permissions.</p>
        </TabsContent>
        <TabsContent value="resources" className="mt-6">
          <div className="grid gap-5 md:grid-cols-3">{[["Base allocation", totals.subtotalLakh], ["Contingency", totals.contingencyLakh], ["Planned total", totals.totalLakh]].map(([label, value]) => <div key={label} className="border-t-2 border-primary py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-display text-4xl tracking-normal text-primary">₹{Number(value).toFixed(2)} lakh</p></div>)}</div>
          <p className="my-4 max-w-4xl text-sm leading-relaxed text-muted-foreground">Illustrative six-month planning assumptions, not quotes or an approved budget. INR lakh amounts exclude GST, Bloomberg/LSEG licensing, bank integration charges, travel and production compliance costs; those require quotations. Initial defaults are editable and are not saved between visits.</p>
          <div className="mb-4 flex items-center gap-4"><label className="flex items-center gap-3 text-sm">Contingency %<Input aria-label="Contingency percent" type="number" min={0} max={100} value={contingency} className="w-24" onChange={(e) => { const value = Number(e.target.value); if (Number.isFinite(value)) setContingency(Math.min(100, Math.max(0, value))); }} /></label><Button variant="outline" size="icon" title="Reset resource assumptions" aria-label="Reset resource assumptions" onClick={() => { setLines(RESOURCE_PLAN.map((line) => ({ ...line }))); setContingency(15); }}><RotateCcw className="size-4" /></Button></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-y border-rule text-left"><th className="py-3">Resource / allocation</th><th>Count</th><th>Rate / ₹ lakh</th><th>Months / units</th><th className="text-right">Total / ₹ lakh</th></tr></thead><tbody>{lines.map((line, i) => <tr key={line.id} className="border-b border-rule/20"><td className="max-w-sm py-4 pr-5"><p className="font-semibold">{line.item}</p><p className="mt-1 text-xs text-muted-foreground">{line.category} · {line.purpose}</p></td>{(["quantity", "monthlyLakh", "months"] as const).map((key) => <td key={key} className="pr-4"><Input aria-label={`${line.item} ${key}`} className="w-24" type="number" min={0} step="any" value={line[key]} onChange={(e) => update(i, key, e.target.value)} /></td>)}<td className="text-right font-mono-ui">{(line.quantity * line.monthlyLakh * line.months).toFixed(2)}</td></tr>)}</tbody></table></div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">{DELIVERY_GATES.map((gate) => <article key={gate.stage} className="border-t border-rule py-4"><p className="font-mono-ui text-xs text-primary">{gate.timing}</p><h3 className="mt-2 font-display text-2xl tracking-normal">{gate.stage}</h3><p className="mt-2 text-xs font-semibold">{gate.owner}</p><p className="mt-3 text-sm text-muted-foreground">{gate.deliverable}</p><p className="mt-3 text-xs"><span className="font-semibold">Exit gate: </span>{gate.exit}</p></article>)}</div>
          <p className="mt-5 text-sm text-muted-foreground">Software stack: TanStack Start / React, Lovable Cloud storage and authentication, existing AI Gateway and LangGraph, Vitest and repository CI. Materials: source documents, verified entity data, test devices and signed integration agreements; no custom hardware is assumed.</p>
        </TabsContent>
      </Tabs>
    </div>
  </section>;
}