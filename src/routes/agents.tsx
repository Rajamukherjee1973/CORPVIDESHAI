import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { PlatformOps } from "@/components/site/PlatformOps";
import { AgentDesk, isAgentTab, type AgentTab } from "@/components/site/AgentDesk";
import { recordCapture, setFxPageContext } from "@/lib/fx-stream";

const TITLE = "Agent Desk — Statutory Graph, Copilot, Document Reader, Currency Outlook | CorpVidesh AI";
const DESC =
  "One compact desk for every CorpVidesh AI agent: an eight-agent statutory graph with a QA gate, a treasury copilot, a document reader, a live-rate currency outlook and connected read tools.";

export const Route = createFileRoute("/agents")({
  validateSearch: (s: Record<string, unknown>): { agent?: AgentTab } => (isAgentTab(s["agent"]) ? { agent: s["agent"] } : {}),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentsDesk,
});

function AgentsDesk() {
  const { agent = "graph" } = Route.useSearch();
  const navigate = useNavigate({ from: "/agents" });
  const [more, setMore] = useState(false);
  useEffect(() => {
    setFxPageContext({ desk: "Agent graph desk", code: "USD" });
    recordCapture("Agent graph desk", "open", "Agent desk opened", "USD");
  }, []);

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-6 pt-10">
        <Rule label="Agent desk · architecture · five agents, one screen" />
        <div className="grid items-end gap-6 lg:grid-cols-[1.25fr_1fr]">
          <h1 className="font-display text-5xl leading-[1.02] lg:text-6xl">Five agents. One accountable decision.</h1>
          <div>
            <p className="text-base leading-relaxed text-muted-foreground">
              Pick an agent on the map, run a real question and read the answer with its sources. Every AI call runs on the server; public runs are not saved and nothing is filed or approved.
            </p>
            <dl className="mt-4 grid grid-cols-4 border-t border-rule/30 pt-3">
              {[["4", "AI agents"], ["8", "graph nodes"], ["4", "read tools"], ["1", "human sign-off"]].map(([v, k]) => (
                <div key={k}><dt className="sr-only">{k}</dt><dd><span className="font-display block text-3xl text-primary">{v}</span><span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{k}</span></dd></div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-10">
        <AgentDesk tab={agent} onTab={(t) => void navigate({ search: { agent: t }, replace: true, resetScroll: false })} />
        <p className="mt-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Shareable link: /agents?agent={agent}</p>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <details className="border border-rule/20" onToggle={(e) => setMore((e.currentTarget as HTMLDetailsElement).open)}>
          <summary className="font-mono-ui cursor-pointer px-4 py-3 text-[11px] uppercase tracking-[0.18em] hover:text-primary">
            Graph testing, managed deployment and the filing path
          </summary>
          {more ? (
            <div className="space-y-10 border-t border-rule/20 p-4">
              <div>
                <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  The graph runs through the application server. Managed deployment is a future connection, not an active service. Test results are evidence for review, not legal approval.
                </p>
                <PlatformOps />
              </div>
              <div>
                <Rule label="How an agent answer reaches a filing" />
                <DeskProcess3D desk="treasury" code="USD" />
              </div>
            </div>
          ) : null}
        </details>
      </section>

      <EngineRail desk="treasury" />
    </Frame>
  );
}
