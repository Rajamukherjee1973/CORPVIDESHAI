import { useEffect, useState } from "react";
import { PROOF_SCENARIOS, type ProofScenario } from "@/lib/proof-scenarios";
import {
  DEFAULT_ASSUMPTIONS,
  model,
  type Assumptions,
} from "@/lib/proof-assumptions";
import {
  proofShareUrl,
  readProofShareFromUrl,
  writeProofShareToUrl,
} from "@/lib/proof-share";
import {
  SCENARIO_FEED,
  inrPer,
  movePct,
  riskFromTape,
  useLiveFeed,
} from "@/lib/live-feed";

/**
 * Real-feed header for a scenario: the corridor rate and the benchmark venues
 * the case actually settles against, pulled live so the comparison numbers are
 * the market's, not the deck's.
 */
function LiveFeedBar({
  scenarioKey,
  ticket,
  onRisk,
}: {
  scenarioKey: string;
  ticket: number;
  onRisk: (v: number) => void;
}) {
  const f = useLiveFeed();
  const cfg = SCENARIO_FEED[scenarioKey] ?? SCENARIO_FEED["bloomberg"]!;
  const usdInr = inrPer(f, "USD");
  const ccyInr = inrPer(f, cfg.ccy);
  const suggested = riskFromTape(f, cfg.symbols);
  const fcy = ccyInr ? (ticket * 1e7) / ccyInr : null;

  return (
    <div className="border-t border-rule/15 bg-background px-6 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Live market inputs — this comparison is priced on the current print
        </p>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {f.status === "live"
            ? `${f.tier === "terminal" ? "Terminal" : "Interbank"} · ${f.source} · ${f.stamp || "—"}${f.officialSource ? ` · ${f.officialSource}` : ""}`
            : f.status === "loading"
              ? "Connecting to the feed…"
              : "Feed unavailable — showing demonstrated constants"}
        </p>
      </div>

      <div className="mt-4 grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-background p-4">
          <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            USD / INR interbank
          </p>
          <p className="font-display tnum mt-2 text-2xl">
            {usdInr ? `₹${usdInr.toFixed(4)}` : "—"}
          </p>
          <p className="font-mono-ui mt-1 text-[10px] text-muted-foreground">
            {f.official["USD"]
              ? `RBI reference ₹${f.official["USD"].toFixed(4)}${
                  usdInr
                    ? ` · ${(((usdInr - f.official["USD"]) / f.official["USD"]) * 10_000).toFixed(0)} bps off the official print`
                    : ""
                }`
              : "RBI reference — awaiting today's publication"}
          </p>
        </div>
        <div className="bg-background p-4">
          <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Ticket at the live rate
          </p>
          <p className="font-display tnum mt-2 text-2xl text-primary">
            {fcy
              ? `${cfg.ccy} ${fcy.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
              : "—"}
          </p>
          <p className="font-mono-ui mt-1 text-[10px] text-muted-foreground">
            ₹{ticket.toLocaleString("en-IN")} cr {ccyInr ? `@ ₹${ccyInr.toFixed(4)}/${cfg.ccy}` : ""}
          </p>
        </div>
        {cfg.symbols.map((sym) => {
          const q = f.quotes[sym];
          const mv = movePct(q);
          return (
            <div key={sym} className="bg-background p-4">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                {q?.venue || sym}
              </p>
              <p className="font-display tnum mt-2 text-2xl">
                {q ? q.price.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}
              </p>
              <p
                className={`font-mono-ui tnum mt-1 text-[10px] ${mv !== null && mv < 0 ? "text-muted-foreground" : "text-primary"}`}
              >
                {mv !== null ? `${mv >= 0 ? "+" : ""}${mv.toFixed(2)}% session` : "closed / no print"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">{cfg.why}</p>
        <button
          type="button"
          disabled={suggested === null}
          onClick={() => suggested !== null && onRisk(suggested)}
          className="font-mono-ui border border-rule/30 px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
        >
          {suggested === null
            ? "Risk from tape unavailable"
            : `Set risk from observed dispersion — ${suggested}/100`}
        </button>
      </div>
    </div>
  );
}


function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block bg-background p-5">
      <span className="font-mono-ui flex items-baseline justify-between text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
        <span className="font-display tnum text-lg text-primary">
          {value.toLocaleString("en-IN")}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-[var(--primary)]"
      />
    </label>
  );
}

function Toggle({
  label,
  note,
  on,
  onChange,
}: {
  label: string;
  note: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`bg-background p-5 text-left transition-colors ${on ? "border-l-2 border-primary" : "hover:bg-primary/5"}`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em]">{label}</span>
        <span
          className={`font-mono-ui text-[9px] uppercase tracking-[0.16em] ${on ? "text-primary" : "text-muted-foreground"}`}
        >
          {on ? "On" : "Off"}
        </span>
      </span>
      <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{note}</span>
    </button>
  );
}

function Assumptor({
  s,
  a,
  set,
  reset,
}: {
  s: ProofScenario;
  a: Assumptions;
  set: (p: Partial<Assumptions>) => void;
  reset: () => void;
}) {
  const m = model(s.key, a);
  return (
    <div className="border-t border-rule/15">
      <div className="flex flex-wrap items-baseline justify-between gap-3 bg-background px-6 py-4">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Change the assumptions — both lanes re-price
        </p>
        <button
          type="button"
          onClick={reset}
          className="font-mono-ui border border-rule/30 px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary"
        >
          Reset to demonstrated case
        </button>
      </div>

      <LiveFeedBar scenarioKey={s.key} ticket={a.ticket} onRisk={(v) => set({ risk: v })} />



      <div className="grid gap-px bg-rule/15 sm:grid-cols-3">
        <Slider label="Ticket size" value={a.ticket} min={5} max={5000} step={5} suffix=" cr" onChange={(v) => set({ ticket: v })} />
        <Slider label="Documents ready at intake" value={a.readiness} min={0} max={100} step={5} suffix="%" onChange={(v) => set({ readiness: v })} />
        <Slider label="Counterparty / jurisdiction risk" value={a.risk} min={0} max={100} step={5} suffix="/100" onChange={(v) => set({ risk: v })} />
      </div>

      <div className="grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-5">
        <Toggle label="Approval route" note="RBI OI Division sanction required before the remittance." on={a.approvalRoute} onChange={(v) => set({ approvalRoute: v })} />
        <Toggle label="Section 195 live" note="Withholding question on the file — Royalty vs FTS." on={a.s195} onChange={(v) => set({ s195: v })} />
        <Toggle label="First-time filer" note="No UIN on record for this overseas entity." on={a.firstTime} onChange={(v) => set({ firstTime: v })} />
        <Toggle label="Quarter-end calendar" note="Closing and holidays queue the incumbent desks." on={a.calendar} onChange={(v) => set({ calendar: v })} />
        <Toggle label="Regulator quorum live" note="Six regulators attached in parallel; off = serial fallback." on={a.quorumLive} onChange={(v) => set({ quorumLive: v })} />
      </div>

      <div className="grid gap-px border-t border-rule/15 bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [`${s.rivalShort} modelled elapsed`, m.rivalLabel, false],
          ["CVAI modelled elapsed", m.railLabel, true],
          [`${s.rivalShort} hand-offs`, String(m.rivalTouches), false],
          ["Advantage", `${m.speedup.toLocaleString("en-IN")}×`, true],
        ].map(([k, v, hot]) => (
          <div key={k as string} className="bg-background p-5">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
            <p className={`font-display tnum mt-2 text-3xl ${hot ? "text-primary" : ""}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-rule/15 bg-background px-6 py-5">
        <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          What each assumption does to the workflow
        </p>
        <ul className="mt-4 grid gap-px bg-rule/15 md:grid-cols-2">
          {m.factors.map((f) => (
            <li key={f.label} className={`bg-background p-4 ${f.live ? "border-l-2 border-primary" : ""}`}>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">{f.label}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                <span className="text-foreground">{s.rivalShort} — </span>
                {f.rival}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                <span className="text-foreground">CVAI — </span>
                {f.rail}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Meter({ n, total }: { n: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`block h-1 w-8 ${i <= n ? "bg-primary" : "bg-rule/20"}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

function LaneCard({
  tone,
  head,
  at,
  actor,
  act,
  artefact,
  statute,
  blocked,
}: {
  tone: "rival" | "cvai";
  head: string;
  at: string;
  actor: string;
  act: string;
  artefact: string;
  statute?: string;
  blocked?: boolean;
}) {
  const us = tone === "cvai";
  return (
    <div className={`bg-background p-6 ${us ? "border-l-2 border-primary" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={`font-mono-ui text-[10px] uppercase tracking-[0.18em] ${
            us ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {head}
        </p>
        <p className={`font-mono-ui tnum text-[11px] ${us ? "text-primary" : "text-muted-foreground"}`}>
          {at}
        </p>
      </div>
      <p className="font-display mt-3 text-2xl leading-snug">{actor}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{act}</p>
      <div className="mt-4 border-t border-rule/15 pt-3">
        <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          Artefact produced
        </p>
        <p className="mt-1 text-sm">{artefact}</p>
        {statute && (
          <p className="font-mono-ui mt-2 text-[10px] uppercase tracking-[0.12em] text-primary">
            {statute}
          </p>
        )}
        {blocked && (
          <p className="font-mono-ui mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            ⧗ Waiting state — nothing else can progress
          </p>
        )}
      </div>
    </div>
  );
}

function Walk({
  s,
  initialStep = 0,
  initialAssumptions = DEFAULT_ASSUMPTIONS,
}: {
  s: ProofScenario;
  initialStep?: number;
  initialAssumptions?: Assumptions;
}) {
  const [i, setI] = useState(Math.min(initialStep, s.steps.length - 1));
  const [playing, setPlaying] = useState(false);
  const [a, setA] = useState<Assumptions>(initialAssumptions);
  const [copied, setCopied] = useState(false);
  const step = s.steps[i]!;

  useEffect(() => {
    writeProofShareToUrl({ scenario: s.key, step: i, assumptions: a });
  }, [s.key, i, a]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      setI((p) => {
        if (p + 1 >= s.steps.length) {
          setPlaying(false);
          return p;
        }
        return p + 1;
      });
    }, 2600);
    return () => clearTimeout(t);
  }, [playing, i, s.steps.length]);

  return (
    <div className="border border-rule/20">
      <div className="grid gap-px bg-rule/15 lg:grid-cols-3">
        <div className="bg-background p-6 lg:col-span-2">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Scenario walked on both rails
          </p>
          <h3 className="font-display mt-3 text-4xl leading-tight">{s.title}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{s.brief}</p>
          <p className="mt-4 border-l-2 border-rule/30 pl-4 text-sm leading-relaxed text-muted-foreground">
            <span className="text-foreground">{s.rival} is superb at — </span>
            {s.fair}
          </p>
          <p className="mt-2 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
            <span className="text-foreground">Where it structurally stops — </span>
            {s.stop}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-rule/15">
          {[
            [s.rivalShort + " as demonstrated", s.totals.rivalTime],
            ["CVAI as demonstrated", s.totals.cvaiTime],
            [s.rivalShort + " hand-offs", String(s.totals.rivalTouches)],
            ["CVAI hand-offs", String(s.totals.cvaiTouches)],
          ].map(([k, v], n) => (
            <div key={k} className="bg-background p-5">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                {k}
              </p>
              <p className={`font-display tnum mt-2 text-3xl ${n % 2 ? "text-primary" : ""}`}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      <Assumptor
        s={s}
        a={a}
        set={(p) => setA((prev) => ({ ...prev, ...p }))}
        reset={() => setA(DEFAULT_ASSUMPTIONS)}
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-rule/15 bg-background px-6 py-4">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="font-mono-ui border border-primary bg-primary px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
        >
          {playing ? "Pause walkthrough" : i === s.steps.length - 1 ? "Replay walkthrough" : "Play walkthrough"}
        </button>
        <button
          type="button"
          onClick={() => setI((p) => Math.max(0, p - 1))}
          disabled={i === 0}
          className="font-mono-ui border border-rule/30 px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary disabled:opacity-35"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => setI((p) => Math.min(s.steps.length - 1, p + 1))}
          disabled={i === s.steps.length - 1}
          className="font-mono-ui border border-rule/30 px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary disabled:opacity-35"
        >
          Next step →
        </button>
        <Meter n={i} total={s.steps.length} />
        <button
          type="button"
          onClick={async () => {
            const url = proofShareUrl({ scenario: s.key, step: i, assumptions: a });
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              window.prompt("Copy this shareable scenario link", url);
            }
          }}
          className="font-mono-ui border border-rule/30 px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary"
        >
          {copied ? "Link copied ✓" : "Copy shareable link"}
        </button>
        <p className="font-mono-ui tnum ml-auto text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Step {String(i + 1).padStart(2, "0")} / {String(s.steps.length).padStart(2, "0")}
        </p>
      </div>

      <div className="grid gap-px border-t border-rule/15 bg-rule/15 lg:grid-cols-2">
        <LaneCard tone="rival" head={s.rival} {...step.rival} />
        <LaneCard tone="cvai" head="CorpVidesh AI rail" {...step.cvai} />
      </div>

      <p className="border-t border-rule/15 bg-background px-6 py-4 text-sm leading-relaxed text-muted-foreground">
        <span className="font-mono-ui uppercase tracking-[0.16em] text-primary">The gap —</span>{" "}
        {step.gap}
      </p>

      <p className="border-t border-rule/15 bg-background px-6 py-5 text-base leading-relaxed">
        <span className="font-mono-ui mr-2 uppercase tracking-[0.16em] text-primary">Verdict</span>
        {s.verdict}
      </p>
    </div>
  );
}

/** Tabbed proof desk: pick an incumbent, walk the same case on both rails. */
export function ProofWalkthrough() {
  const [key, setKey] = useState(PROOF_SCENARIOS[0]!.key);
  const [shared, setShared] = useState<{
    step: number;
    assumptions: Assumptions;
  } | null>(null);
  const active = PROOF_SCENARIOS.find((s) => s.key === key) ?? PROOF_SCENARIOS[0]!;

  useEffect(() => {
    const s = readProofShareFromUrl();
    if (!s) return;
    if (!PROOF_SCENARIOS.some((p) => p.key === s.scenario)) return;
    setKey(s.scenario);
    setShared({ step: s.step, assumptions: s.assumptions });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-px border border-rule/20 bg-rule/15 sm:grid-cols-3 lg:grid-cols-5">
        {PROOF_SCENARIOS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              setKey(s.key);
              setShared((prev) => (prev ? { ...prev, step: 0 } : null));
            }}
            className={`bg-background p-4 text-left transition-colors ${
              key === s.key ? "bg-primary/5" : "hover:bg-primary/5"
            }`}
          >
            <p
              className={`font-mono-ui text-[9px] uppercase tracking-[0.16em] ${
                key === s.key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              vs {s.rivalShort}
            </p>
            <p className="mt-2 text-xs leading-snug">{s.rival}</p>
            <p className="font-mono-ui tnum mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {s.totals.rivalTime} → <span className="text-primary">{s.totals.cvaiTime}</span>
            </p>
          </button>
        ))}
      </div>

      <Walk
        key={active.key}
        s={active}
        initialStep={shared && shared.step ? shared.step : 0}
        initialAssumptions={shared ? shared.assumptions : DEFAULT_ASSUMPTIONS}
      />
    </div>
  );
}
