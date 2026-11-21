import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runStatutoryGraph } from "@/lib/agents.functions";
import {
  ASSISTANTS,
  DEPLOYMENT,
  EVAL_SUITE,
  scoreCase,
  suiteToCsv,
  type EvalOutcome,
} from "@/lib/agents/platform";

function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Managed-deployment console: what the platform hosts, which assistants are
 * published on it, and a regression suite run live against the deployed graph.
 */
export function PlatformOps() {
  const run = useServerFn(runStatutoryGraph);
  const [rows, setRows] = useState<EvalOutcome[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function runSuite() {
    setRows([]);
    const out: EvalOutcome[] = [];
    for (const c of EVAL_SUITE) {
      setBusy(c.name);
      try {
        const r = await run({ data: { question: c.question, context: c.context } });
        out.push(scoreCase(c, r));
      } catch (e) {
        out.push({
          case: c,
          pass: false,
          checks: [],
          latencyMs: 0,
          costUsd: 0,
          tokens: 0,
          qaPass: false,
          rewrites: 0,
          error: e instanceof Error ? e.message : "run failed",
        });
        // Do not continue billed work after a terminal gateway failure.
        setRows([...out]);
        break;
      }
      setRows([...out]);
    }
    setBusy(null);
  }

  const passed = rows.filter((r) => r.pass).length;
  const totalCost = rows.reduce((a, r) => a + r.costUsd, 0);
  const avgLat = rows.length ? rows.reduce((a, r) => a + r.latencyMs, 0) / rows.length : 0;

  return (
    <div className="border border-rule/20">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule/15 px-6 py-4">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Managed deployment — LangGraph Platform
        </p>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          graph “{DEPLOYMENT.graphId}” · {DEPLOYMENT.configFile}
        </p>
      </div>

      <div className="grid gap-px bg-rule/15 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["Runtime", DEPLOYMENT.runtime],
          ["Scaling", DEPLOYMENT.scaling],
          ["Persistence", DEPLOYMENT.persistence],
          ["Observability", DEPLOYMENT.observability],
        ].map(([k, v]) => (
          <div key={k} className="bg-background p-5">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              {k}
            </p>
            <p className="mt-2 text-sm leading-relaxed">{v}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-rule/15 px-6 py-5">
        <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          Assistant configurations · managed deployment not connected
        </p>
        <ul className="mt-4 grid gap-px bg-rule/15 md:grid-cols-3">
          {ASSISTANTS.map((a) => (
            <li key={a.id} className="bg-background p-5">
              <p className="font-display text-xl">{a.name}</p>
              <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.14em] text-primary">
                {a.id}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.purpose}</p>
              <p className="font-mono-ui mt-3 text-[10px] text-muted-foreground">{a.config}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          The factory at <span className="font-mono-ui">{DEPLOYMENT.factory}</span> is the same
          builder the desk runs in-process, so a managed run and a desk run execute an identical
          topology.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule/15 px-6 py-4">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Graph regression suite — {EVAL_SUITE.length} cases against the application graph
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {busy ? `Running — ${busy}` : rows.length ? `${passed}/${rows.length} passed` : "Not run in this session"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runSuite()}
            disabled={busy !== null}
            className="font-mono-ui bg-primary px-5 py-2.5 text-[10px] uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Testing…" : "Run test suite"}
          </button>
          <button
            type="button"
            disabled={!rows.length}
            onClick={() => download(suiteToCsv(rows), "corpvidesh-graph-suite.csv", "text/csv")}
            className="font-mono-ui border border-rule/30 px-5 py-2.5 text-[10px] uppercase tracking-[0.16em] disabled:opacity-40"
          >
            CSV
          </button>
          <button
            type="button"
            disabled={!rows.length}
            onClick={() =>
              download(JSON.stringify(rows, null, 2), "corpvidesh-graph-suite.json", "application/json")
            }
            className="font-mono-ui border border-rule/30 px-5 py-2.5 text-[10px] uppercase tracking-[0.16em] disabled:opacity-40"
          >
            JSON
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <div className="grid gap-px border-t border-rule/15 bg-rule/15 sm:grid-cols-3">
            {[
              ["Cases passed", `${passed}/${rows.length}`],
              ["Average run latency", `${(avgLat / 1000).toFixed(1)} s`],
              ["Suite spend", `$${totalCost.toFixed(4)}`],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-5">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  {k}
                </p>
                <p className="font-display tnum mt-2 text-3xl text-primary">{v}</p>
              </div>
            ))}
          </div>

          <ul className="border-t border-rule/15">
            {rows.map((r) => (
              <li key={r.case.id} className="border-b border-rule/10 px-6 py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-display text-xl">{r.case.name}</p>
                  <p
                    className={`font-mono-ui text-[10px] uppercase tracking-[0.16em] ${
                      r.pass ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {r.pass ? "Pass" : "Fail"} · {(r.latencyMs / 1000).toFixed(1)} s ·{" "}
                    {r.tokens.toLocaleString("en-IN")} tokens · {r.rewrites} corrective
                  </p>
                </div>
                {r.error && (
                  <p className="mt-2 text-xs text-muted-foreground">Run error — {r.error}</p>
                )}
                <ul className="mt-3 grid gap-px bg-rule/15 md:grid-cols-2">
                  {r.checks.map((c) => (
                    <li
                      key={c.label}
                      className={`bg-background p-3 ${c.pass ? "border-l-2 border-primary" : "border-l-2 border-rule/30"}`}
                    >
                      <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em]">
                        {c.pass ? "✓" : "✕"} {c.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
