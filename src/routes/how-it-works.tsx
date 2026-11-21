import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { AboutNav } from "@/components/site/AboutNav";
import { DIAGRAMS, DIAGRAM_IDS, StageTable, type DiagramId } from "@/components/site/ArchitectureDiagrams";

const TITLE = "Architecture & Functional Diagrams — CorpVidesh AI";
const DESC =
  "Five detailed diagrams of CorpVidesh AI: system layers, eight-step functional flow, who-does-what swimlanes, the multi-agent graph and the hash-chained trust model.";

export const Route = createFileRoute("/how-it-works")({
  validateSearch: (s: Record<string, unknown>): { d?: DiagramId } =>
    DIAGRAM_IDS.includes(s["d"] as DiagramId) ? { d: s["d"] as DiagramId } : {},
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
  component: HowItWorks,
});

function HowItWorks() {
  const { d } = Route.useSearch();
  const navigate = useNavigate({ from: "/how-it-works" });
  const current = DIAGRAMS.find((x) => x.id === d) ?? DIAGRAMS[0]!;
  const pick = (id: DiagramId) => navigate({ search: { d: id }, replace: true, resetScroll: false });
  const Svg = current.svg;
  return (
    <Frame>
      <AboutNav />
      <section className="mx-auto max-w-[1400px] px-6 pb-6 pt-12">
        <Rule label="About · 02 — Architecture & functional diagrams" />
        <h1 className="font-display max-w-5xl text-5xl leading-[1.02] sm:text-6xl">
          How CorpVidesh AI works,
          <span className="text-primary"> drawn to the grid.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Choose a diagram from the menu. Each one explains how every stage is used and how it connects to the rest of the platform, with a link to the working desk.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-10">
        <div className="flex flex-col gap-3 border-y border-rule/20 py-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex items-center gap-3">
            <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">Choose diagram</span>
            <select
              value={current.id}
              onChange={(e) => pick(e.target.value as DiagramId)}
              className="font-mono-ui border border-foreground bg-background px-3 py-2 text-[11px] uppercase tracking-[0.12em]"
            >
              {DIAGRAMS.map((x) => <option key={x.id} value={x.id}>{x.n} · {x.title}</option>)}
            </select>
          </label>
          <div role="tablist" aria-label="Diagrams" className="hidden flex-wrap gap-px bg-rule/15 lg:flex">
            {DIAGRAMS.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={x.id === current.id} onClick={() => pick(x.id)}
                className={`font-mono-ui px-3 py-2 text-[10px] uppercase tracking-[0.12em] ${x.id === current.id ? "bg-primary text-primary-foreground" : "bg-background hover:text-primary"}`}>
                {x.n} {x.title}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border border-rule/20">
          <div className="flex flex-wrap items-baseline justify-between gap-2 bg-foreground px-5 py-3 text-background">
            <p className="font-display text-xl">{current.n} · {current.title}</p>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] opacity-80">{current.kicker}</p>
          </div>
          <div className="p-4 sm:p-6"><Svg /></div>
          <p className="border-t border-rule/15 px-5 py-3 text-xs text-muted-foreground">Boundary: {current.boundary}</p>
        </div>

        <div className="mt-10"><Rule label={`Usage & integration — ${current.title.toLowerCase()}`} /></div>
        <StageTable stages={current.stages} />

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/compare" className="font-mono-ui border border-foreground px-5 py-3 text-[11px] uppercase tracking-[0.16em]">Compare with competitors →</Link>
          <Link to="/architecture" className="font-mono-ui px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-primary">Full feasibility dossier →</Link>
        </div>
      </section>
    </Frame>
  );
}
