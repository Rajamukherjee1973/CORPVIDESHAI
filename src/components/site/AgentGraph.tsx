import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runStatutoryGraph } from "@/lib/agents.functions";
import { type AgentRunResult } from "@/lib/agents/types";
import { AgentGraphCanvas } from "@/components/site/AgentGraphCanvas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { activeThread, buildContext, remember, recordEpisode } from "@/lib/agents/memory";
import { logAgentRun } from "@/lib/agent-session";
import { guestExamplesFor } from "@/lib/agent-training";
import { LearningNote, RateAnswer } from "@/components/site/AgentLearning";

const PRESETS: { label: string; q: string; ctx: string }[] = [
  {
    label: "SaaS subscription — royalty or FTS?",
    q: "Is an annual subscription to a US standardised AI SaaS platform chargeable as royalty or fee for technical services, and what withholding follows?",
    ctx: "Payer: listed Indian manufacturer. Vendor: Delaware Inc, TRC available, Form 10F pending. USD 480,000.",
  },
  {
    label: "ODI headroom against 400% ceiling",
    q: "How much financial commitment headroom does the entity have and does the transaction stay on the automatic route?",
    ctx: "Audited net worth INR 4,120 crore. Existing commitment INR 14,900 crore. Proposed ODI INR 475 crore into a Singapore WOS.",
  },
  {
    label: "Which remittance forms are due?",
    q: "Which parts of Form 15CA are required and is a Form 15CB accountant certificate needed for this remittance?",
    ctx: "Chargeable remittance of INR 3.2 crore to a Netherlands vendor, no lower-deduction order obtained.",
  },
  {
    label: "Approval route trigger test",
    q: "Does an investment into a FATF increased-monitoring jurisdiction fall on the approval route and who must see it?",
    ctx: "Proposed OPI of INR 210 crore, target jurisdiction under increased monitoring.",
  },
];

const FIRST = PRESETS[0] as { label: string; q: string; ctx: string };


export function AgentGraph() {
  const run = useServerFn(runStatutoryGraph);
  const [question, setQuestion] = useState(FIRST.q);
  const [context, setContext] = useState(FIRST.ctx);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [history, setHistory] = useState<AgentRunResult[]>([]);


  async function execute() {
    setBusy(true);
    setError(null);
    const t0 = performance.now();
    try {
      const r = await run({ data: { question, context: [buildContext(activeThread()), context].filter(Boolean).join("\n").slice(0, 2400), examples: guestExamplesFor("statutory", question) } });
      logAgentRun("graph", performance.now() - t0, Boolean(r.qaVerdict?.pass));
      setResult(r);
      setHistory((h) => [r, ...h].slice(0, 8));
      remember({ role: "user", text: question, at: Date.now() });
      remember({ role: "agent", text: r.answer, at: Date.now() });
      recordEpisode({ id: r.runId, at: Date.now(), question, route: r.draft?.route ?? "review", verdict: r.qaVerdict?.pass ? "passed" : "review required", latencyMs: r.totals.latencyMs, costUsd: r.totals.costUsd });
    } catch (e) {
      logAgentRun("graph", performance.now() - t0, false);
      setError(e instanceof Error ? e.message : "The graph could not complete this run.");
    } finally {
      setBusy(false);
    }
  }

  const agg = useMemo(() => {
    const runs = history.length || 1;
    const t = history.reduce(
      (a, r) => ({
        lat: a.lat + r.totals.latencyMs,
        cost: a.cost + r.totals.costUsd,
        tok: a.tok + r.totals.promptTokens + r.totals.completionTokens,
        pass: a.pass + (r.qaVerdict?.pass ? 1 : 0),
        corr: a.corr + r.spans.filter((s) => s.status === "corrective").length,
      }),
      { lat: 0, cost: 0, tok: 0, pass: 0, corr: 0 },
    );
    return {
      runs: history.length,
      avgLat: Math.round(t.lat / runs),
      cost: t.cost,
      tok: t.tok,
      passRate: history.length ? Math.round((t.pass / history.length) * 100) : 0,
      corrections: t.corr,
    };
  }, [history]);

  return (
    <div className="space-y-8">
      {/* Intake */}
      <div className="border border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Presets</p>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setQuestion(p.q);
                setContext(p.ctx);
              }}
              className={`border px-3 py-1 text-xs hover:bg-primary hover:text-primary-foreground ${question === p.q ? "border-primary text-primary" : "border-border"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <Textarea
            aria-label="Statutory question"
            className="min-h-20"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask the compliance question the desk needs settled"
          />
          <Textarea
            aria-label="Deal context"
            className="min-h-20"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Deal context — entity, net worth, amount, jurisdiction"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={execute} disabled={busy || question.trim().length < 8}>
            {busy ? "Graph running…" : "Run the agent graph"}
          </Button>
          {busy ? <span className="text-xs text-muted-foreground">Retrieving, grading and checking citations… usually about 30 seconds.</span> : null}
          {result && !busy ? (
            <span className="text-xs text-muted-foreground">
              Run {result.runId} · {(result.totals.latencyMs / 1000).toFixed(1)}s ·{" "}
              {result.totals.promptTokens + result.totals.completionTokens} tokens · $
              {result.totals.costUsd.toFixed(4)}
            </span>
          ) : null}
        </div>
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>

      <AgentGraphCanvas result={result} busy={busy} />

      {/* Trace console */}
      {result ? (
        <details className="border border-border">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground hover:text-primary">
              Trace console · {result.spans.length} steps —{" "}
              {result.tracing.enabled
                ? `LangSmith project ${result.tracing.project}`
                : "local tracing (add LANGSMITH_API_KEY to mirror to LangSmith)"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.preventDefault(); download(`${result.runId}.json`, JSON.stringify(result, null, 2)); }}
              >
                Export run JSON
              </Button>
              <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); download(`${result.runId}.csv`, toCsv(result)); }}>
                Export spans CSV
              </Button>
            </div>
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Agent</th>
                  <th className="px-4 py-2">What it did</th>
                  <th className="px-4 py-2 text-right">Latency</th>
                  <th className="px-4 py-2 text-right">Tokens</th>
                  <th className="px-4 py-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {result.spans.map((s, i) => (
                  <tr key={s.id} className="border-t border-border align-top">
                    <td className="px-4 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2">
                      {s.agent}
                      {s.status === "corrective" ? (
                        <span className="ml-2 bg-primary px-1.5 py-0.5 text-[10px] uppercase text-primary-foreground">
                          corrective
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2">
                      {s.summary}
                      {s.detail ? (
                        <span className="block text-xs text-muted-foreground">{s.detail}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{s.latencyMs} ms</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {s.promptTokens + s.completionTokens || "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {s.costUsd ? `$${s.costUsd.toFixed(5)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      {/* Output */}
      {result?.draft ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="border border-border p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Determination
            </p>
            <p className="mt-3 text-lg">{result.draft.determination}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{result.answer}</p>
            <dl className="mt-5 space-y-3 text-sm">
              <Field label="Route" value={result.draft.route} />
              <Field label="Statutory basis" value={list(result.draft.statutory_basis)} />
              <Field label="Forms" value={list(result.draft.forms)} />
              <Field label="Documents" value={list(result.draft.documents)} />
            </dl>
            <div className="mt-5 space-y-2">
              <LearningNote learning={result.learning} />
              <RateAnswer key={result.runId} agent="statutory" question={result.question} answer={`Route: ${result.draft.route}. ${result.draft.determination} Basis: ${result.draft.statutory_basis.join(", ")}. Forms: ${result.draft.forms.join(", ")}.`} />
            </div>
          </div>
          <div className="border border-border p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              QA verdict &amp; grounding
            </p>
            <p className="mt-3 text-sm">
              {result.qaVerdict?.pass ? "Passed" : "Rejected"} at{" "}
              {((result.qaVerdict?.confidence ?? 0) * 100).toFixed(0)}% confidence
              {result.qaVerdict?.issues?.length
                ? ` — ${result.qaVerdict.issues.join("; ")}`
                : " — every citation traced to a retrieved passage."}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Retrieval graded {result.retrieval.grade} · {result.retrieval.rewrites} rewrite(s) ·
              external {result.retrieval.usedExternal ? "used" : "not needed"}
            </p>
            <ul className="mt-4 space-y-3">
              {result.retrieval.chunks.slice(0, 4).map((c) => (
                <li key={c.id} className="border-l-2 border-primary pl-3 text-sm">
                  <span className="block font-medium">{c.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.source} · relevance {c.score} · {c.origin}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Evaluation panel */}
      {history.length ? (
        <div className="grid gap-4 border border-border p-6 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Runs traced" value={String(agg.runs)} />
          <Metric label="Avg latency" value={`${(agg.avgLat / 1000).toFixed(1)}s`} />
          <Metric label="Tokens" value={agg.tok.toLocaleString("en-IN")} />
          <Metric label="Spend" value={`$${agg.cost.toFixed(4)}`} />
          <Metric label="QA pass rate" value={`${agg.passRate}%`} />
          <Metric label="Corrective hops" value={String(agg.corrections)} />
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}

function list(v: unknown): string {
  return Array.isArray(v) ? v.map((x) => String(x)).join(" · ") : String(v ?? "—");
}

function toCsv(r: AgentRunResult): string {
  const head = "run,node,agent,status,latency_ms,prompt_tokens,completion_tokens,cost_usd,summary";
  const rows = r.spans.map((s) =>
    [
      r.runId,
      s.node,
      s.agent,
      s.status,
      s.latencyMs,
      s.promptTokens,
      s.completionTokens,
      s.costUsd,
      `"${s.summary.replace(/"/g, "'")}"`,
    ].join(","),
  );
  return [head, ...rows].join("\n");
}

function download(name: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
