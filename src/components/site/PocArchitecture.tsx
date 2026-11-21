"use client";

/**
 * The proof-of-concept architecture, live rather than drawn.
 *
 * Four layers make the rail an application rather than a demo: retrieval that
 * is semantic and provably grounded, agent memory that persists across turns,
 * an evaluation gate that scores the graph like code, and a tool boundary that
 * refuses anything the session's role does not hold a scope for. Each panel
 * below runs the real thing.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { probeRetrieval } from "@/lib/agents.functions";
import { useServerFn } from "@tanstack/react-start";
import { executeReadTool } from "@/lib/agent-integration.functions";
import { Button } from "@/components/ui/button";
import {
  blank as blankThread,
  buildContext,
  clearMemory,
  subscribeMemory,
  type Thread,
} from "@/lib/agents/memory";
import {
  TOOLS,
  authorise,
  appendToolLedger,
  readToolLedger,
  type ToolCall,
} from "@/lib/agents/tools";
import { useSession } from "@/lib/session";

const LAYERS = [
  {
    k: "01 · Context",
    t: "Context engineering",
    d: "Facts, recent determinations and the dialogue tail are compressed into a bounded preamble instead of a growing transcript, so cost per turn stays flat as a thread ages.",
  },
  {
    k: "02 · Retrieval",
    t: "Vector RAG with a corrective loop",
    d: "The graph and this probe share semantic retrieval with lexical fallback. A grader scores passages, rewrites the query and expands the local corpus before drafting; no external statutory lookup is claimed.",
  },
  {
    k: "03 · Reasoning",
    t: "Multi-agent graph",
    d: "A coordinator routes to retrieval, grading, rewriting, drafting and quality checks. Streamed model chains run inside the application; node-resume checkpoints are not provisioned.",
  },
  {
    k: "04 · Memory",
    t: "Three-tier agent memory",
    d: "Device-local turns and facts accompany the graph; verified users also receive private server-side run outcomes and bounded context shared across agents.",
  },
  {
    k: "05 · Tools",
    t: "Scoped tool boundary",
    d: "FX, markets and statutory searches execute read-only server functions. Private records require verified identity; unconnected mutations and official submissions are refused.",
  },
  {
    k: "06 · Evaluation",
    t: "Regression gate",
    d: "The suite asserts on the structured filing packet — route, forms, citations, quality gate, latency budget — so a behavioural regression fails a case, not a vibe check.",
  },
  {
    k: "07 · Operations",
    t: "Observability and governance",
    d: "Span-level latency and usage accompany graph outcomes. Verified users retain private outcomes; tracing requires credentials and regulators do not receive official access through a demo role.",
  },
];

export function PocArchitecture() {
  const probeFn = useServerFn(probeRetrieval);
  const toolFn = useServerFn(executeReadTool);
  const { session } = useSession();
  const role = session?.role ?? "guest";
  const [thread, setThread] = useState<Thread>(() => blankThread("t1")); // browser memory loads after hydration via subscribeMemory
  const [q, setQ] = useState("Is a foreign SaaS subscription royalty or fee for technical services?");
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState<Awaited<ReturnType<typeof probeRetrieval>> | null>(null);
  const [calls, setCalls] = useState<ToolCall[]>([]);
  const [error, setError] = useState("");

  useEffect(() => subscribeMemory(setThread), []);
  useEffect(() => setCalls(readToolLedger()), []);

  async function runProbe() {
    setBusy(true);
    setError("");
    try {
      setProbe(await probeFn({ data: { query: q, k: 4 } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retrieval could not complete.");
    } finally {
      setBusy(false);
    }
  }

  async function tryTool(name: string) {
    const spec = TOOLS.find((t) => t.name === name);
    if (!spec) return;
    setBusy(true); setError("");
    try {
      const result = await toolFn({ data: { name: spec.name as "fx.rate", query: q, code: "USD", symbol: "^NSEI" } });
      setCalls(appendToolLedger({ id: crypto.randomUUID(), at: Date.now(), tool: name, role: "server-verified", allowed: result.ok, reason: result.ok ? "Read-only server function completed; open connected execution for results." : result.error, approvalRequired: spec.approval }));
    } catch (e) { setError(e instanceof Error ? e.message : "The server function could not complete."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-px bg-rule/15">
      {/* layers */}
      <div className="grid gap-px bg-rule/15 md:grid-cols-2 lg:grid-cols-4">
        {LAYERS.map((l) => (
          <div key={l.k} className="bg-background p-5">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.18em] text-primary">{l.k}</p>
            <p className="font-display mt-2 text-lg leading-snug">{l.t}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{l.d}</p>
          </div>
        ))}
        <div className="bg-background p-5">
          <p className="font-mono-ui text-[9px] uppercase tracking-[0.18em] text-primary">
            08 · Surface
          </p>
          <p className="font-display mt-2 text-lg leading-snug">Prediction, not reporting</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Every desk opens with a forecast and the action that improves it.{" "}
            <Link to="/intelligence" className="text-primary underline underline-offset-2">
              Open the prediction surface
            </Link>
            .
          </p>
        </div>
      </div>

      {/* retrieval probe */}
      <section className="bg-background p-6">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Retrieval — semantic, with a deterministic fallback
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="min-w-[280px] flex-1 border border-rule/25 bg-background px-3 py-2 text-sm"
            placeholder="Ask the corpus in your own words"
          />
          <Button
            type="button"
            disabled={busy}
            onClick={runProbe}
            className="font-mono-ui bg-primary px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Embedding…" : "Run retrieval"}
          </Button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {probe ? (
          <>
            <p className="font-mono-ui mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              mode {probe.mode} · {probe.indexed} passages indexed ·{" "}
              {probe.dims ? `${probe.dims}-dim vectors` : "lexical scoring"} · {probe.latencyMs} ms
            </p>
            <ul className="mt-3 grid gap-px bg-rule/15 md:grid-cols-2">
              {probe.chunks.map((c) => (
                <li key={c.id} className="bg-background p-4">
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.12em] text-primary">
                    {c.source} · score {c.score}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {c.text.slice(0, 200)}…
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            The corpus is embedded once per process and searched by meaning; if the embeddings
            endpoint is unreachable the same query is answered lexically rather than left ungrounded.
          </p>
        )}
      </section>

      {/* memory */}
      <section className="bg-background p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Agent memory — {thread.semantic.length} facts · {thread.episodic.length} runs ·{" "}
            {thread.working.length} turns
          </p>
          <button
            type="button"
            onClick={() => clearMemory()}
            className="font-mono-ui border border-rule/25 px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
          >
            Forget thread
          </button>
        </div>
        <div className="mt-4 grid gap-px bg-rule/15 lg:grid-cols-3">
          <div className="bg-background p-4">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Semantic facts
            </p>
            {thread.semantic.length ? (
              <ul className="mt-2 space-y-1 text-xs">
                {thread.semantic.map((f) => (
                  <li key={f.key} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{f.key}</span>
                    <span className="tnum text-right">{f.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Set an entity and a corridor on the prediction surface — the desk remembers them.
              </p>
            )}
          </div>
          <div className="bg-background p-4">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Episodic runs
            </p>
            <ul className="mt-2 space-y-2 text-xs">
              {thread.episodic.slice(0, 4).map((e) => (
                <li key={e.id}>
                  <span className="text-primary">{e.route}</span> — {e.question.slice(0, 60)}
                  <span className="tnum block text-muted-foreground">
                    {e.verdict} · {(e.latencyMs / 1000).toFixed(1)}s · ${e.costUsd.toFixed(5)}
                  </span>
                </li>
              ))}
              {thread.episodic.length === 0 ? (
                <li className="text-muted-foreground">
                  Runs from the agent graph land here and are replayed into the next question.
                </li>
              ) : null}
            </ul>
          </div>
          <div className="bg-background p-4">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Compiled context sent to the model
            </p>
            <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted-foreground">
              {buildContext(thread) || "empty — nothing to carry forward yet"}
            </pre>
          </div>
        </div>
      </section>

      {/* tools */}
      <section className="bg-background p-6">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Server-connected tools · demo role “{role}” grants no private access
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-rule/20 text-left">
                {["Tool", "Server / transport", "Scope", "Auth", "Effect", "Egress", ""].map((h) => (
                  <th
                    key={h}
                    className="font-mono-ui py-2 pr-3 text-[9px] font-normal uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOOLS.map((t) => {
                const d = authorise(t, role);
                return (
                  <tr key={t.name} className="border-b border-rule/10 align-top">
                    <td className="py-2 pr-3 font-medium">{t.name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {t.server} · {t.transport}
                    </td>
                    <td className="py-2 pr-3">{t.scope}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{t.auth}</td>
                    <td className="py-2 pr-3">{t.effect}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{t.egress}</td>
                    <td className="py-2">
                      <Button
                        type="button"
                        disabled={busy}
                        variant="outline" size="sm"
                        onClick={() => void tryTool(t.name)}
                        className={`font-mono-ui border px-2 py-1 text-[9px] uppercase tracking-[0.12em] ${d.allowed ? "border-primary text-primary" : "border-rule/25 text-muted-foreground"}`}
                      >
                        Run server check
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {calls.length ? (
          <ul className="mt-4 space-y-1 border-t border-rule/15 pt-3 text-[11px]">
            {calls.slice(0, 6).map((c) => (
              <li key={c.id} className="flex flex-wrap gap-2">
                <span className={c.allowed ? "text-primary" : "text-muted-foreground"}>
                  {c.allowed ? "GRANTED" : "REFUSED"}
                </span>
                <span className="tnum text-muted-foreground">
                  {new Date(c.at).toLocaleTimeString()}
                </span>
                <span>{c.tool}</span>
                <span className="text-muted-foreground">{c.reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Read tools execute on the server. Private history requires verified identity; unconnected
            external actions are refused. This activity list is device-local, not an official audit ledger.
          </p>
        )}
      </section>
    </div>
  );
}
