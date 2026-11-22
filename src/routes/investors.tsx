import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, Network, Scale, FileCheck2 } from "lucide-react";
import { InvestorReadiness } from "@/components/site/InvestorReadiness";
import teamVideo from "@/assets/corpvidesh-team-video.mp4.asset.json";

const TITLE = "Investor Brief — Advanced Treasury Proof of Concept | CorpVidesh AI";
const DESC =
  "A compact investor workspace for CorpVidesh AI: treasury decision tools, evidence, proposed business model and a clearly bounded pilot plan.";

export const Route = createFileRoute("/investors")({
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
  component: Investors,
});

const WHY_NOW = [
  [
    "The rules were rewritten in 2022",
    "The FEM (Overseas Investment) Rules, 2022 replaced a two-decade regime with a codified, machine-readable structure — ceilings, routes and reporting that can be expressed as deterministic code for the first time.",
  ],
  [
    "GIFT IFSC became a real perimeter",
    "A single jurisdiction now hosts the regulators, the AD banks and the offshore vehicles. One place to pilot a supervised rail, with the supervisor physically in the room.",
  ],
  [
    "Models became auditable enough for law",
    "Retrieval with provision-level citation, plus a deterministic rules engine holding the veto, is the first configuration a regulator will accept. The model drafts; it never decides.",
  ],
  [
    "Indian outbound stopped being occasional",
    "Top-1,000 treasuries now run continuous overseas programmes — step-downs, top-ups, APR cycles. Recurring workflow, not a once-a-decade event. That is what makes it software.",
  ],
];

const MARKET = [
  ["212", "Investment scenarios", "ODI/OPI choices with eligibility review, not a list of permitted investments."],
  ["62", "Financial hubs", "52 global hubs plus 10 African SADC/COMESA hubs, with measured currency risk."],
  ["4", "Service domains", "Legal, filings, market evidence and agent orchestration in one deployment."],
  ["4", "Secure workspaces", "Corporate treasury, fund investor, GIFT review and Form FC register, each account-protected."],
];

const MODEL = [
  [
    "Rail subscription",
    "Annual per-entity licence for the treasury console, scaled by group structure and corridor count.",
    "Recurring",
  ],
  [
    "Per-clearance fee",
    "A fee on each cleared remittance file, priced against the counsel and bank-desk hours it removes.",
    "Usage",
  ],
  [
    "AD-bank desk seats",
    "Seat licences for AD Category-I compliance desks that receive pre-validated bundles instead of raw folders.",
    "Recurring",
  ],
  [
    "Supervisory node",
    "Regulator-side deployment supplied at cost — distribution and defensibility, not a revenue line.",
    "Strategic",
  ],
];

const COMPETITORS = [
  "CorpVidesh AI",
  "Bloomberg",
  "Reuters / LSEG",
  "Global RegTech",
  "AD-bank portals",
  "India SaaS",
];

const MATRIX: [string, (0 | 1 | 2)[]][] = [
  ["FEMA / ODI-OPI statutory reasoning with citation", [2, 0, 0, 0, 0, 1]],
  ["Rule 7 ceiling computed at group level", [2, 0, 0, 0, 1, 1]],
  ["Automatic vs approval route determination", [2, 0, 0, 0, 1, 1]],
  ["Zero-knowledge proof of compliance", [2, 0, 0, 0, 0, 0]],
  ["Regulator as a member of the ledger", [2, 0, 0, 0, 0, 0]],
  ["s.195 / DTAA position and 15CA-15CB pairing", [2, 0, 0, 0, 1, 2]],
  ["Append-only evidence bundle per remittance", [2, 0, 0, 1, 0, 0]],
  ["Entity screening and reference data", [1, 2, 2, 2, 1, 1]],
  ["India-resident sovereign deployment", [2, 0, 0, 0, 2, 2]],
];

const MARK = ["Absent", "Partial", "Native"] as const;

const ROADMAP = [
  ["Now", "Prototype", "Treasury console, 62-hub atlas, top-1,000 company scenarios, six-regulator desk, hedge contract builder and secure portals — running end to end as demonstrations."],
  ["Q+1", "GIFT pilot", "One corridor, GIFT IFSC to Singapore, with one AD bank and one supervisory observer on the ledger."],
  ["Q+2", "Second corridor & bank", "Prove the rail is corridor-agnostic. Onboard the first paying treasuries from the top 200 by net worth."],
  ["Q+3", "Supervisory node", "Formal regulator channel membership, live APR and reporting automation across the onboarded cohort."],
  ["Q+4", "Scale", "All 52 corridors, multi-bank routing, and continuing-compliance calendars as the retention surface."],
];

const RISKS = [
  ["Regulatory adoption", "The rail is useless without a supervisor on it. Mitigated by building the GIFT pilot around a single named corridor and a single observer, not a policy change."],
  ["Model reliability in law", "Mitigated architecturally: the model never holds the veto. Deterministic rule code decides every ceiling, route and prohibition."],
  ["Bank inertia", "Mitigated by making the AD desk the immediate beneficiary — they receive a complete, pre-validated bundle and carry less risk, not more work."],
  ["Data sensitivity", "Mitigated by zero-knowledge disclosure: the ceiling is proved without the balance sheet leaving the entity."],
];

function Investors() {
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-8 pt-8">
        <Rule label="Investor brief / Advanced proof of concept" />
        <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-primary">
          Treasury intelligence · statutory evidence · secure filings
        </p>
        <h1 className="font-display mt-4 max-w-5xl text-5xl tracking-normal sm:text-6xl">
          CorpVidesh AI <span className="text-primary">/ Advanced prototype.</span>
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          A connected decision workspace for Indian corporate treasuries: currency outlooks,
          ODI/OPI review, legal evidence and secure demonstration filings.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild><Link to="/intelligence">Open prediction <ArrowUpRight className="size-4" /></Link></Button>
          <Button variant="outline" asChild><Link to="/architecture">Inspect architecture <Network className="size-4" /></Link></Button>
          <Button variant="outline" asChild><Link to="/console" search={{ view: "filings" }}>Corporate filings <FileCheck2 className="size-4" /></Link></Button>
        </div>
        <div className="mt-6 border-l-2 border-primary pl-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Proof boundary:</span> provider-backed market evidence and Cloud-stored demo records are connected.
          Official bank execution, regulator approvals, production ZK assurance and certified current-law coverage are not established.
          Historical timing, impact and competitive claims below are presentation hypotheses, not verified outcomes.
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MARKET.map(([k, t, d]) => (
            <div key={t} className="bg-background p-6">
              <p className="font-display text-5xl text-primary">{k}</p>
              <p className="font-mono-ui mt-3 text-[10px] uppercase tracking-[0.16em]">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <InvestorReadiness />

      <section className="mx-auto max-w-[1400px] px-6 pb-8">
        <Rule label="Team video / 3-minute brief" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div className="border border-rule/25 bg-background p-2">
            <video
              controls
              preload="metadata"
              className="aspect-video w-full"
              src={teamVideo.url}
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div>
            <h2 className="font-display text-3xl tracking-normal sm:text-4xl">
              Hear it from <span className="text-primary">Team Quantum Leap.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Raja Mukherjee, Priyanshu Dhar and Aditi Kulkarni explain the idea behind
              CorpVidesh AI, how the outbound-capital bottleneck was identified, the
              proposed approach, and each member&rsquo;s contribution — in three minutes.
            </p>
            <p className="mt-4 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
              Regulator clearances shown or described in the video are simulations of a
              proposed workflow, not official approvals.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-7">
        <div className="grid gap-5 md:grid-cols-3">
          {[{ icon: Scale, title: "Decide", text: "Conditional outlook, headroom and cited review findings.", to: "/console" }, { icon: FileCheck2, title: "Evidence", text: "Company-scoped filing records, dates and officer accountability.", to: "/filings" }, { icon: Network, title: "Verify", text: "Service boundaries, agent QA and explicit integration status.", to: "/architecture" }].map((item) => <Link key={item.title} to={item.to} className="group border-t-2 border-rule py-4 transition-colors hover:border-primary"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><h2 className="font-display min-w-0 text-2xl tracking-normal">{item.title}</h2><item.icon className="size-5 shrink-0 text-primary" /></div><p className="mt-2 text-sm text-muted-foreground">{item.text}</p></Link>)}
        </div>
      </section>
      <div className="mx-auto max-w-[1400px] px-6">
      <Tabs defaultValue="thesis">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="thesis">Investment thesis</TabsTrigger><TabsTrigger value="model">Commercial model</TabsTrigger><TabsTrigger value="proof">Competitive evidence</TabsTrigger><TabsTrigger value="execution">Pilot & team</TabsTrigger>
        </TabsList>
        <TabsContent value="thesis">
      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <Rule label="Why now" />
        <h2 className="font-display mb-6 max-w-4xl text-3xl tracking-normal sm:text-4xl">
          Four things became true at once. None of them were true in 2019.
        </h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {WHY_NOW.map(([t, d]) => (
            <div key={t} className="bg-background p-6">
              <p className="font-display text-2xl leading-tight">{t}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <Rule label="The wedge" />
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <h2 className="font-display text-3xl tracking-normal sm:text-4xl">
            Start where the pain is measurable and the buyer signs alone.
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>
              The entry point is not a platform sale. It is one corridor — GIFT IFSC to Singapore —
              for one treasury that already knows how many weeks it loses per file and what its
              counsel invoice looks like.
            </p>
            <p>
              The treasury signs without a regulatory change, because nothing about the rail asks
              for permission the law does not already grant. The AD bank joins because it receives
              a complete file instead of assembling one. The regulator joins last, and joins free.
            </p>
            <p className="border-l-2 border-primary pl-4 text-foreground">
              Once the first supervisor reads a live ledger, every subsequent corridor is a
              configuration change, not a new sale.
            </p>
          </div>
        </div>
      </section>

        </TabsContent>
        <TabsContent value="model">
      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <Rule label="Business model / proposed" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {MODEL.map(([t, d, tag]) => (
            <div key={t} className="bg-background p-6">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                {tag}
              </p>
              <p className="font-display mt-3 text-3xl">{t}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
          In plain words: the treasury pays to keep the rail, pays a little each time it uses it,
          and the bank pays for its desk. The regulator never pays — its presence is what makes
          the rail worth paying for.
        </p>
      </section>

        </TabsContent>
        <TabsContent value="proof">
      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <Rule label="Competitive matrix" />
        <h2 className="font-display mb-4 max-w-4xl text-3xl tracking-normal sm:text-4xl">
          Everyone else sells data or forms. Nobody else sells the determination.
        </h2>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Bloomberg and Reuters/LSEG are reference and screening businesses — they tell you who a
          counterparty is. They do not tell you whether Rule 7 permits the remittance, and they
          cannot prove it to a supervisor.
        </p>
        <div className="overflow-x-auto border border-rule/20">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="font-mono-ui px-4 py-3 text-left text-[10px] uppercase tracking-[0.14em]">
                  Capability
                </th>
                {COMPETITORS.map((c) => (
                  <th
                    key={c}
                    className="font-mono-ui whitespace-nowrap px-4 py-3 text-left text-[10px] uppercase tracking-[0.14em]"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map(([cap, scores]) => (
                <tr key={cap} className="border-t border-rule/12">
                  <td className="px-4 py-3 leading-snug">{cap}</td>
                  {scores.map((s, i) => (
                    <td key={COMPETITORS[i]} className="px-4 py-3">
                      <span
                        className={`font-mono-ui inline-block border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${
                          s === 2
                            ? "border-primary bg-primary text-primary-foreground"
                            : s === 1
                              ? "border-rule/40 text-foreground"
                              : "border-rule/20 text-muted-foreground"
                        }`}
                      >
                        {MARK[s]}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["Law, not templates", "Competitors ship forms and checklists. This rail reasons over the statute and cites the provision it relied on."],
            ["Supervision, not reporting", "Everyone else tells the regulator afterwards. Here the regulator reads the record while the transaction is still forming."],
            ["Proof, not disclosure", "A Groth16 circuit proves the ceiling holds without exposing the balance sheet behind it. No competitor offers this."],
          ].map(([t, d]) => (
            <div key={t} className="bg-background p-6">
              <p className="font-display text-3xl">{t}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

        </TabsContent>
        <TabsContent value="execution">
      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <Rule label="Roadmap" />
        <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-5">
          {ROADMAP.map(([w, t, d]) => (
            <div key={t} className="bg-background p-6">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">{w}</p>
              <p className="font-display mt-3 text-2xl">{t}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <Rule label="Risk register" />
        <div className="grid gap-5 md:grid-cols-2">
          {RISKS.map(([t, d]) => (
            <div key={t} className="bg-background p-6">
              <p className="font-display text-3xl">{t}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <Rule label="Team Quantum Leap — Department of Law, Brainware University" />
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Raja Mukherjee", "Team Lead", "BWU/BBL/25/002", "Regulatory architecture, Rule 7 logic and the supervisory model."],
            ["Priyanshu Dhar", "Team Co-Lead", "BWU/BBL/24/158", "Corridor research, treaty and s.195 positions across the 52 hubs."],
            ["ADITI KULKARNI", "Concept and Corporate Law Support", "BWU/BBL/25/081", "Corporate law research, FEMA compliance narrative and statutory drafting support."],
          ].map(([n, r, c, d]) => (
            <div key={n} className="bg-background p-5">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">{r}</p>
              <p className="font-display mt-3 text-3xl">{n}</p>
              <p className="font-mono-ui tnum mt-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {c}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="border-t-2 border-primary pt-6">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">
            The ask
          </p>
          <h2 className="font-display mt-4 max-w-4xl text-3xl tracking-normal sm:text-4xl">
            Fund one corridor. Everything after it is configuration.
          </h2>
          <div className="mt-9 grid gap-5 sm:grid-cols-3">
            {[
              ["Use of funds — build", "Rules engine coverage across all 52 corridors, ledger hardening and the supervisory node."],
              ["Use of funds — pilot", "One AD bank, one treasury, one GIFT IFSC corridor run end to end with a supervisor observing."],
              ["Use of funds — counsel", "Standing regulatory counsel to keep the deterministic rule code aligned with every amendment."],
            ].map(([t, d]) => (
              <div key={t} className="bg-background p-6">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">{t}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-3xl border-l-2 border-primary pl-4 text-base leading-relaxed">
            In plain words: this is not a bet on whether Indian companies will invest abroad — they
            already do, lawfully, every week. It is a bet that proving it should take minutes
            instead of a month, and that whoever owns that proof owns the corridor.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/supervisor"
              className="font-mono-ui border border-primary bg-primary px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-primary-foreground"
            >
              Enter the supervisor view
            </Link>
            <Link
              to="/hubs"
              className="font-mono-ui border border-rule/30 px-6 py-3 text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-primary hover:text-primary"
            >
              Browse all 52 corridors
            </Link>
          </div>
        </div>
      </section>
        </TabsContent>
      </Tabs>
      </div>
    </Frame>
  );
}