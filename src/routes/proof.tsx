import { ForecastLede } from "@/components/site/ForecastLede";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { Benchmark } from "@/components/site/Benchmark";
import { ProofWalkthrough } from "@/components/site/ProofWalkthrough";
import { StageScaleBoard } from "@/components/site/StageScaleBoard";
import { PROOF_SCENARIOS } from "@/lib/proof-scenarios";

const TITLE = "Proof Desk — CorpVidesh AI vs Bloomberg, Reuters, FIRMS, SWIFT gpi";
const DESC =
  "Five outbound cases walked step by step on both rails: what Bloomberg, Reuters/LSEG, RBI FIRMS, ClearTax/Signzy and SWIFT gpi each produce, and what the CorpVidesh AI rail produces instead.";

export const Route = createFileRoute("/proof")({
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
  component: Proof,
});

function Proof() {
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-12 pt-14">
        <Rule label="Proof desk — five cases, both rails, side by side" />
        <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-primary">
          Uniqueness, demonstrated rather than asserted
        </p>
        <h1 className="font-display mt-5 max-w-5xl text-6xl sm:text-7xl lg:text-[92px]">
          Seven stages. One record.
          <span className="text-primary"> Watch where each incumbent stops.</span>
        </h1>
        <p className="mt-7 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Each scenario below is a real outbound situation an Indian treasury faces. We state fairly
          what the incumbent system is excellent at, then walk the case one step at a time on both
          rails — who acts, at what clock offset, and what artefact exists at the end of the step.
        </p>

        <div className="mt-12 grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["5", "Incumbents walked", "Bloomberg, LSEG, FIRMS, Indian toolkits, SWIFT gpi."],
            ["22", "Compared steps", "Each with an actor, a clock offset and a produced artefact."],
            ["28d → 9m", "Longest gap closed", "The Singapore infusion case, end to end."],
            ["1", "Record", "Every lane reads the same append-only file as it forms."],
          ].map(([k, t, d]) => (
            <div key={t} className="bg-background p-6">
              <p className="font-display text-4xl text-primary">{k}</p>
              <p className="font-mono-ui mt-3 text-[10px] uppercase tracking-[0.16em]">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Stage-by-stage scale board" />
        <h2 className="font-display mb-3 max-w-4xl text-5xl lg:text-6xl">Every stage, every global incumbent.</h2>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Global leaders excel inside one stage each. CorpVidesh AI carries the same case through all seven. Click a stage to see what changes.
        </p>
        <StageScaleBoard />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="Proof desk" focus={["clearance", "cost"]} />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Interactive walkthroughs" />
        <h2 className="font-display mb-3 max-w-4xl text-5xl lg:text-6xl">
          Pick an incumbent, then step the case.
        </h2>
        <p className="mb-9 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Play runs the walkthrough automatically; Back and Next let you hold a step on screen while
          you explain it. The left lane is the incumbent path as it is worked today. The right lane
          is this rail.
        </p>
        <ProofWalkthrough />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Capability matrix behind the walkthroughs" />
        <h2 className="font-display mb-9 max-w-4xl text-5xl lg:text-6xl">
          The same conclusion, read as a matrix.
        </h2>
        <Benchmark />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Verdicts in one place" />
        <div className="grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-3">
          {PROOF_SCENARIOS.map((s) => (
            <div key={s.key} className="bg-background p-6">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
                vs {s.rivalShort}
              </p>
              <p className="mt-2 text-sm font-medium leading-snug">{s.rival}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.verdict}</p>
            </div>
          ))}
          <div className="bg-background p-6">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
              Take the case further
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/routes"
                className="font-mono-ui border border-primary bg-primary px-5 py-2.5 text-center text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
              >
                Execute a route live
              </Link>
              <Link
                to="/casefile"
                className="font-mono-ui border border-rule/30 px-5 py-2.5 text-center text-[11px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary"
              >
                Open the worked case file
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Continue on the rail" />
        <div className="mb-10">
          <DeskProcess3D desk="rail" />
        </div>
        <EngineRail desk="rail" />
      </section>
    </Frame>
  );
}
