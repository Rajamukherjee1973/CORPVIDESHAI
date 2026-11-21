import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { PredictiveCases } from "@/components/site/PredictiveCases";

const TITLE = "Predictive Intelligence Cases for Large Indian Corporates | CorpVidesh AI";
const DESC =
  "Six worked cases showing how a large Indian corporate treasury can see ceiling breaches, FX exposure, regulator queries, bank spread and clearance time before committing money abroad.";

export const Route = createFileRoute("/predictive-cases")({
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
  component: PredictiveCasesPage,
});

const LENSES = [
  ["Statutory headroom", "Will this ticket push us over the 400% (direct) or 50% (portfolio) ceiling?"],
  ["FX drift", "How much can the currency move while the file waits?"],
  ["Query risk", "How likely is a regulator query, and which document causes it?"],
  ["All-in cost", "Is the bank's conversion margin fair for this corridor?"],
  ["Clearance time", "How long will this file take, and what shortens it?"],
];

function PredictiveCasesPage() {
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-8 pt-14">
        <Rule label="Intelligence · Predictive cases" />
        <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-primary">For CFOs and treasury heads of large corporates</p>
        <h1 className="font-display mt-5 max-w-5xl text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
          Six decisions a treasury can see
          <span className="text-primary"> before it makes them.</span>
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Each case is a real kind of outbound decision a top-1,000 Indian company faces. The rail runs it through five forecasts
          on today's exchange rate and returns one verdict — release, fix first or hold — with the single action that changes the outcome.
          Move the sliders to see the forecast respond.
        </p>
        <ol className="mt-8 grid gap-px bg-rule/15 sm:grid-cols-5">
          {LENSES.map(([k, v], i) => (
            <li key={k} className="bg-background p-4">
              <span className="font-mono-ui text-[10px] text-primary">{String(i + 1).padStart(2, "0")}</span>
              <p className="font-mono-ui mt-1 text-[11px] uppercase tracking-[0.12em]">{k}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{v}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <PredictiveCases />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Method and limits" />
        <div className="grid gap-6 text-sm leading-relaxed text-muted-foreground md:grid-cols-3">
          <p>
            <span className="block font-mono-ui text-[10px] uppercase tracking-[0.16em] text-foreground">Same engine as the desk</span>
            Every number comes from the forecast engine behind the{" "}
            <Link to="/intelligence" search={{ view: "forecast" }} className="text-primary underline-offset-2 hover:underline">prediction surface</Link>,
            using the current indicative exchange rate. The drivers behind each figure are shown so anyone can reproduce it.
          </p>
          <p>
            <span className="block font-mono-ui text-[10px] uppercase tracking-[0.16em] text-foreground">Illustrative companies</span>
            Company profiles, net worth and existing commitments are illustrative examples, not any named company's plans or filed
            accounts. Ceilings follow the FEM (Overseas Investment) Rules, 2022.
          </p>
          <p>
            <span className="block font-mono-ui text-[10px] uppercase tracking-[0.16em] text-foreground">Not advice or approval</span>
            Forecasts are rule-based estimates, not yet validated against real filing outcomes. They are not investment, tax or legal
            advice, and regulator clearance on this site is simulated.
          </p>
        </div>
      </section>
    </Frame>
  );
}
