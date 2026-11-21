import { ForecastLede } from "@/components/site/ForecastLede";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TreasuryIntelligence } from "@/components/site/TreasuryIntelligence";
import { Button } from "@/components/ui/button";
import { Frame, Rule } from "@/components/site/Frame";
import { TreasuryCommandBar } from "@/components/site/TreasuryCommandBar";
import { CorporateFilingsPanel } from "@/components/site/CorporateFilingsPanel";
import { HeadroomInstrument } from "@/components/site/Headroom";
import { TreasuryClearanceStudio } from "@/components/site/TreasuryClearanceStudio";
import { useTreasuryFocus } from "@/lib/treasury-focus";
import { findListed } from "@/data/listed";
import { useTreasuryScenario } from "@/lib/treasury-scenario";

const TITLE = "Treasury Console & Corporate Dashboard — CorpVidesh AI";
const DESC =
  "The treasury workspace: headroom, the nine-stage outbound journey, statutory checks and the evidence bundle for every remittance out of India, plus company-scoped ODI/OPI filings and Form FC submission.";

const VIEWS = ["clearance", "overview", "filings", "intelligence", "mechanism"] as const;
type View = (typeof VIEWS)[number];

export const Route = createFileRoute("/console")({
  validateSearch: (s: Record<string, unknown>): { view?: View } =>
    VIEWS.includes(s["view"] as View) ? { view: s["view"] as View } : {},
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
  component: Console,
});

const STAGES = [
  ["Mandate", "Board resolution and investment rationale captured", "Treasury", "Draft extracted and classified by route"],
  ["Route test", "ODI or OPI decided against the target's activity", "Rules engine", "Provision-cited determination"],
  ["Headroom", "Rule 7 ceiling checked at group level", "Rules engine", "Zero-knowledge ceiling proof"],
  ["Structure", "Step-down chain and beneficial ownership mapped", "AI + counsel", "UBO attestation"],
  ["Valuation", "Valuation certificate ingested and cross-checked", "AI + valuer", "Certificate lineage hash"],
  ["Tax", "Section 195 and treaty position resolved", "Rules engine", "15CA/15CB pair, pre-validated"],
  ["Bank", "AD Category-I review with complete bundle", "AD bank", "Single-pass approval record"],
  ["Execute", "Remittance instructed and settled", "AD bank", "Settlement anchor"],
  ["Reconcile", "FIRC, APR obligations and calendar seeded", "Rail", "Continuing-compliance schedule"],
];

function Console() {
  const [focus] = useTreasuryFocus();
  const company = findListed(focus);
  const [scenario] = useTreasuryScenario();
  const [stage, setStage] = useState(2);
  const { view = "clearance" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const setView = (v: View) => void navigate({ search: { view: v }, replace: true, resetScroll: false });
  const active = STAGES[stage] ?? STAGES[0];
  if (!active) return null;

  return (
    <Frame>
      <TreasuryCommandBar />
      <section className="mx-auto max-w-[1400px] px-6 pb-6 pt-10">
        <div className="grid gap-8 border-t-4 border-primary pt-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.24em] text-primary">
              CV—01 · Treasury console · Corporate control room
            </p>
            <h1 className="font-display mt-4 text-5xl leading-[0.95] md:text-7xl">
              One console.<br />Decide, file, prove.
            </h1>
          </div>
          <div className="flex flex-col justify-end gap-4 lg:col-span-5">
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Rule 7 headroom, company-scoped Form FC filings, FEMA source texts and the outbound
              rail — one grid, one focused company. Workflow evidence and clearance are prototype
              simulations, not official approvals.
            </p>
            <div className="grid grid-cols-3 gap-px border border-rule/20 bg-rule/20">
              {[
                ["Company", focus],
                ["Demo ticket", `₹${scenario.amountCr.toLocaleString("en-IN")} Cr`],
                ["Destination", scenario.hub],
              ].map(([k, v]) => (
                <div key={k} className="bg-background px-3 py-2">
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                  <p className="tnum font-display break-words text-lg">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div role="tablist" aria-label="Console views" className="mt-10 grid grid-cols-2 gap-px border border-rule/20 bg-rule/20 lg:grid-cols-5">
          {([
            ["clearance", "Clearance studio", "Select · checklist · six lanes"],
            ["overview", "Headroom & forecast", "Rule 7 ceiling · predictive lead"],
            ["filings", "Corporate filings", "Form FC · due dates · flags"],
            ["intelligence", "FEMA intelligence", "212 scenarios · hub FX"],
            ["mechanism", "Mechanism matrix", "Nine stages · evidence"],
          ] as const).map(([k, l, n], i) => (
            <Button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} variant="ghost"
              className={`group relative block h-auto whitespace-normal rounded-none px-5 py-4 text-left transition-colors ${view === k ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-background hover:bg-secondary"}`}>
              <span className="font-mono-ui tnum block text-[10px] tracking-[0.2em] opacity-70">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display mt-1 block text-xl leading-tight">{l}</span>
              <span className={`font-mono-ui mt-1 block text-[9px] uppercase tracking-[0.14em] ${view === k ? "opacity-80" : "text-muted-foreground"}`}>{n}</span>
              <span className={`absolute inset-x-0 bottom-0 h-0.5 ${view === k ? "bg-primary-foreground/60" : "bg-transparent group-hover:bg-primary"}`} aria-hidden />
            </Button>
          ))}
        </div>
      </section>

      {view === "clearance" && <TreasuryClearanceStudio />}

      {view === "overview" && (
        <section className="mx-auto max-w-[1400px] px-6 pb-12">
          <HeadroomInstrument />
          {company && <div className="mt-8"><p className="mb-3 text-xs text-muted-foreground">Selected proposal: {scenario.hub} · {scenario.purpose} for {company.name}. The cost forecast below retains its illustrative Singapore ODI assumptions, not destination-specific modelling; confidence is not a measured execution outcome or permission to remit.</p><ForecastLede desk={company.name} focus={["headroom", "cost"]} notionalCr={scenario.amountCr} netWorthCr={company.netWorth} committedCr={company.used} /></div>}
        </section>
      )}

      {view === "filings" && <><TreasuryClearanceStudio /><CorporateFilingsPanel /></>}

      {view === "intelligence" && <TreasuryIntelligence />}

      {view === "mechanism" && (
      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Mechanism matrix" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-[clamp(1.5rem,3.2vw,2.25rem)] leading-[1.05]">
              The outbound rail, stage by stage.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Select a stage to read what happens, who acts, and what proof it leaves behind.
            </p>
          </div>
          <p className="font-mono-ui tnum shrink-0 border border-rule/25 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Stage {String(stage + 1).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Outbound rail stages"
          className="mt-6 grid grid-cols-2 gap-px bg-rule/15 min-[420px]:grid-cols-3 sm:grid-cols-5 lg:grid-cols-9"
        >
          {STAGES.map((s, i) => (
            <Button
              key={s[0]}
              type="button"
              role="tab"
              id={`stage-tab-${i}`}
              aria-controls="stage-panel"
              aria-selected={i === stage}
              tabIndex={i === stage ? 0 : -1}
              onKeyDown={(e) => {
                const last = STAGES.length - 1;
                const to =
                  e.key === "ArrowRight" || e.key === "ArrowDown" ? (stage === last ? 0 : stage + 1)
                  : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (stage === 0 ? last : stage - 1)
                  : e.key === "Home" ? 0
                  : e.key === "End" ? last
                  : -1;
                if (to < 0) return;
                e.preventDefault();
                setStage(to);
                (e.currentTarget.parentElement?.children[to] as HTMLElement | undefined)?.focus();
              }}
              onClick={() => setStage(i)}
              className={`group min-w-0 px-[clamp(0.4rem,1vw,0.75rem)] py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
                i === stage
                  ? "bg-primary text-primary-foreground"
                  : i < stage
                    ? "bg-secondary hover:bg-secondary/70"
                    : "bg-background hover:bg-secondary/40"
              }`}
            >
              <span className="font-mono-ui tnum block text-[clamp(8px,0.7vw,10px)] uppercase tracking-[0.18em] opacity-80">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display mt-1 block truncate text-[clamp(12px,1.15vw,16px)] leading-tight">
                {s[0]}
              </span>
              <span
                className={`mt-2 block h-px w-full ${
                  i === stage ? "bg-primary-foreground/60" : "bg-rule/25"
                }`}
                aria-hidden
              />
            </Button>
          ))}
        </div>

        <div
          id="stage-panel"
          role="tabpanel"
          aria-labelledby={`stage-tab-${stage}`}
          aria-live="polite"
          className="mt-px grid gap-px bg-rule/15 md:grid-cols-3"
        >
          {[
            ["What happens", active[1]],
            ["Who acts", active[2]],
            ["Evidence generated", active[3]],
          ].map(([k, v], i) => (
            <div key={k} className="bg-background p-5 lg:p-6">
              <p className="font-mono-ui flex items-center gap-2 text-[clamp(8px,0.7vw,10px)] uppercase tracking-[0.2em] text-primary">
                <span className="tnum opacity-80">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 break-words">{k}</span>
              </p>
              <p className="mt-3 text-[clamp(13px,1.1vw,16px)] leading-relaxed">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-px grid gap-px bg-rule/15 lg:grid-cols-2">
          <div className="min-w-0 bg-background p-5 lg:p-6">
            <p className="font-mono-ui text-[clamp(8px,0.7vw,10px)] uppercase tracking-[0.2em] text-primary">
              Statutory checks on this stage
            </p>
            <ul className="mt-4 space-y-3">
              {[
                "FEM (Overseas Investment) Rules, 2022 — Rule 7 financial commitment ceiling",
                "Master Direction on Overseas Investment — reporting form applicability",
                "Income-tax Act s.195 read with the applicable DTAA article",
                "Companies Act s.186 — board and shareholder authorisation thresholds",
              ].map((c) => (
                <li key={c} className="flex gap-3 text-[clamp(12px,0.95vw,14px)] leading-relaxed">
                  <span className="mt-[7px] block h-1.5 w-1.5 shrink-0 bg-primary" aria-hidden />
                  <span className="min-w-0 break-words">{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 bg-background p-5 lg:p-6">
            <p className="font-mono-ui text-[clamp(8px,0.7vw,10px)] uppercase tracking-[0.2em] text-primary">
              Evidence bundle
            </p>
            <ul className="mt-4 divide-y divide-rule/12">
              {[
                ["Board resolution", "anchored"],
                ["Route determination", "anchored"],
                ["Headroom proof (groth16)", "anchored"],
                ["Valuation certificate", "pending valuer"],
                ["Form 15CB", "drafted"],
                ["FIRC", "awaiting settlement"],
              ].map(([d, s]) => (
                <li key={d} className="flex items-center justify-between gap-3 py-2.5 text-[clamp(12px,0.95vw,14px)]">
                  <span className="min-w-0 truncate">{d}</span>
                  <span className="font-mono-ui shrink-0 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
          In plain words: the treasury fills the file once. Each stage adds a piece of proof that
          the next party can check by machine instead of re-reading the whole folder.
        </p>
      </section>
      )}
    </Frame>
  );
}