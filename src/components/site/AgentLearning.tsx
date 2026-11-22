import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ThumbsDown, ThumbsUp, PencilLine } from "lucide-react";
import { rateAgentAnswer } from "@/lib/agent-training.functions";
import { addToNotebook } from "@/lib/agent-training";
import type { LearningSummary, TrainableAgent } from "@/lib/agents/training";

const LABEL = "font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

/** Shows which LangGraph mesh path ran and how many reviewed examples shaped the answer. */
export function LearningNote({ learning }: { learning?: LearningSummary | undefined }) {
  if (!learning) return null;
  return (
    <p className="font-mono-ui border-t border-rule/20 pt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      <span className="text-primary">Mesh</span> {learning.path.join(" → ")} ·{" "}
      {learning.examplesUsed
        ? `learned from ${learning.reviewed} reviewed + ${learning.curated} curated example${learning.examplesUsed === 1 ? "" : "s"}`
        : "no similar reviewed example yet"}
    </p>
  );
}

/**
 * Reviewer rating bar: helpful, not helpful, or a corrected answer. Ratings become
 * worked examples for the same person's future runs and the exportable dataset.
 */
export function RateAnswer({ agent, question, answer }: { agent: TrainableAgent; question: string; answer: string }) {
  const rate = useServerFn(rateAgentAnswer);
  const [mode, setMode] = useState<"idle" | "correct" | "saving" | "done">("idle");
  const [correction, setCorrection] = useState("");
  const [note, setNote] = useState("");
  const q = question.trim().slice(0, 800);
  const a = answer.trim().slice(0, 4000);
  if (q.length < 3 || !a) return null;

  async function send(rating: 1 | -1, fix = "") {
    setMode("saving");
    const row = { agent, rating, question: q, answer: a, correction: fix.trim().slice(0, 2000) };
    addToNotebook(row);
    try {
      const r = await rate({ data: row });
      setNote(r.saved ? "Saved to your account · used in your next similar run" : "Saved in this browser · used in your next similar run");
    } catch {
      setNote("Saved in this browser only — your account could not be reached.");
    }
    setMode("done");
  }

  if (mode === "done") return <p role="status" className="font-mono-ui border-t border-rule/20 pt-2 text-[10px] uppercase tracking-[0.14em] text-primary">{note}</p>;

  return (
    <div className="border-t border-rule/20 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={LABEL}>Train this agent</span>
        <button type="button" disabled={mode === "saving"} onClick={() => void send(1)} className="inline-flex items-center gap-1 border border-rule/30 px-2 py-1 text-xs hover:border-primary hover:text-primary"><ThumbsUp className="h-3 w-3" /> Helpful</button>
        <button type="button" disabled={mode === "saving"} onClick={() => setMode(mode === "correct" ? "idle" : "correct")} className="inline-flex items-center gap-1 border border-rule/30 px-2 py-1 text-xs hover:border-primary hover:text-primary"><PencilLine className="h-3 w-3" /> Correct it</button>
        <button type="button" disabled={mode === "saving"} onClick={() => void send(-1)} className="inline-flex items-center gap-1 border border-rule/30 px-2 py-1 text-xs hover:border-primary hover:text-primary"><ThumbsDown className="h-3 w-3" /> Not helpful</button>
      </div>
      {mode === "correct" ? (
        <div className="mt-2">
          <label className={LABEL} htmlFor={`fix-${agent}`}>Your corrected answer</label>
          <textarea id={`fix-${agent}`} rows={3} maxLength={2000} value={correction} onChange={(e) => setCorrection(e.target.value)} className="mt-1 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          <button type="button" disabled={correction.trim().length < 3} onClick={() => void send(-1, correction)} className="font-mono-ui mt-2 bg-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-50">Save correction</button>
        </div>
      ) : null}
    </div>
  );
}
