import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Download, Loader2, ShieldCheck, Scale, Network, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rule } from "./Frame";
import { assessInvestmentRoute } from "@/lib/legal-services.functions";
import { SERVICE_CATALOG, type LegalCase } from "@/lib/services/contracts";
import { LEGAL_SOURCES } from "@/lib/services/legal-sources";

const initial: LegalCase = { investment: "ODI", investor: "listed", netWorthCr: 1000, existingExposureCr: 1500, proposedCr: 475, activity: "operating", denomination: "foreign", nocRequired: false, nocAvailable: false, evidenceComplete: true };
function Choice({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-sm"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></label>;
}

export function LegalArchitecture() {
  const [input, setInput] = useState<LegalCase>(initial);
  const assess = useServerFn(assessInvestmentRoute);
  const mutation = useMutation({ mutationFn: (data: LegalCase) => assess({ data }) });
  const update = <K extends keyof LegalCase>(key: K, value: LegalCase[K]) => { setInput((c) => ({ ...c, [key]: value })); mutation.reset(); };
  const result = mutation.data;
  const exportResult = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ inputs: input, assessment: result, sources: LEGAL_SOURCES, currentLawVerified: false }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `CorpVidesh-legal-${result.traceId}.json`; a.click(); URL.revokeObjectURL(url);
  };
  return <>
    <section className="border-y border-rule bg-secondary py-10">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {[{ icon: Network, title: "Decoupled by contract", text: "Four bounded service domains; validated request contracts, separate policy logic and server-only execution." }, { icon: Scale, title: "Law before automation", text: "Investor eligibility, instrument classification, INR distinctions and statutory evidence precede route selection." }, { icon: ShieldCheck, title: "Authority stays explicit", text: "Company-scoped filings and private agent outcomes. Official regulator approval and bank execution remain unconnected." }].map((item) => <div key={item.title} className="border-l-2 border-primary pl-5"><item.icon className="mb-4 size-6 text-primary" /><h2 className="font-display text-2xl tracking-normal">{item.title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p></div>)}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1400px] px-6 py-14">
      <Rule label="01 / Service topology" />
      <div className="flex flex-wrap items-center gap-3 border-b border-rule pb-6 text-sm"><span className="font-mono-ui text-primary">Treasury / regulator desk</span><ArrowRight className="size-4" /><span>Validated server functions</span><ArrowRight className="size-4" /><span>Bounded domain services</span><ArrowRight className="size-4" /><span>Cloud evidence / providers</span></div>
      <div className="grid gap-x-8 md:grid-cols-2">{SERVICE_CATALOG.map((service, i) => <article key={service.id} className="border-b border-rule/20 py-7"><div className="flex items-start justify-between gap-4"><h3 className="font-display text-3xl tracking-normal">{String(i + 1).padStart(2, "0")} / {service.name}</h3><span className="font-mono-ui text-xs text-primary">{service.contract}</span></div><p className="mt-4 text-sm">{service.boundary}</p><dl className="mt-4 grid gap-2 text-sm"><div><dt className="inline font-semibold">Running: </dt><dd className="inline text-muted-foreground">{service.runtime}</dd></div><div><dt className="inline font-semibold">Scale design: </dt><dd className="inline text-muted-foreground">{service.scale}</dd></div><div><dt className="inline font-semibold">CI gate: </dt><dd className="inline text-muted-foreground">Independent deterministic test job; no paid model calls.</dd></div></dl></article>)}</div>
      <p className="mt-5 max-w-4xl text-sm leading-relaxed text-muted-foreground">Deployment reality: these domains run within one application deployment. Independent service CI is configured; separate microservice hosting, queues, autoscaling guarantees and load-test certification are not provisioned. Splitting deployment requires infrastructure and service-to-service identity, not just a diagram.</p>
    </section>

    <section className="border-y border-rule bg-secondary py-14">
      <div className="mx-auto max-w-[1400px] px-6">
        <Rule label="02 / Statutory route assessment" />
        <div className="grid gap-10 lg:grid-cols-2">
          <div><h2 className="font-display text-4xl tracking-normal">A route is a legal conclusion.<br /><span className="text-primary">Not a switch.</span></h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">Non-persisted advisory triage under the 2022 overseas investment framework. No company identity or confidential documents are collected here. Current amendments, complete permissions and actual filing dates require counsel / AD-bank verification.</p>
            <form className="mt-7 grid gap-5" onSubmit={(e) => { e.preventDefault(); mutation.mutate(input); }}>
              <fieldset disabled={mutation.isPending} className="grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2"><Choice label="Investment class" value={input.investment} options={[{ value: "ODI", label: "ODI — classification to verify" }, { value: "OPI", label: "OPI — classification to verify" }]} onChange={(v) => update("investment", v === "OPI" ? "OPI" : "ODI")} /><Choice label="Indian investor" value={input.investor} options={[{ value: "listed", label: "Listed Indian company" }, { value: "unlisted", label: "Unlisted Indian company" }]} onChange={(v) => update("investor", v === "unlisted" ? "unlisted" : "listed")} /></div>
                <div className="grid gap-4 sm:grid-cols-3">{([{ key: "netWorthCr", label: "Audited net worth (₹ cr)", min: 0.01 }, { key: "existingExposureCr", label: "Existing exposure (₹ cr)", min: 0 }, { key: "proposedCr", label: "Proposed investment (₹ cr)", min: 0.01 }] as const).map((field) => <label key={field.key} className="grid gap-2 text-sm"><span>{field.label}</span><Input type="number" required min={field.min} max={10000000} step="any" value={input[field.key]} onChange={(e) => update(field.key, Number(e.target.value))} /></label>)}</div>
                <Choice label="Foreign entity activity" value={input.activity} options={[{ value: "operating", label: "Operating non-financial business" }, { value: "real-estate", label: "Real-estate activity — definition review" }, { value: "gambling", label: "Gambling" }, { value: "inr-linked", label: "Dealing in INR-linked financial products" }, { value: "financial-services", label: "Financial services" }]} onChange={(v) => { if (v === "operating" || v === "real-estate" || v === "gambling" || v === "inr-linked" || v === "financial-services") update("activity", v); }} />
                <Choice label="Settlement denomination" value={input.denomination} options={[{ value: "foreign", label: "Foreign currency" }, { value: "INR", label: "INR — payment mode to verify" }]} onChange={(v) => update("denomination", v === "INR" ? "INR" : "foreign")} />
                {([{ key: "nocRequired", label: "NOC condition applies to this investor" }, { key: "nocAvailable", label: "Required NOC / deemed-NOC basis documented" }, { key: "evidenceComplete", label: "Required evidence pack assembled" }] as const).map((field) => <label key={field.key} className="flex items-start gap-3 text-sm"><Checkbox checked={input[field.key]} onCheckedChange={(v) => update(field.key, v === true)} /><span>{field.label}</span></label>)}
                <Button type="submit" className="justify-self-start"><FileCheck2 className="size-4" />{mutation.isPending ? <><Loader2 className="size-4 animate-spin" />Assessing</> : "Assess statutory route"}</Button>
              </fieldset>
            </form>
            {mutation.isError && <div role="alert" className="mt-4 border-l-2 border-destructive pl-4 text-sm text-destructive">{mutation.error instanceof Error ? mutation.error.message : "Assessment unavailable. Retry with the same inputs."}</div>}
          </div>
          <div aria-live="polite" className="border-t-4 border-primary pt-5">
            {!result ? <><p className="font-mono-ui text-xs text-primary">Interpretation contract / legal-route.v1</p><h3 className="mt-6 font-display text-3xl tracking-normal">Facts → rule → evidence → next action</h3><ol className="mt-6 space-y-5 text-sm">{["Classify ODI/OPI, investor, activity and control.", "Aggregate existing exposure and assess the applicable reference ceiling.", "Identify prohibitions, approvals, NOC and evidence holds.", "Separate tax, corporate authority, AML and IFSC obligations.", "Return cited findings, a trace ID and an accountable next action."].map((step, i) => <li key={step} className="flex gap-4"><span className="font-mono-ui text-primary">0{i + 1}</span>{step}</li>)}</ol></> : <><div className="flex items-start justify-between gap-4"><div><p className="font-mono-ui text-xs text-primary">Advisory outcome</p><h3 className="mt-3 font-display text-3xl tracking-normal">{result.route}</h3></div><Button variant="outline" size="icon" title="Export legal assessment JSON" aria-label="Export legal assessment JSON" onClick={exportResult}><Download className="size-4" /></Button></div><p className="mt-4 text-sm leading-relaxed">{result.nextAction}</p><div className="my-5 grid grid-cols-3 gap-3 border-y border-rule/20 py-4">{[["Reference ceiling", result.ceilingCr], ["Total exposure", result.totalExposureCr], ["Headroom", result.headroomCr]].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-mono-ui text-base">₹{Number(value).toLocaleString("en-IN")} cr</p></div>)}</div><div className="space-y-5">{result.findings.map((finding) => <article key={finding.code} className="border-l-2 border-primary pl-4"><span className="font-mono-ui text-[10px] uppercase text-primary">{finding.status}</span><h4 className="mt-1 font-semibold text-sm">{finding.title}</h4><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{finding.reasoning}</p><div className="mt-2 flex flex-wrap gap-3">{finding.sourceIds.map((id) => { const source = LEGAL_SOURCES.find((s) => s.id === id); return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline underline-offset-4">{source.title}</a> : null; })}</div></article>)}</div><details className="mt-5 border-t border-rule/20 pt-4"><summary className="cursor-pointer text-sm font-semibold">Required evidence checklist</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{result.evidence.map((e) => <li key={e}>{e}</li>)}</ul></details><p className="mt-5 break-all font-mono-ui text-[10px] text-muted-foreground">{result.version} · {result.traceId} · {result.assessedAt}</p><p className="mt-2 text-xs text-primary">{result.authority}</p></>}
          </div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1400px] px-6 py-14"><Rule label="03 / Indian statutory source register" /><p className="mb-7 max-w-4xl text-sm leading-relaxed text-muted-foreground">FEMA is the 1999 Act; the overseas investment Rules, Regulations and Directions were introduced in 2022. These are source references and bounded summaries, not a verified consolidation of every amendment as of today. Form FC, APR, OPI and FLA obligations depend on the facts; not every OPI transaction uses Form FC.</p><div className="grid gap-x-8 md:grid-cols-2">{LEGAL_SOURCES.map((source) => <article key={source.id} className="border-t border-rule/20 py-5"><a href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 text-primary"><h3 className="font-display text-2xl tracking-normal">{source.title}</h3><ArrowRight className="size-4 shrink-0" /></a><p className="mt-2 font-mono-ui text-xs">{source.provision}</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{source.use}</p></article>)}</div></section>

    <section className="border-y border-rule bg-primary text-primary-foreground"><div className="mx-auto max-w-[1400px] px-6 py-10"><p className="font-mono-ui text-xs">04 / Differentiation with evidence</p><h2 className="mt-4 font-display text-4xl tracking-normal">Indian law. Live market context.<br />One accountable decision record.</h2><p className="mt-5 max-w-3xl text-sm leading-relaxed">The differentiated proof of concept combines legal retrieval, conditional treasury scenarios, company-scoped filings and supervisor evidence. “First of its kind” is a positioning thesis, not a verified priority, patent, market exclusivity or regulatory endorsement claim. Six regulator lanes are a demonstration model, not six mandatory approving authorities.</p><div className="mt-6 flex flex-wrap gap-5 text-sm"><Link to="/agents" className="underline underline-offset-4">Statutory graph</Link><Link to="/console" className="underline underline-offset-4">Treasury legal desk</Link><Link to="/console" search={{ view: "filings" }} className="underline underline-offset-4">Corporate filings</Link><Link to="/proof" className="underline underline-offset-4">Competitive proof</Link></div></div></section>
  </>;
}