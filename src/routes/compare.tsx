import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { AboutNav } from "@/components/site/AboutNav";
import { RIVALS, STAGES, StageScaleBoard, type Cov } from "@/components/site/StageScaleBoard";

const TITLE = "Swiss Grade vs Competitors — CorpVidesh AI";
const DESC =
  "Stage-by-stage scope comparison of CorpVidesh AI with Bloomberg, LSEG, RBI FIRMS, SWIFT gpi and ClearTax/Signzy, plus the Swiss-grade principles behind the platform.";

export const Route = createFileRoute("/compare")({
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
  component: ComparePage,
});

const STRENGTHS: Record<(typeof RIVALS)[number], { best: string; gap: string }> = {
  Bloomberg: { best: "Deep market data, analytics, news and FX trading tools used by treasuries worldwide.", gap: "No FEMA route reasoning, document gating or regulator review on the deal itself." },
  LSEG: { best: "Workspace data, FX venues and reference data across global markets.", gap: "Market context sits apart from the outbound filing and its approvals." },
  "RBI FIRMS": { best: "The official RBI reporting system — the filing of record for FDI/ODI returns.", gap: "Reporting after decisions; no pre-validation, multi-authority lanes or market context." },
  "SWIFT gpi": { best: "Industry-standard cross-border payment tracking with end-to-end visibility.", gap: "Tracks the payment, not the regulatory clearance that should precede it." },
  "ClearTax / Signzy": { best: "Strong Indian tax-filing and KYC / onboarding automation.", gap: "Tax and identity pieces, not the full route, review and evidence chain." },
};

const PRINCIPLES = [
  ["Precision", "Every answer cites its provision or source timestamp; unknowns stay unpriced.", "Route triage, treaty tax engine"],
  ["Neutrality", "Competitors described by their public scope; no invented market share or speed claims.", "This page, Proof desk"],
  ["Auditability", "Append-only events, SHA-256 hash chain and replayable case files.", "GIFT portal, Evidence studio"],
  ["Discretion", "Company-scoped records; showcase desks isolated from private cases.", "Regulator portal, Console"],
  ["Reliability", "Fail-closed AI quality veto, correlation IDs and visible error recovery.", "Agent desk, Architecture"],
  ["Honesty", "Simulations, estimates and pilot targets are labelled as such on screen.", "Every desk"],
];

const mark = (c: Cov) => (c === 2 ? "Core scope" : c === 1 ? "Partial" : "Outside scope");

function ComparePage() {
  const [rival, setRival] = useState<(typeof RIVALS)[number]>(RIVALS[0]);
  const j = RIVALS.indexOf(rival);
  return (
    <Frame>
      <AboutNav />
      <section className="mx-auto max-w-[1400px] px-6 pb-8 pt-12">
        <Rule label="About · 03 — Swiss grade vs competitors" />
        <h1 className="font-display max-w-5xl text-5xl leading-[1.02] sm:text-6xl">
          Excellent tools exist.
          <span className="text-primary"> None holds the whole outbound case.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          We compare scope across seven stages of an outbound investment — what each product is built to do, from its public description.
          This is not a ranking of quality, speed or market share.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <Rule label="Head-to-head" />
        <label className="flex flex-wrap items-center gap-3">
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">Compare CorpVidesh AI with</span>
          <select value={rival} onChange={(e) => setRival(e.target.value as (typeof RIVALS)[number])}
            className="font-mono-ui border border-foreground bg-background px-3 py-2 text-[11px] uppercase tracking-[0.12em]">
            {RIVALS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <div className="mt-5 grid gap-px bg-rule/15 md:grid-cols-2">
          <div className="bg-background p-5"><p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Where {rival} is strong</p><p className="mt-2 text-sm leading-relaxed">{STRENGTHS[rival].best}</p></div>
          <div className="bg-background p-5"><p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">Where CorpVidesh AI adds</p><p className="mt-2 text-sm leading-relaxed">{STRENGTHS[rival].gap}</p></div>
        </div>
        <div className="mt-px overflow-x-auto border border-rule/20">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="font-mono-ui bg-foreground text-[10px] uppercase tracking-[0.14em] text-background"><th className="px-4 py-3">Stage</th><th className="px-4 py-3">{rival}</th><th className="bg-primary px-4 py-3 text-primary-foreground">CorpVidesh AI (prototype)</th></tr></thead>
            <tbody>
              {STAGES.map((s) => {
                const c = s.rivals[j] ?? 0;
                return (
                  <tr key={s.n} className="border-t border-rule/15">
                    <td className="px-4 py-3"><span className="font-mono-ui mr-2 text-[10px] text-primary">{s.n}</span>{s.h}</td>
                    <td className="px-4 py-3"><span className={`font-mono-ui text-[10px] uppercase tracking-[0.12em] ${c === 2 ? "text-foreground" : "text-muted-foreground"}`}>{mark(c)}</span></td>
                    <td className="px-4 py-3">{s.cv}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <Rule label="All five, seven stages — click a row for detail" />
        <StageScaleBoard />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <Rule label="What “Swiss grade” means here" />
        <div className="grid gap-px bg-rule/15 md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map(([h, d, w], i) => (
            <div key={h} className="bg-background p-6">
              <p className="font-mono-ui text-[10px] text-primary">{String(i + 1).padStart(2, "0")}</p>
              <p className="font-display mt-3 text-xl">{h}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              <p className="font-mono-ui mt-3 text-[10px] uppercase tracking-[0.12em]">Seen in · {w}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">“Swiss grade” describes our design and engineering standards; it is not a Swiss certification or regulatory status.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/proof" className="font-mono-ui border border-foreground px-5 py-3 text-[11px] uppercase tracking-[0.16em]">Walk five cases on both rails →</Link>
          <Link to="/book-demo" className="font-mono-ui bg-primary px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-primary-foreground">Book a demo</Link>
        </div>
      </section>
    </Frame>
  );
}
