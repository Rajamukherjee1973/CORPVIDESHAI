import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Frame, Rule } from "@/components/site/Frame";
import { CompanyClearance } from "@/components/site/CompanyClearance";
import { useFxStream } from "@/lib/fx-stream";
import { runPocChecks, type ProofCheck } from "@/lib/poc-evaluation";
import { useTreasuryFocus } from "@/lib/treasury-focus";
import { useTreasuryScenario } from "@/lib/treasury-scenario";
import { findHub } from "@/data/hub-catalog";
import { HubOptions } from "@/components/site/HubOptions";
import { COUNTRY_META } from "@/data/currencies";
import { findListed } from "@/data/listed";
import { findPurpose } from "@/data/purposes";

const TITLE = "Evidence Studio — Proof, Mechanism & Live Case File | CorpVidesh AI";
const DESC =
  "One compact evidence studio: run the prototype's proof-of-concept safeguards, step through the mechanism chain and simulate a full ODI case file from intake to regulator ledger.";

export const Route = createFileRoute("/evidence")({
  validateSearch: (s: Record<string, unknown>): { view?: Tab } =>
    ["proof", "mechanism", "case", "company"].includes(String(s["view"])) ? { view: s["view"] as Tab } : {},
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
  component: EvidenceStudio,
});

type Tab = "proof" | "mechanism" | "case" | "company";

function EvidenceStudio() {
  const { view: tab = "proof" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const setTab = (view: Tab) => void navigate({ search: { view }, replace: true, resetScroll: false });
  const tabs: { id: Tab; n: string; label: string; q: string }[] = [
    { id: "proof", n: "01", label: "Proof of concept", q: "Does the safeguard code actually run?" },
    { id: "mechanism", n: "02", label: "Mechanism", q: "How does one decision travel end to end?" },
    { id: "case", n: "03", label: "Live case file", q: "What does a full ODI case look like, live?" },
    { id: "company", n: "04", label: "Company clearance", q: "Can any top-1,000 company be cleared?" },
  ];
  const kpis: [string, string][] = [
    ["6", "Executable safeguards"],
    ["6", "Mechanism layers"],
    ["52", "Hubs priced live"],
    ["1,000", "Companies selectable"],
  ];
  const active = tabs.find((t) => t.id === tab) ?? tabs[0]!;
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-6 pt-12">
        <div className="h-2 w-24 bg-primary" />
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Evidence studio · Stakeholder edition</div>
            <h1 className="font-display mt-3 text-5xl leading-[0.95] sm:text-7xl">
              Don't trust the deck.<br />
              <span className="text-primary">Run the proof.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-muted-foreground">
              Four live demonstrations, one record. Every result below is produced by the prototype's own policy
              code, live FX feed and hash chain — in front of you, not pre-recorded.
            </p>
          </div>
          <dl className="grid grid-cols-2 border-l-4 border-primary">
            {kpis.map(([v, l]) => (
              <div key={l} className="border-b border-r border-border p-4">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</dt>
                <dd className="font-display text-4xl">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div role="tablist" aria-label="Evidence demonstrations" className="mt-10 grid grid-cols-2 border-t-4 border-foreground lg:grid-cols-4">
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <Button variant="ghost"
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className={`group h-auto flex-col items-start gap-2 whitespace-normal rounded-none border-b border-r border-border p-5 text-left transition-colors ${
                  on ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-background hover:bg-secondary"
                }`}
              >
                <div className="flex w-full items-baseline justify-between">
                  <span className="font-display text-3xl">{t.n}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">{on ? "Live" : "Open"}</span>
                </div>
                <div className="font-display text-lg sm:text-xl">{t.label}</div>
                <div className="text-xs opacity-80">{t.q}</div>
              </Button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 font-mono text-xs text-muted-foreground">
          <span><span className="text-primary">■</span> Now showing {active.n} — {active.label}</span>
          <span>Shareable link: /evidence?view={active.id}</span>
        </div>
      </section>
      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        {tab === "proof" && <ProofPanel />}
        {tab === "mechanism" && <MechanismPanel />}
        {tab === "case" && <CasePanel />}
        {tab === "company" && <CompanyClearance />}

        <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-3">
          {[
            ["Measured", "Safeguard checks and hash verification execute in this browser on every run."],
            ["Observed", "Live FX rates are fetched from public providers and timestamped on each step."],
            ["Not yet claimed", "Production certification, official regulator integration and granted patents."],
          ].map(([h, d], i) => (
            <div key={h} className="bg-background p-5">
              <div className={`font-mono text-xs uppercase tracking-wider ${i === 2 ? "text-muted-foreground" : "text-primary"}`}>{h}</div>
              <div className="mt-2 text-sm">{d}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-muted-foreground">
          <span>Full desks:</span>
          <Link to="/proof" className="text-primary underline">Proof desk</Link>
          <Link to="/mechanism" className="text-primary underline">Mechanism</Link>
          <Link to="/casefile" className="text-primary underline">Case file</Link>
          <Link to="/worklist" className="text-primary underline">Ready list</Link>
          <Link to="/security" className="text-primary underline">Security theatre</Link>
        </div>
        <p className="mt-4 max-w-4xl text-xs text-muted-foreground">
          Case figures are simulated. Distinctive technical elements are candidates for patent assessment; no patent
          has been filed or granted. Not legal advice and not an official regulator action.
        </p>
      </section>
    </Frame>
  );
}

function ProofPanel() {
  const [checks, setChecks] = useState<ProofCheck[] | null>(null);
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true);
    setShown(0);
    const r = await runPocChecks();
    setChecks(r);
    r.forEach((_, i) => setTimeout(() => setShown(i + 1), 350 * (i + 1)));
    setTimeout(() => setRunning(false), 350 * (r.length + 1));
  };
  const passed = checks?.slice(0, shown).filter((c) => c.passed).length ?? 0;
  const innovations = [
    ["Statutory agent graph", "Corrective retrieval loop with fail-closed quality gate"],
    ["FX-stamped decisions", "Every treasury action carries the live rate and source"],
    ["Shared append-only ledger", "Six regulators read the same hash-chained record"],
    ["Parallel quorum", "Regulator lanes clear concurrently, not in sequence"],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="border border-border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-xs text-primary">LIVE SAFEGUARD RUN</div>
            <div className="font-display text-6xl">
              {passed}<span className="text-muted-foreground">/6</span>
            </div>
          </div>
          <button onClick={run} disabled={running} className="bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-60">
            {running ? "Running…" : checks ? "Run again" : "Run the 6 checks"}
          </button>
        </div>
        <ol className="mt-6 space-y-2">
          {(checks ?? Array.from({ length: 6 }, () => null)).map((c, i) => {
            const on = c && i < shown;
            return (
              <li key={i} className={`flex gap-3 border-l-4 p-3 transition-all ${on ? (c.passed ? "border-primary bg-secondary" : "border-destructive") : "border-border opacity-50"}`}>
                <span className="font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{c?.name ?? "Waiting to run"}</div>
                  {on && <div className="text-xs text-muted-foreground">{c.detail}</div>}
                </div>
                {on && <span className="font-mono text-xs text-primary">{c.passed ? "PASS" : "FAIL"}</span>}
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">These run the prototype's real policy code in your browser. They are not a production certification.</p>
      </div>
      <div className="grid gap-px border border-border bg-border">
        {innovations.map(([t, d], i) => (
          <div key={t} className="bg-background p-5">
            <div className="font-mono text-xs text-primary">INNOVATION {String(i + 1).padStart(2, "0")}</div>
            <div className="font-display mt-1 text-xl">{t}</div>
            <div className="text-sm text-muted-foreground">{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const LAYERS = [
  { t: "Intake", d: "Entity, audited net worth, hub, purpose and AD bank captured.", s: "Treasury" },
  { t: "Live FX stamp", d: "Rate, provider and timestamp pinned to the request.", s: "Market feeds" },
  { t: "Statutory graph", d: "FEMA OI Rules 2022 retrieved, graded and corrected.", s: "AI agents" },
  { t: "Route decision", d: "Automatic vs approval, Rule 7 headroom, tax triggers.", s: "Policy" },
  { t: "Ledger write", d: "Packet hashed and appended; prior hash links the chain.", s: "Evidence" },
  { t: "Regulator read", d: "Six lanes read the same record in parallel.", s: "Supervisors" },
];

function MechanismPanel() {
  const [step, setStep] = useState(0);
  const [play, setPlay] = useState(true);
  useEffect(() => {
    if (!play) return;
    const id = setInterval(() => setStep((s) => (s + 1) % LAYERS.length), 1800);
    return () => clearInterval(id);
  }, [play]);
  return (
    <div className="border border-border p-6">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs text-primary">STEP {step + 1} / {LAYERS.length} · {LAYERS[step]!.s.toUpperCase()}</div>
        <button onClick={() => setPlay((p) => !p)} className="border border-border px-4 py-2 text-sm">{play ? "Pause" : "Play"}</button>
      </div>
      <svg viewBox="0 0 1200 170" className="mt-6 w-full" role="img" aria-label="Mechanism chain">
        <line x1="80" y1="70" x2="1120" y2="70" className="stroke-border" strokeWidth="4" />
        <line x1="80" y1="70" x2={80 + (step * 1040) / (LAYERS.length - 1)} y2="70" className="stroke-primary transition-all duration-700" strokeWidth="4" />
        {LAYERS.map((l, i) => {
          const x = 80 + (i * 1040) / (LAYERS.length - 1);
          const on = i <= step;
          return (
            <g key={l.t} onClick={() => { setStep(i); setPlay(false); }} className="cursor-pointer">
              <circle cx={x} cy="70" r={i === step ? 30 : 22} className={on ? "fill-primary" : "fill-background stroke-border"} strokeWidth="3" />
              <text x={x} y="76" textAnchor="middle" className={`font-mono text-[16px] ${on ? "fill-primary-foreground" : "fill-muted-foreground"}`}>{i + 1}</text>
              <text x={x} y="135" textAnchor="middle" className={`text-[17px] ${on ? "fill-foreground" : "fill-muted-foreground"}`}>{l.t}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
        <div className="font-display text-4xl text-primary">{LAYERS[step]!.t}</div>
        <p className="text-lg">{LAYERS[step]!.d}</p>
      </div>
    </div>
  );
}

const REGS = ["RBI", "IFSCA", "MoF", "FIU-IND", "DPIIT", "CBDT"];

async function sha(text: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

function CasePanel() {
  const [name] = useTreasuryFocus();
  const [scenario, setScenario] = useTreasuryScenario();
  const company = findListed(name);
  const crore = scenario.amountCr;
  const netWorth = company?.netWorth ?? 0;
  const [t, setT] = useState(-1);
  const [hashes, setHashes] = useState<string[]>([]);
  const chosenHub = findHub(scenario.hub);
  const base = { h: scenario.hub, c: chosenHub ? COUNTRY_META[chosenHub.country]?.currency ?? "USD" : "USD", dtaa: chosenHub?.treaty ?? "Unverified" };
  const tape = useFxStream();
  const liveRate = tape.inrPer[base.c];
  const prevRate = tape.prev[base.c];
  const isLive = typeof liveRate === "number" && liveRate > 0;
  const H = { ...base, r: isLive ? liveRate : 0 };
  const dir = isLive && typeof prevRate === "number" ? Math.sign(liveRate - prevRate) : 0;
  const ceiling = netWorth * 4;
  const automatic = (company?.used ?? 0) + crore <= ceiling;
  const fc = useMemo(() => H.r > 0 ? ((crore * 1e7) / H.r / 1e6).toFixed(1) : "—", [crore, H.r]);
  const lanes = REGS.map((r, i) => ({ r, sec: automatic ? 8 + i * 5 : 40 + i * 30 }));
  const STAGES = ["Intake", "FX stamp", "Route", "Ledger", "Quorum"];
  useEffect(() => { setHashes([]); setT(-1); }, [name, scenario.hub, scenario.purpose, scenario.amountCr]);

  useEffect(() => {
    if (t < 0 || t >= STAGES.length) return;
    const id = setTimeout(async () => {
      const h = await sha(`${hashes.at(-1) ?? "genesis"}|${name}|${scenario.hub}|${scenario.purpose}|${STAGES[t]}|${crore}|${H.c}@${H.r}`);
      setHashes((x) => [...x, h]);
      setT((v) => v + 1);
    }, 1100);
    return () => clearTimeout(id);
  }, [t]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => { setHashes([]); setT(0); };
  const done = t >= STAGES.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4 border border-border p-5">
        <div className="font-mono text-xs text-primary">CASE INPUTS</div>
        <p className="font-display text-xl">{name} → {scenario.hub}</p>
        <p className="text-xs text-muted-foreground">{findPurpose(scenario.purpose)?.plain}</p>
        <label className="block text-sm">Remittance: <b>₹{crore} crore</b>
          <input aria-label="Case remittance INR crore" type="number" min={0.01} step={0.01} value={crore} onChange={(e) => setScenario({ amountCr: +e.target.value })} className="mt-1 w-full border border-border bg-background p-2" />
        </label>
        <p className="text-sm">Company net worth: <b>₹{netWorth.toLocaleString("en-IN")} crore</b><span className="block text-xs text-muted-foreground">{company?.balanceSheet ? "Filed FY26 input; auditor certificate required" : "Illustrative"}</span></p>
        <label className="block text-sm">Hub
          <select value={scenario.hub} onChange={(e) => setScenario({ hub: e.target.value })} className="mt-1 w-full border border-border bg-background p-2">
            <HubOptions />
          </select>
        </label>
        <Button disabled={t >= 0 && !done} onClick={start} className="w-full rounded-none py-3 font-medium">{t >= 0 && !done ? "Simulating…" : "Simulate case"}</Button>
        <div className="border border-border p-3">
          <div className="font-mono text-[10px] text-muted-foreground">{isLive ? `INDICATIVE · ${tape.source}` : "FEED UNAVAILABLE"}</div>
          <div className="font-display text-2xl tabular-nums">
            1 {H.c} = ₹{H.r.toFixed(4)}{" "}
            <span className={`text-sm ${dir < 0 ? "text-muted-foreground" : "text-primary"}`}>{dir > 0 ? "▲" : dir < 0 ? "▼" : "•"}</span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">{tape.anchor}</div>
        </div>
        <p className="text-xs text-muted-foreground">Shared FX tape includes simulated ticks between provider observations. Hashes are local demo evidence, not stored filing receipts. Ceiling screen alone does not establish ODI/OPI eligibility.</p>
      </div>

      <div className="border border-border p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STAGES.map((s, i) => (
            <div key={s} className={`border-t-4 pt-2 transition-all duration-500 ${i < hashes.length ? "border-primary" : i === t ? "animate-pulse border-primary/50" : "border-border"}`}>
              <div className="font-mono text-[10px] text-muted-foreground">0{i + 1}</div>
              <div className="text-sm font-medium">{s}</div>
              <div className="break-all font-mono text-[10px] text-primary">{hashes[i] ?? "—"}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-px bg-border sm:grid-cols-3">
          <Stat k="Foreign amount" v={`${H.c} ${fc}m`} on={hashes.length > 1} />
          <Stat k="Route" v={automatic ? "Automatic" : "Approval"} on={hashes.length > 2} sub={`Ceiling 4× NW = ₹${ceiling} cr`} />
          <Stat k="Treaty lens" v={H.dtaa} on={hashes.length > 2} />
        </div>

        <div className="mt-6">
          <div className="font-mono text-xs text-primary">SIX REGULATOR LANES · PARALLEL READ</div>
          <div className="mt-3 space-y-2">
            {lanes.map((l) => {
              const max = Math.max(...lanes.map((x) => x.sec));
              return (
                <div key={l.r} className="grid grid-cols-[70px_1fr_60px] items-center gap-3 text-sm">
                  <span className="font-mono">{l.r}</span>
                  <div className="h-3 bg-secondary">
                    <div className="h-3 bg-primary transition-all duration-1000" style={{ width: done ? `${(l.sec / max) * 100}%` : "0%" }} />
                  </div>
                  <span className="font-mono text-xs">{done ? (l.sec < 60 ? `${l.sec}s` : `${Math.round(l.sec / 60)}m`) : "…"}</span>
                </div>
              );
            })}
          </div>
        </div>
        {done && (
          <div className="mt-6 bg-primary p-4 text-primary-foreground">
            <div className="font-display text-2xl">Case recorded · {hashes.length} chained blocks</div>
            <div className="text-sm opacity-90">
              All six lanes read one record. Quorum in {automatic ? "under a minute" : "a few minutes"} (simulated). Head hash {hashes.at(-1)}.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ k, v, on, sub }: { k: string; v: string; on: boolean; sub?: string }) {
  return (
    <div className={`bg-background p-4 transition-opacity duration-500 ${on ? "opacity-100" : "opacity-30"}`}>
      <div className="font-mono text-[10px] text-muted-foreground">{k.toUpperCase()}</div>
      <div className="font-display text-xl">{v}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
