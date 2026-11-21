import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { AboutNav } from "@/components/site/AboutNav";
import { OdiSectorHistory } from "@/components/site/OdiSectorHistory";

const TITLE = "Why CorpVidesh AI — one rail for Indian outbound capital";
const DESC =
  "Why Indian treasuries, AD banks and regulators need one pre-validated record for ODI and OPI outbound investment, with 26 years of official sector-wise rupee outflow data, the problem, the answer and what is proven today.";

export const Route = createFileRoute("/why")({
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
  component: WhyPage,
});

const PROBLEMS = [
  ["Sequential desks", "Treasury, AD bank and each authority review the same case one after another, each re-keying the facts."],
  ["Scattered evidence", "Board resolutions, valuations, KYC and tax forms travel by email; no single record shows who decided what, when."],
  ["Late rule checks", "Financial-commitment ceilings, route conditions and treaty tax are often tested after the money plan is set."],
  ["No shared clock", "Nobody can see where a case sits; team planning estimates put typical turnaround at weeks, not hours."],
];

const DIFFERENTIATORS = [
  { n: "01", h: "Statute reasoning inside the case", d: "Automatic vs Approval triage with cited FEMA and OI Rules 2022 provisions, run on the actual deal amount and hub.", to: "/routes", desk: "Route intake" },
  { n: "02", h: "One record, six lanes", d: "A single dossier opens parallel lanes for the six authorities instead of six separate submissions.", to: "/regulator-portal", desk: "Regulator portal" },
  { n: "03", h: "Gated document checklist", d: "Each document is tied to the rule that needs it and blocks filing until acknowledged.", to: "/console", desk: "Clearance studio" },
  { n: "04", h: "Tamper-evident trail", d: "Append-only events with a SHA-256 hash chain — any later edit to an earlier step becomes visible.", to: "/gift-portal", desk: "GIFT portal" },
  { n: "05", h: "Market context per case", d: "52-hub INR board, global benchmarks and conditional FX outlooks attached to the specific transfer.", to: "/intelligence", desk: "Prediction & FX" },
  { n: "06", h: "Agents with a veto", d: "Specialist AI agents answer with sources; a quality veto fails closed rather than guessing.", to: "/agents", desk: "Agent desk" },
];

const AUDIENCES = [
  ["Corporate treasuries", "Top-1,000 listed and large unlisted companies planning ODI or OPI across 52 hubs.", "Faster preparation, fewer re-submissions, one proof packet for the board."],
  ["AD Category-I banks", "Authorised dealers who verify, countersign and release outbound remittances.", "Pre-validated files with documents already gated to the rule."],
  ["Six Indian regulators", "RBI, IFSCA, Ministry of Finance, FIU-IND, DPIIT and CBDT (proposed supervisory lanes).", "One shared, tamper-evident view instead of fragmented paperwork."],
  ["GIFT IFSC & funds", "IFSC banking units and fund investors routing proposals through GIFT City.", "Trackable references and a reviewer workflow that enforces order."],
];

function WhyPage() {
  return (
    <Frame>
      <AboutNav />
      <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-12">
        <Rule label="About · 01 — Why CorpVidesh AI" />
        <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-primary">RegTech for Indian outbound capital</p>
        <h1 className="font-display mt-5 max-w-5xl text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
          One pre-validated record.
          <span className="text-primary"> Every desk reads the same file.</span>
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          CorpVidesh AI turns an outbound investment — a company, a hub, an amount and a reason — into one case that is checked
          against the statute, gated by documents, reviewed in parallel and sealed with a tamper-evident trail.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/book-demo" className="font-mono-ui bg-primary px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-primary-foreground">Book a demo</Link>
          <Link to="/how-it-works" className="font-mono-ui border border-foreground px-5 py-3 text-[11px] uppercase tracking-[0.16em]">See the architecture</Link>
          <Link to="/access" className="font-mono-ui px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-primary">Try it now →</Link>
        </div>
        <div className="mt-12 grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
          {[["52", "Financial hubs", "Each linked to its currency, treaty and arrangement indicators."], ["6", "Authority lanes", "Parallel review on one dossier (proposed model)."], ["212", "ODI / OPI purposes", "Investment classes mapped to route and documents."], ["1", "Shared record", "Append-only, hash-chained, company-scoped."]].map(([k, t, d]) => (
            <div key={t} className="bg-background p-6">
              <p className="font-display text-4xl text-primary">{k}</p>
              <p className="font-mono-ui mt-3 text-[10px] uppercase tracking-[0.16em]">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <OdiSectorHistory />

      <section className="mx-auto max-w-[1400px] px-6 py-10">
        <Rule label="The problem today" />
        <div className="grid gap-px bg-rule/15 md:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map(([h, d], i) => (
            <div key={h} className="bg-background p-6">
              <p className="font-mono-ui text-[10px] text-primary">P{i + 1}</p>
              <p className="font-display mt-3 text-xl">{h}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-10">
        <Rule label="What makes it different — each point opens a working desk" />
        <div className="grid gap-px bg-rule/15 md:grid-cols-2 lg:grid-cols-3">
          {DIFFERENTIATORS.map((x) => (
            <Link key={x.n} to={x.to} className="group bg-background p-6 transition-colors hover:bg-muted/40">
              <p className="font-mono-ui text-[10px] text-primary">{x.n}</p>
              <p className="font-display mt-3 text-xl group-hover:text-primary">{x.h}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{x.d}</p>
              <p className="font-mono-ui mt-4 text-[10px] uppercase tracking-[0.14em] text-primary">{x.desk} →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-10">
        <Rule label="Who it serves" />
        <div className="overflow-x-auto border border-rule/20">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="font-mono-ui bg-foreground text-[10px] uppercase tracking-[0.14em] text-background"><th className="px-4 py-3">Audience</th><th className="px-4 py-3">Who</th><th className="bg-primary px-4 py-3 text-primary-foreground">What changes</th></tr></thead>
            <tbody>
              {AUDIENCES.map(([a, w, c]) => (
                <tr key={a} className="border-t border-rule/15"><td className="font-display px-4 py-4 text-base">{a}</td><td className="px-4 py-4 text-muted-foreground">{w}</td><td className="px-4 py-4">{c}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-10">
        <Rule label="Proven today vs pilot targets" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="border-l-2 border-primary pl-5">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">Working in the prototype</p>
            <ul className="mt-3 space-y-2 text-sm">
              {["Statute-cited route triage and document gating", "Company-scoped Form FC records with append-only history", "Nine-desk GIFT workflow with database-enforced order", "Five AI agents with sources and a quality veto", "Public-feed market data with visible timestamps"].map((t) => <li key={t}>— {t}</li>)}
            </ul>
          </div>
          <div className="border-l-2 border-rule/40 pl-5">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Not claimed yet</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {["Official RBI FIRMS or IFSCA submission", "Actual regulator approvals or money release", "Measured turnaround reduction — a pilot target, not a result", "Security certification or patent grant", "Licensed real-time market data"].map((t) => <li key={t}>— {t}</li>)}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 bg-primary px-6 py-6 text-primary-foreground">
          <p className="font-display text-2xl">See it on your own scenario.</p>
          <Link to="/book-demo" className="font-mono-ui border border-primary-foreground px-5 py-3 text-[11px] uppercase tracking-[0.16em]">Book a demo →</Link>
        </div>
      </section>
    </Frame>
  );
}
