import { useEffect, useMemo, useState } from "react";
import { AGENT_LABEL, type AgentNode, type AgentRunResult } from "@/lib/agents/types";

const POS: Record<AgentNode, [number, number]> = {
  coordinator: [70, 70],
  retriever: [230, 70],
  grader: [390, 70],
  drafter: [550, 70],
  rewriter: [310, 210],
  external_lookup: [470, 210],
  qa: [550, 330],
  finalise: [390, 330],
};

type Edge = { from: AgentNode; to: AgentNode; label?: string; conditional?: boolean };
const EDGES: Edge[] = [
  { from: "coordinator", to: "retriever" },
  { from: "retriever", to: "grader" },
  { from: "grader", to: "drafter", label: "relevant", conditional: true },
  { from: "grader", to: "rewriter", label: "partial", conditional: true },
  { from: "rewriter", to: "retriever", label: "re-search" },
  { from: "grader", to: "external_lookup", label: "still poor", conditional: true },
  { from: "external_lookup", to: "drafter" },
  { from: "drafter", to: "qa" },
  { from: "qa", to: "finalise", label: "verdict" },
];

const W = 130;
const H = 44;

function path(e: Edge) {
  const [x1, y1] = POS[e.from];
  const [x2, y2] = POS[e.to];
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 + (e.from === "rewriter" ? 40 : 0) - (y1 === y2 ? 0 : 0);
  return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
}

/** Interactive SVG StateGraph with a step-by-step replay of a real run's spans. */
export function AgentGraphCanvas({ result, busy }: { result: AgentRunResult | null; busy: boolean }) {
  const spans = result?.spans ?? [];
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [pick, setPick] = useState<AgentNode | null>(null);

  useEffect(() => {
    if (result) {
      setStep(0);
      setPlaying(true);
      setPick(null);
    } else setStep(-1);
  }, [result]);

  useEffect(() => {
    if (!playing || !spans.length) return;
    if (step >= spans.length - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), 750);
    return () => clearTimeout(id);
  }, [playing, step, spans.length]);

  const shown = step >= 0 ? spans.slice(0, step + 1) : [];
  const current = shown[shown.length - 1];
  const visitedEdges = useMemo(() => {
    const set = new Set<string>();
    for (let i = 1; i < shown.length; i++) set.add(`${shown[i - 1]!.node}>${shown[i]!.node}`);
    return set;
  }, [shown]);
  const lastEdge = shown.length > 1 ? `${shown[shown.length - 2]!.node}>${current!.node}` : "";
  const elapsed = shown.reduce((a, s) => a + s.latencyMs, 0);
  const focus = pick ?? current?.node ?? null;
  const focusSpans = spans.filter((s) => s.node === focus);

  return (
    <div className="border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          StateGraph — live topology & trace replay
        </p>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            disabled={!spans.length}
            onClick={() => {
              if (step >= spans.length - 1) setStep(0);
              setPlaying((p) => !p);
            }}
            className="border border-border px-2.5 py-1 disabled:opacity-40"
          >
            {playing ? "Pause" : "Replay"}
          </button>
          <input
            type="range"
            aria-label="Trace step"
            min={0}
            max={Math.max(0, spans.length - 1)}
            value={Math.max(0, step)}
            disabled={!spans.length}
            onChange={(e) => {
              setPlaying(false);
              setStep(Number(e.target.value));
            }}
            className="w-36 accent-[hsl(var(--primary))]"
          />
          <span className="tabular-nums text-muted-foreground">
            {spans.length ? `step ${step + 1}/${spans.length} · ${elapsed} ms` : busy ? "running…" : "no run yet"}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px]">
        <svg viewBox="0 0 640 380" className="w-full" role="img" aria-label="Agent graph">
          <defs>
            <marker id="ag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" />
            </marker>
            <marker id="ag-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" className="fill-primary" />
            </marker>
          </defs>
          {EDGES.map((e) => {
            const key = `${e.from}>${e.to}`;
            const hot = visitedEdges.has(key);
            const [x1, y1] = POS[e.from];
            const [x2, y2] = POS[e.to];
            return (
              <g key={key}>
                <path
                  id={`ag-${key}`}
                  d={path(e)}
                  fill="none"
                  markerEnd={`url(#${hot ? "ag-arrow-hot" : "ag-arrow"})`}
                  className={hot ? "stroke-primary" : "stroke-border"}
                  strokeWidth={hot ? 2.5 : 1.5}
                  strokeDasharray={e.conditional && !hot ? "5 4" : undefined}
                />
                {e.label && (
                  <text x={(x1 + x2) / 2 + (y1 === y2 ? 0 : 6)} y={y1 === y2 ? y1 - 28 : (y1 + y2) / 2 - 6} textAnchor={y1 === y2 ? "middle" : "start"} className="fill-muted-foreground text-[10px]">
                    {e.label}
                  </text>
                )}
                {key === lastEdge && (
                  <circle r="5" className="fill-primary">
                    <animateMotion dur="0.7s" repeatCount="indefinite" path={path(e)} />
                  </circle>
                )}
              </g>
            );
          })}
          {(Object.keys(POS) as AgentNode[]).map((n) => {
            const [x, y] = POS[n];
            const hits = shown.filter((s) => s.node === n);
            const isNow = current?.node === n;
            const corrective = hits.some((h) => h.status === "corrective");
            const failed = hits.some((h) => h.status === "failed");
            const pulsing = busy && n === "coordinator";
            return (
              <g key={n} transform={`translate(${x - W / 2},${y - H / 2})`} className="cursor-pointer" onClick={() => setPick(n)}>
                {(isNow || pulsing) && (
                  <rect x={-5} y={-5} width={W + 10} height={H + 10} className="fill-none stroke-primary" strokeWidth={1}>
                    <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
                  </rect>
                )}
                <rect
                  width={W}
                  height={H}
                  className={
                    isNow ? "fill-primary stroke-primary" : hits.length ? "fill-background stroke-primary" : "fill-background stroke-border"
                  }
                  strokeWidth={focus === n ? 2.5 : 1.5}
                />
                <text x={W / 2} y={18} textAnchor="middle" className={`text-[10.5px] font-medium ${isNow ? "fill-primary-foreground" : "fill-foreground"}`}>
                  {AGENT_LABEL[n].replace(" Agent", "")}
                </text>
                <text x={W / 2} y={33} textAnchor="middle" className={`text-[9.5px] ${isNow ? "fill-primary-foreground" : failed ? "fill-destructive" : "fill-muted-foreground"}`}>
                  {hits.length ? `${hits.length}× · ${hits.reduce((a, h) => a + h.latencyMs, 0)} ms${corrective ? " · corrective" : ""}` : "idle"}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="border-t border-border p-5 lg:border-l lg:border-t-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Node inspector</p>
          {focus ? (
            <>
              <p className="mt-2 font-display text-xl">{AGENT_LABEL[focus]}</p>
              {focusSpans.length ? (
                <ul className="mt-3 space-y-3 text-sm">
                  {focusSpans.map((s) => (
                    <li key={s.id} className="border-l-2 border-primary pl-3">
                      <span className="block">{s.summary}</span>
                      {s.detail && <span className="block text-xs text-muted-foreground">{s.detail}</span>}
                      <span className="mt-1 block text-[11px] tabular-nums text-muted-foreground">
                        {s.status} · {s.latencyMs} ms · {s.model ?? "deterministic"} · {s.promptTokens + s.completionTokens} tok
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Not visited in this run — its conditional edge was not taken.</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Run the graph, then click any node to see what that agent did. Dashed edges are conditional routes chosen by the grader.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
