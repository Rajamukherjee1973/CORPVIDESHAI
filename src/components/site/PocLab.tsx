import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Download, FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseTestEvidence, projectPocUsage, runPocChecks, type ProofCheck, type TestEvidence } from "@/lib/poc-evaluation";

const WORKFLOWS = [
  { id: "rag", label: "Retrieval", engine: "LangChain building blocks + LangGraph control", to: "/agents", steps: ["Cited corpus", "Passages", "Embed / lexical fallback", "Rank", "Grade", "Draft + QA"], detail: "The current statutory corpus is bundled and indexed in-process, not a persistent vector database or a general uploaded-document ingestion service. Low-quality retrieval branches into query rewriting and local expansion.", outcome: "Cited draft or explicit human-review outcome" },
  { id: "agent", label: "Agent", engine: "LangGraph · branches & corrective cycles", to: "/agents", steps: ["Question + context", "Coordinate", "Retrieve", "Grade / rewrite", "Draft", "Quality veto"], detail: "Specialised graph nodes use streamed LangChain prompt–model pipelines. Read-only tools run through separate server handoffs; this is not unrestricted autonomous tool selection. Durable node-resume checkpoints are not provisioned.", outcome: "Structured packet with quality verdict and run spans" },
  { id: "memory", label: "Memory", engine: "Bounded context · shared execution boundary", to: "/intelligence", steps: ["Provider snapshot", "Conditional outlook", "Verified identity", "Private outcome", "Bounded context", "Next agent"], detail: "Device-local context is distinct from owner-scoped server outcomes. Anonymous confidential inputs are not persisted. Signed-in cross-agent save / reload still requires account-level verification.", outcome: "Conditional currency scenario, never automatic investment permission" },
  { id: "workflow", label: "Automation", engine: "Typed services · decisions & persistence", to: "/corporate-dashboard", steps: ["Verified account", "Company membership", "Validate input", "Capture source", "Append demo record", "Scoped register"], detail: "Corporate and regulator Form FC demonstrations share one snapshot/write service. Processing and approval visualisations are simulations; no bank transfer or official regulator approval is executed.", outcome: "Append-only demonstration filing, subject to account permissions" },
] as const;

export function PocLab() {
  const [checks, setChecks] = useState<ProofCheck[]>([]);
  const [evidence, setEvidence] = useState<TestEvidence | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [testedAt, setTestedAt] = useState("");
  const [usage, setUsage] = useState({ runs: 1000, input: 3000, output: 1000, inputRate: 0, outputRate: 0 });
  const projected = projectPocUsage(usage.runs, usage.input, usage.output, usage.inputRate, usage.outputRate);
  async function evaluate() {
    setBusy(true); setError(""); setEvidence(null); setChecks([]); setTestedAt("");
    try {
      setChecks(await runPocChecks()); setTestedAt(new Date().toISOString());
      const response = await fetch("/docs/poc-validation.json", { cache: "no-store" });
      if (!response.ok) throw new Error("The saved regression report could not be loaded. Local safeguard results remain available.");
      setEvidence(parseTestEvidence(await response.json()));
    } catch (e) { setError(e instanceof Error ? e.message : "Evaluation could not complete."); }
    finally { setBusy(false); }
  }
  function exportResult() {
    const blob = new Blob([JSON.stringify({ testedAt, scope: "Browser-executed pure safeguards and separately dated saved regression evidence; not live AI or hosted isolation verification", checks, regressionEvidence: evidence, usageAssumptions: usage, projectedCredits: projected, productionApproved: false }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "CorpVidesh-PoC-Evaluation.json"; a.click(); URL.revokeObjectURL(url);
  }
  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div><p className="font-mono-ui text-xs uppercase text-primary">01 / Executable proof</p><h3 className="mt-2 font-display text-3xl">Test the safeguards.</h3><p className="mt-3 max-w-2xl text-sm text-muted-foreground">Pure policy checks run now. Saved regression evidence retains its original measurement date. Neither certifies production readiness.</p></div>
      <div className="flex gap-2"><Button onClick={() => void evaluate()} disabled={busy}><span>{busy ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}</span>{busy ? "Evaluating…" : "Run PoC checks"}</Button><Button size="icon" variant="outline" disabled={!checks.length || busy} aria-label="Export PoC evaluation" title="Export PoC evaluation" onClick={exportResult}><Download className="size-4" /></Button></div>
    </div>
    {error && <p role="alert" className="border-l-2 border-destructive pl-4 text-sm text-destructive">{error}</p>}
    {checks.length > 0 && <div aria-live="polite"><div className="flex flex-wrap gap-6 border-y border-rule/25 py-4"><p className="font-mono-ui text-sm text-primary">{checks.filter((c) => c.passed).length}/{checks.length} safeguards passed</p><p className="text-xs text-muted-foreground">Run: {testedAt}</p>{evidence && <p className="text-xs text-muted-foreground">Saved regression: {evidence.tests.passed}/{evidence.tests.total} · {evidence.measuredAt}</p>}</div><div className="grid gap-x-8 md:grid-cols-2">{checks.map((check) => <article key={check.id} className="border-b border-rule/20 py-4"><h4 className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className={`size-4 shrink-0 ${check.passed ? "text-primary" : "text-destructive"}`} />{check.name}<span className="ml-auto text-xs">{check.passed ? "PASS" : "FAIL"}</span></h4><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{check.detail}</p></article>)}</div></div>}
    <div><p className="font-mono-ui text-xs uppercase text-primary">02 / Pipeline → outcome</p><Tabs defaultValue="rag" className="mt-4"><TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">{WORKFLOWS.map((w) => <TabsTrigger key={w.id} value={w.id}>{w.label}</TabsTrigger>)}</TabsList>{WORKFLOWS.map((w) => <TabsContent key={w.id} value={w.id} className="mt-5"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-display text-2xl">{w.engine}</h3><Link to={w.to} className="inline-flex items-center gap-2 text-sm text-primary">Open working desk <ArrowRight className="size-4" /></Link></div><ol className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">{w.steps.map((step, i) => <li key={step} className="border-t-2 border-primary pt-3"><p className="font-mono-ui text-xs text-primary">0{i + 1}</p><p className="mt-2 text-sm font-semibold">{step}</p></li>)}</ol><p className="mt-5 text-sm font-semibold">Outcome / {w.outcome}</p><p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted-foreground">{w.detail}</p></TabsContent>)}</Tabs></div>
    <div><p className="font-mono-ui text-xs uppercase text-primary">03 / Stage gates</p><div className="mt-4 grid gap-6 md:grid-cols-3">{[
      { name: "Prototype", status: "Available", focus: "Does the idea feel possible?", proof: "Interactive desks, input scenarios, 3D processing simulations and workflow comparisons.", gate: "Demonstrations must remain labelled, not presented as completed transfers." },
      { name: "Proof of concept", status: "Partially evidenced", focus: "Does it work on real inputs?", proof: "Provider FX observations, cited retrieval, service regression tests, quality gates and controlled cost planning.", gate: "Still open: signed-in save/read-back, multi-account isolation and representative live AI evaluations." },
      { name: "Production", status: "Not approved", focus: "Can it run reliably for users?", proof: "Security, monitoring and CI foundations exist inside a single deployment.", gate: "Still open: load SLOs, durable checkpoints, recovery drills, pilot feedback, independent assurance and authorized external integrations." },
    ].map((stage) => <article key={stage.name} className="border-t border-rule pt-4"><p className="text-xs uppercase text-primary">{stage.status}</p><h3 className="mt-2 font-display text-2xl">{stage.name}</h3><p className="mt-2 text-sm font-semibold">{stage.focus}</p><p className="mt-3 text-sm text-muted-foreground">{stage.proof}</p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{stage.gate}</p></article>)}</div></div>
    <div className="border-t border-rule/25 pt-6"><p className="font-mono-ui text-xs uppercase text-primary">04 / Model usage sensitivity</p><p className="mt-3 text-sm text-muted-foreground">Editable planning inputs, not a provider quote. Rates start at zero until supplied from the workspace model catalog. Excludes embeddings, tool calls, storage, licensing and taxes.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{([{ key: "runs", label: "Monthly runs" }, { key: "input", label: "Input tokens / run" }, { key: "output", label: "Output tokens / run" }, { key: "inputRate", label: "Input credits / million" }, { key: "outputRate", label: "Output credits / million" }] as const).map((field) => <label key={field.key} className="min-w-0 text-xs">{field.label}<Input className="mt-2" type="number" min={0} step="any" value={usage[field.key]} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0) setUsage((current) => ({ ...current, [field.key]: Math.min(n, 1e9) })); }} /></label>)}</div><p className="mt-4 text-sm font-semibold">Projected model usage: {usage.inputRate === 0 && usage.outputRate === 0 ? "Awaiting rate assumptions" : `${projected.toLocaleString(undefined, { maximumFractionDigits: 4 })} credits / month`}</p></div>
  </div>;
}