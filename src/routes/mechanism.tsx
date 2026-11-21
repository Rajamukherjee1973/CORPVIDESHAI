import { ForecastLede } from "@/components/site/ForecastLede";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Frame, Rule } from "@/components/site/Frame";
import { ControlMatrix, LayerStack } from "@/components/site/MechanismLayers";
import { MechanismChain3D } from "@/components/site/MechanismChain3D";
import { LAYERS } from "@/lib/mechanism";

const TITLE = "Mechanism Matrix — CorpVidesh AI | Layer-by-layer rail architecture";
const DESC =
  "The seven layers of the CorpVidesh AI outbound rail, explained one at a time: what enters, what the layer does, what technology carries it, what leaves, and how long it takes.";

export const Route = createFileRoute("/mechanism")({
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
  component: Mechanism,
});

function Mechanism() {
  const [active, setActive] = useState<string>("L1");
  const i = Math.max(0, LAYERS.findIndex((l) => l.id === active));
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-12 pt-14">
        <Rule label="Mechanism Matrix — seven layers, one record" />
        <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-primary">
          Architecture of the outbound rail
        </p>
        <h1 className="font-display mt-5 max-w-5xl text-6xl sm:text-7xl lg:text-[92px]">
          Every layer states what enters, what it decides,
          <span className="text-primary"> and what it can never do.</span>
        </h1>
        <p className="mt-7 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          The rail is not one model answering one question. It is seven layers, each with a single
          responsibility, a named owner, a declared technology and a failure position. A layer may
          only pass forward what the layer before it sealed.
        </p>

        <div className="mt-12 grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["7", "Sequenced layers", "Each one seals its output before the next may read it."],
            ["9 min", "End-to-end clearance", "Against 28 days across five parties working in sequence."],
            ["1", "Model in the path", "Statutory drafting only. Rule code holds every veto."],
            ["100%", "Checkpoints proved", "Every layer commits a hash-chained, verifiable artefact."],
          ].map(([k, t, d]) => (
            <div key={t} className="bg-background p-6">
              <p className="font-display text-5xl text-primary">{k}</p>
              <p className="font-mono-ui mt-3 text-[10px] uppercase tracking-[0.16em]">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="Mechanism" focus={["clearance", "cost"]} />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Layer by layer" />
        <h2 className="font-display mb-3 max-w-4xl text-5xl lg:text-6xl">
          One chain. Open a layer to see its contract.
        </h2>
        <p className="mb-9 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Input, action, output, technology, owner, and the position it takes when something is
          unclear. Nothing in the rail operates without all six being stated.
        </p>

        <MechanismChain3D activeId={active} onActive={setActive} />

        <div className="mt-px flex flex-wrap items-center gap-3 border border-t-0 border-rule/20 p-4">
          <button
            type="button"
            disabled={i === 0}
            onClick={() => setActive(LAYERS[i - 1]!.id)}
            className="font-mono-ui border border-rule/30 px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary disabled:opacity-30"
          >
            ← Previous layer
          </button>
          <button
            type="button"
            disabled={i === LAYERS.length - 1}
            onClick={() => setActive(LAYERS[i + 1]!.id)}
            className="font-mono-ui border border-rule/30 px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary disabled:opacity-30"
          >
            Next layer →
          </button>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Layer {LAYERS[i]!.n} of 07 — {LAYERS[i]!.role} It cannot begin until layer{" "}
            {i === 0 ? "zero (the treasury intake)" : LAYERS[i - 1]!.n} has sealed its output.
          </p>
        </div>

        <div className="mt-8">
          <LayerStack open={active} onOpenChange={(id) => setActive(id || active)} />
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Cross-layer control matrix" />
        <h2 className="font-display mb-9 max-w-4xl text-5xl lg:text-6xl">
          Where judgement is allowed, and where it is forbidden.
        </h2>

        <ControlMatrix />

        <p className="mt-6 max-w-3xl border-l-2 border-primary pl-4 text-base leading-relaxed">
          Read the second column downward: the model appears once. Every layer that decides a
          ceiling, a route or a prohibition is fully deterministic. That single property is what
          makes the rail presentable to a supervisor.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Time ledger" />
        <div className="grid gap-px bg-rule/15 lg:grid-cols-2">
          <div className="bg-background p-8">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
              Automated rail
            </p>
            <p className="font-display mt-3 text-7xl text-primary">9 min</p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Seven layers running in sequence, each sealing a proved artefact, with all six
              authorities and the AD bank reading the same record as it forms.
            </p>
          </div>
          <div className="bg-background p-8">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em]">Manual practice</p>
            <p className="font-display mt-3 text-7xl">28 days</p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              The same file rebuilt five times by counsel, the treasury, the AD desk and two
              regulators — sequentially, each waiting on the last.
            </p>
          </div>
        </div>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            to="/apply"
            className="font-mono-ui border border-primary bg-primary px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-primary-foreground"
          >
            Watch the rail run live
          </Link>
          <Link
            to="/investors"
            className="font-mono-ui border border-rule/30 px-6 py-3 text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-primary hover:text-primary"
          >
            Investor brief
          </Link>
        </div>
      </section>
    </Frame>
  );
}
