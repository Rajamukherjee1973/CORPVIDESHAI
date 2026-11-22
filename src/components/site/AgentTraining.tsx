import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Trash2 } from "lucide-react";
import { listTrainingFeedback } from "@/lib/agent-training.functions";
import { clearNotebook, useTrainingNotebook } from "@/lib/agent-training";
import {
  CURATED_EXAMPLES, RESPONSIBILITY, toFineTuneJsonl, trainingStats,
  type ReviewedExample, type TrainableAgent,
} from "@/lib/agents/training";
import type { AgentTab } from "@/components/site/AgentDesk";

const LABEL = "font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground";
const NAME: Record<TrainableAgent, string> = { statutory: "Statutory graph", copilot: "Treasury copilot", document: "Document reader", currency: "Currency outlook" };

const STEPS = [
  { n: "01", t: "Rate", d: "Under every answer: Helpful, Not helpful, or Correct it with your own wording." },
  { n: "02", t: "Recall", d: "The mesh's recall node finds your closest endorsed examples for that agent only." },
  { n: "03", t: "Reuse", d: "Up to three examples join the prompt as labelled style references — evidence still comes from passages and live data." },
  { n: "04", t: "Check & export", d: "Re-run the fixed regression suite to catch drift, then export endorsed pairs as a fine-tuning dataset." },
];

const MESH = ["recall", "dispatch", "specialist", "learn"] as const;

/** Training loop tab: the LangGraph mesh, the no-overlap contract and the person's own ratings. */
export function AgentTraining({ onTab }: { onTab: (t: AgentTab) => void }) {
  const list = useServerFn(listTrainingFeedback);
  const account = useQuery({ queryKey: ["agent-training-feedback"], queryFn: () => list(), staleTime: 15_000, retry: 0 });
  const browserRows = useTrainingNotebook();
  const accountRows = account.data?.verified ? account.data.rows : null;
  const verified = accountRows !== null;
  const rows: ReviewedExample[] = accountRows
    ? accountRows.map((r) => ({
        agent: r.agent as TrainableAgent, rating: r.rating === 1 ? 1 : -1, question: r.question, answer: r.answer,
        correction: r.correction, at: r.created_at, origin: "account" as const,
      }))
    : browserRows;
  const stats = trainingStats(rows);
  const usable = stats.reduce((a, s) => a + s.usable, 0);

  const exportJsonl = () => {
    const blob = new Blob([toFineTuneJsonl(rows) + "\n"], { type: "application/jsonl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `corpvidesh-agent-training-${new Date().toISOString().slice(0, 10)}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-px bg-rule/20 md:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="bg-background p-4">
            <p className="font-mono-ui text-[11px] text-primary">{s.n}</p>
            <p className="font-display mt-1 text-xl leading-tight">{s.t}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <figure aria-label="LangGraph agent mesh" className="border border-rule/25 lg:col-span-2">
          <figcaption className="bg-foreground px-4 py-2 font-mono-ui text-[10px] uppercase tracking-[0.18em] text-background">One LangGraph mesh · every AI agent</figcaption>
          <ol className="space-y-2 p-4">
            {MESH.map((m, i) => (
              <li key={m} className="flex items-start gap-3">
                <span className="font-mono-ui mt-0.5 bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{i + 1}</span>
                <div className="text-sm">
                  <span className="font-medium">{m}</span>
                  <span className="block text-xs text-muted-foreground">
                    {m === "recall" && "Loads memory of your recent runs and your endorsed examples."}
                    {m === "dispatch" && "Fixed by the tab you used — no AI router, so no two agents answer one request."}
                    {m === "specialist" && "Statutory subgraph · copilot · document reader · currency outlook (LangChain, one shared model client)."}
                    {m === "learn" && "Reports which examples shaped the answer; your rating closes the loop."}
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <p className="border-t border-rule/20 px-4 py-2 text-xs text-muted-foreground">
            Note: the statutory specialist is itself a LangGraph subgraph (retrieve → grade → rewrite → draft → QA veto). Both graphs are declared in langgraph.json.
          </p>
        </figure>

        <div className="lg:col-span-3">
          <p className={LABEL}>No-overlap contract · one job per agent</p>
          <div className="mt-2 overflow-x-auto border border-rule/25">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-muted/40"><tr className={LABEL}><th className="px-3 py-2 font-normal">Agent</th><th className="px-3 py-2 font-normal">Owns</th><th className="px-3 py-2 font-normal">Leaves to others</th></tr></thead>
              <tbody>
                {RESPONSIBILITY.map((r) => (
                  <tr key={r.agent} className="border-t border-rule/20 align-top">
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => onTab(r.tab as AgentTab)} className="text-left font-medium text-primary hover:underline">{r.name}</button>
                      <span className="font-mono-ui block text-[10px] text-muted-foreground">{r.node}</span>
                    </td>
                    <td className="px-3 py-2">{r.owns}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.never}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="border border-rule/25">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/20 px-4 py-2.5">
          <p className={LABEL}>
            Your training notebook · {verified ? "saved to your account" : "this browser (sign in to keep ratings across devices)"} · {CURATED_EXAMPLES.length} curated seed examples always included
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportJsonl} disabled={!usable} className="font-mono-ui inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-50">
              <Download className="h-3 w-3" /> Export dataset · {usable} pair{usable === 1 ? "" : "s"}
            </button>
            {!verified && browserRows.length ? (
              <button type="button" onClick={clearNotebook} className="font-mono-ui inline-flex items-center gap-1.5 border border-rule/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] hover:text-primary">
                <Trash2 className="h-3 w-3" /> Clear browser ratings
              </button>
            ) : null}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-rule/20 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.agent} className="bg-background p-4">
              <dt className={LABEL}>{NAME[s.agent]}</dt>
              <dd className="font-display mt-1 text-3xl tabular-nums">{s.usable}</dd>
              <dd className="text-xs text-muted-foreground">
                endorsed examples · {s.ratings} rating{s.ratings === 1 ? "" : "s"} · {s.corrected} corrected
                {s.approvalPct !== null ? ` · ${s.approvalPct}% helpful` : ""}
              </dd>
            </div>
          ))}
        </dl>
        {rows.length ? (
          <ul className="divide-y divide-rule/20">
            {rows.slice(0, 5).map((r, i) => (
              <li key={`${r.at}-${i}`} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[9rem_5rem_1fr]">
                <span className="font-mono-ui text-[11px] text-primary">{NAME[r.agent]}</span>
                <span className="font-mono-ui text-[11px] text-muted-foreground">{r.correction ? "corrected" : r.rating === 1 ? "helpful" : "not helpful"}</span>
                <span className="truncate text-muted-foreground">{r.question}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-4 text-sm text-muted-foreground">No ratings yet. Run any agent tab, then use <span className="text-foreground">Train this agent</span> under the answer.</p>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Note on training: the hosted models' weights are not changed by this prototype. Ratings shape later answers through retrieved
        examples, only for the person who gave them; the exported file is in the standard chat fine-tuning format for a separate,
        approved training run. Check for drift with the graph regression suite under “Graph testing” further down this page.
        Unhelpful answers without a correction are counted but never reused.
      </p>
    </div>
  );
}
