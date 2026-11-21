import { createFileRoute } from "@tanstack/react-router";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { HeadroomInstrument } from "@/components/site/Headroom";
import { HubMap } from "@/components/site/HubMap";
import { HubDesk } from "@/components/site/HubDesk";
import { CurrencyRadar } from "@/components/site/CurrencyRadar";
import { ProofVerifier, RegulatorStrip } from "@/components/site/Proof";
import { Downloads } from "@/components/site/Downloads";
import { Benchmark } from "@/components/site/Benchmark";
import { EngineRail } from "@/components/site/EngineRail";
import { GlobalBenchmarks } from "@/components/site/GlobalBenchmarks";

const TITLE = "CorpVidesh AI — Sovereign Rail for Indian Outbound Capital";
const DESC =
  "A RegTech rail that clears outbound corporate remittances to 52 international finance hubs in minutes, with six Indian regulators on the record at GIFT City.";

export const Route = createFileRoute("/")({
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
  component: Index,
});

const STACK = [
  {
    n: "01",
    t: "Reasoning layer",
    d: "A domain-tuned LLM with retrieval over FEMA, the ODI/OPI Rules 2022, Master Directions, Income-tax s.195 and every applicable DTAA. It cites the provision it relied on, so a lawyer can audit the answer.",
  },
  {
    n: "02",
    t: "Statutory guardrail",
    d: "Deterministic rule code — not the model — decides ceilings, routes and prohibited sectors. The model drafts; the rules engine holds the veto.",
  },
  {
    n: "03",
    t: "Evidence ledger",
    d: "Hyperledger Fabric with the regulator as a channel member. Every document, version and approval is append-only and time-anchored.",
  },
  {
    n: "04",
    t: "Proof layer",
    d: "Groth16 zero-knowledge circuits prove ceiling compliance without revealing the balance sheet behind it.",
  },
  {
    n: "05",
    t: "Sovereign rail",
    d: "India-resident deployment inside the GIFT IFSC perimeter, with AD-bank and regulator endpoints rather than a public API.",
  },
];

function Index() {
  return (
    <Frame>
      <GlobalBenchmarks />
      <section className="mx-auto max-w-[1400px] px-6 pb-16 pt-16">
        <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-primary">
          RegTech infrastructure — outbound capital
        </p>
        <h1 className="font-display mt-5 max-w-5xl text-6xl sm:text-7xl lg:text-[104px]">
          Indian capital should leave the country
          <span className="text-primary"> at the speed of law,</span> not paperwork.
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          CorpVidesh AI is a supervised rail for outbound remittance by the treasuries of India's
          top 1,000 companies by net worth — to 52 international finance hubs, with six Indian
          regulators reading the same record at the same moment.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            to="/console"
            className="border border-primary bg-primary px-6 py-3 font-mono-ui text-[11px] uppercase tracking-[0.18em] text-primary-foreground"
          >
            Open treasury console
          </Link>
          <Link
            to="/supervisor"
            className="border border-rule/30 px-6 py-3 font-mono-ui text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-primary hover:text-primary"
          >
            Enter supervisor view
          </Link>
          <Link
            to="/investors"
            className="border border-rule/30 px-6 py-3 font-mono-ui text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-primary hover:text-primary"
          >
            Investor brief
          </Link>
        </div>

        <div className="mt-14">
          <HeadroomInstrument />
        </div>

        <div className="mt-14">
          <Rule label="52 hubs — pick a corridor and run it live" />
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-display max-w-3xl text-4xl lg:text-5xl">
              Choose any hub, any listed filer, and watch the clearance simulate against the live tape.
            </h2>
          </div>
          <HubDesk />
        </div>

        <div className="mt-16">
          <Rule label="Currency radar — 52 majors against the rupee, 24 × 7" />
          <div className="mb-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            <h2 className="font-display text-4xl lg:text-5xl">
              Every pair a treasury can hold, priced live —
              <span className="text-primary"> and told what to do about it.</span>
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Fifty-two currencies stream against the rupee around the clock. Each line carries a
              twelve-month central and adverse case, a conviction score, a hedge ratio and one
              recommended Overseas Portfolio Investment action — sized against the treasury's own
              budget, and only where the corridor is OPI-eligible under the 2022 Rules.
            </p>
          </div>
          <CurrencyRadar />
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <Rule label="Benchmark — Bloomberg, Reuters, the RBI portal and the rest" />
        <div className="mb-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <h2 className="font-display text-5xl lg:text-6xl">
            They price the money. They receive the form.
            <span className="text-primary"> Nobody else clears the law.</span>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Ten capabilities an outbound Indian filing genuinely needs, scored against the systems a
            treasury already pays for. Click any row to see why it matters, and any column to read what
            that incumbent is superb at — and exactly where it stops.
          </p>
        </div>
        <Benchmark />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <Rule label="The problem" />
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <h2 className="font-display text-5xl lg:text-6xl">
            The money is legal. The proof that it is legal takes twenty-eight days.
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>
              An Indian company investing abroad must satisfy FEMA, the ODI/OPI Rules, its authorised
              dealer bank, the Income-tax Act's withholding regime and a chartered accountant's
              certificate — each on a different document set, none of them talking to the other.
            </p>
            <p>
              Nothing is illegal about the transaction. What is expensive is proving it, again and
              again, on paper, to five parties who each rebuild the same file from scratch.
            </p>
            <p className="border-l-2 border-primary pl-4 text-foreground">
              Capital sits idle while a legal question that a machine can settle in minutes is
              answered by couriered PDFs.
            </p>
          </div>
        </div>
        <div className="mt-12 grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["28 days", "Median clearance for a first-time outbound corridor"],
            ["5 parties", "Rebuilding the same document set independently"],
            ["9 stages", "From board resolution to FIRC reconciliation"],
            ["₹6–8k Cr", "Annual value released if the wait collapses"],
          ].map(([k, v]) => (
            <div key={k} className="bg-background p-6">
              <p className="font-display text-4xl text-primary">{k}</p>
              <p className="mt-2 text-sm text-muted-foreground">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <Rule label="52 hubs — routing map" />
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-display max-w-3xl text-5xl lg:text-6xl">
            Every corridor out of GIFT City, with the law already attached.
          </h2>
          <Link
            to="/hubs"
            className="font-mono-ui border-b border-primary pb-1 text-[11px] uppercase tracking-[0.18em] text-primary"
          >
            View all 52 as a table
          </Link>
        </div>
        <HubMap />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <Rule label="Six regulators, one record" />
        <h2 className="font-display mb-8 max-w-4xl text-5xl lg:text-6xl">
          Supervision, not reporting.
        </h2>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Existing systems tell the regulator what happened after it happened. On this rail the
          regulator is a participant in the record while the transaction is still forming — reading
          the same ledger the treasury writes to.
        </p>
        <RegulatorStrip />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <Rule label="Technology — and why this technology" />
        <h2 className="font-display mb-10 max-w-4xl text-5xl lg:text-6xl">
          Five layers. Each chosen because a regulator would refuse the alternative.
        </h2>
        <div className="grid gap-px bg-rule/15 md:grid-cols-2 lg:grid-cols-5">
          {STACK.map((s) => (
            <div key={s.n} className="bg-background p-6">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">
                {s.n}
              </p>
              <p className="font-display mt-3 text-2xl">{s.t}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <Rule label="Proof, not disclosure" />
        <ProofVerifier />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <Rule label="Who this is for" />
        <div className="grid gap-px bg-rule/15 md:grid-cols-3">
          {[
            [
              "Treasuries of the top 1,000",
              "Listed and unlisted Indian companies by net worth, running outbound investment programmes across multiple jurisdictions and subsidiaries.",
            ],
            [
              "Authorised dealer banks",
              "AD Category-I desks that today rebuild every file by hand and carry the compliance risk of a client's paperwork.",
            ],
            [
              "Regulators at GIFT City",
              "IFSCA, RBI, SEBI, MCA and CBDT touchpoints that gain live visibility instead of retrospective returns.",
            ],
          ].map(([t, d]) => (
            <div key={t} className="bg-background p-8">
              <p className="font-display text-3xl">{t}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="border border-primary p-10">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">
            GIFT City pilot
          </p>
          <h2 className="font-display mt-4 max-w-4xl text-5xl lg:text-6xl">
            One corridor, one quarter, one regulator on the ledger.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            The prototype runs the GIFT IFSC to Singapore corridor end to end — board resolution,
            Rule 7 proof, 15CA/15CB pairing, AD bank execution and FIRC reconciliation — with the
            supervisor view live throughout.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/console"
              className="border border-primary bg-primary px-6 py-3 font-mono-ui text-[11px] uppercase tracking-[0.18em] text-primary-foreground"
            >
              Walk the nine stages
            </Link>
            <Link
              to="/investors"
              className="border border-rule/30 px-6 py-3 font-mono-ui text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-primary hover:text-primary"
            >
              Read the investor brief
            </Link>
            <Link
              to="/gift"
              className="border border-rule/30 px-6 py-3 font-mono-ui text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-primary hover:text-primary"
            >
              Open the GIFT desk
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <Downloads />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-20">
        <Rule label="Every desk on the rail — one click away" />
        <div className="mb-10">
          <DeskProcess3D desk="rail" />
        </div>
        <EngineRail desk="rail" />
      </section>
    </Frame>
  );
}
