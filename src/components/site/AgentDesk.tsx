import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { AgentGraph } from "@/components/site/AgentGraph";
import { TreasuryCopilot, DocumentReader } from "@/components/site/FrontierAgents";
import { CurrencyOutlookAgent } from "@/components/site/CurrencyOutlookAgent";
import { AgentIntegration } from "@/components/site/AgentIntegration";
import { integrationStatus } from "@/lib/agent-integration.functions";
import { RAIL_CURRENCIES } from "@/lib/opi-signal";
import { scenarioCurrency, useTreasuryScenario } from "@/lib/treasury-scenario";
import { AgentArchitecture } from "@/components/site/AgentArchitecture";
import { AgentTraining } from "@/components/site/AgentTraining";
import { summariseRuns, useAgentRuns } from "@/lib/agent-session";

export const AGENT_TABS = [
  { id: "graph", n: "01", name: "Statutory graph", does: "Retrieves, grades and drafts a cited filing answer; a QA agent must pass it.", time: "~30 s", kind: "AI · 8 agents" },
  { id: "copilot", n: "02", name: "Treasury copilot", does: "Answers a treasury question with a forecast, an action and its legal basis.", time: "~15 s", kind: "AI" },
  { id: "reader", n: "03", name: "Document reader", does: "Reads a board resolution or photo and lists the filings it triggers.", time: "~15 s", kind: "AI · vision" },
  { id: "outlook", n: "04", name: "Currency outlook", does: "Turns a live provider rate into conditional scenarios, allocation and hedge.", time: "~20 s", kind: "AI · live FX" },
  { id: "tools", n: "05", name: "Connected tools", does: "Runs the four read-only FX, market, statute and record functions the agents use.", time: "< 3 s", kind: "Server functions" },
  { id: "training", n: "06", name: "Training loop", does: "Your ratings become worked examples for each agent, checked by an evaluation suite and exportable as a fine-tuning dataset.", time: "Instant", kind: "LangGraph mesh" },
] as const;
export type AgentTab = (typeof AGENT_TABS)[number]["id"];
export const isAgentTab = (v: unknown): v is AgentTab => AGENT_TABS.some((t) => t.id === v);

/** One compact desk for every agent. Each panel calls its existing server function; nothing here grants access or files anything. */
export function AgentDesk({ tab, onTab }: { tab: AgentTab; onTab: (t: AgentTab) => void }) {
  const status = useServerFn(integrationStatus);
  const [ai, setAi] = useState<boolean | null>(null);
  const [scenario] = useTreasuryScenario();
  useEffect(() => {
    let live = true;
    status().then((s) => { if (live) setAi(s.aiConfigured); }).catch(() => { if (live) setAi(null); });
    return () => { live = false; };
  }, [status]);
  const idx = AGENT_TABS.findIndex((t) => t.id === tab);
  const active = AGENT_TABS[idx] ?? AGENT_TABS[0];
  const next = AGENT_TABS[(idx + 1) % AGENT_TABS.length]!;
  const ccy = scenarioCurrency(scenario);
  const outlookCode = RAIL_CURRENCIES.some((r) => r.code === ccy) ? ccy : "USD";
  const runs = useAgentRuns();
  const sum = summariseRuns(runs);
  const impact: [string, string][] = [
    ["Runs this session", String(sum.runs)],
    ["Average answer time", sum.runs ? `${(sum.avgMs / 1000).toFixed(1)} s` : "—"],
    ["Passed checks", sum.runs ? `${sum.passRate}%` : "—"],
    ["Agents used", `${sum.agentsUsed} / 5`],
  ];

  return (
    <div className="space-y-4">
    <AgentArchitecture active={tab} onPick={onTab} />
    <div className="border border-rule/25">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/20 px-4 py-2.5">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className={`mr-2 inline-block h-2 w-2 ${ai === false ? "bg-muted-foreground" : "bg-primary"}`} aria-hidden />
          {ai === null ? "Checking agent service…" : ai ? "AI service connected · 4 AI agents in one LangGraph mesh + 4 read tools" : "AI service not configured — AI agents will show an error"}
        </p>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Scenario · {scenario.hub} · {ccy} · ₹{scenario.amountCr.toLocaleString("en-IN")} cr
        </p>
      </div>
      <dl aria-label="Measured impact this session" className="grid grid-cols-2 gap-px border-b border-rule/20 bg-rule/20 lg:grid-cols-4">
        {impact.map(([k, v]) => (
          <div key={k} className="bg-background px-4 py-2.5">
            <dt className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{k}</dt>
            <dd className="font-display text-2xl tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <div role="tablist" aria-label="Agents" className="grid grid-cols-2 gap-px bg-rule/20 sm:grid-cols-3 lg:grid-cols-6">
        {AGENT_TABS.map((t) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`agent-tab-${t.id}`}
              aria-selected={on}
              aria-controls="agent-panel"
              onClick={() => onTab(t.id)}
              className={`p-3 text-left transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/60"}`}
            >
              <span className={`font-mono-ui text-[10px] tracking-[0.18em] ${on ? "" : "text-primary"}`}>{t.n} · {t.kind}</span>
              <span className="font-display mt-1 block text-lg leading-tight">{t.name}</span>
              <span className={`font-mono-ui text-[10px] uppercase tracking-[0.14em] ${on ? "opacity-80" : "text-muted-foreground"}`}>{t.time}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-rule/20 bg-muted/30 px-4 py-2.5">
        <p className="text-sm"><span className="font-mono-ui mr-2 text-[10px] uppercase tracking-[0.18em] text-primary">{active.n}</span>{active.does}</p>
        <button type="button" onClick={() => onTab(next.id)} className="font-mono-ui inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-primary hover:underline">
          Next · {next.name} <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div id="agent-panel" role="tabpanel" aria-labelledby={`agent-tab-${active.id}`} className="p-4">
        {tab === "graph" && <AgentGraph />}
        {tab === "copilot" && <TreasuryCopilot desk="Agent desk" />}
        {tab === "reader" && <DocumentReader desk="Agent desk" />}
        {tab === "outlook" && <CurrencyOutlookAgent corridorCode={outlookCode} compact />}
        {tab === "tools" && <AgentIntegration compact />}
        {tab === "training" && <AgentTraining onTab={onTab} />}
      </div>
      <p className="border-t border-rule/20 px-4 py-2 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Figures count real runs in this browser session only — not production metrics. Refreshing the page resets them.
      </p>
    </div>
    </div>
  );
}
