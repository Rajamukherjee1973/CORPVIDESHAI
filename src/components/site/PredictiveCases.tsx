import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { PREDICTIVE_CASES, type PredictiveCase } from "@/data/predictive-cases";
import { findPurpose } from "@/data/purposes";
import { runCase, ceilingCr, maxTicketCr } from "@/lib/predictive-cases";
import type { Forecast } from "@/lib/predict";
import { inrPer, useLiveFeed } from "@/lib/live-feed";
import { setTreasuryScenario } from "@/lib/treasury-scenario";
import { Button } from "@/components/ui/button";

const SEV: Record<Forecast["severity"], { chip: string; word: string }> = {
  act: { chip: "bg-primary text-primary-foreground", word: "Act" },
  watch: { chip: "border border-primary text-primary", word: "Watch" },
  clear: { chip: "border border-rule/30 text-muted-foreground", word: "Clear" },
};
const VERDICT = { release: "Release", fix: "Fix first", hold: "Hold" } as const;

const cr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")} cr`;
function fmt(v: number, unit: string) {
  if (unit === "min") return v < 90 ? `${v} min` : v / 60 < 48 ? `${(v / 60).toFixed(1)} h` : `${(v / 1440).toFixed(1)} d`;
  if (unit === "₹ cr") return `₹${v.toLocaleString("en-IN")} cr`;
  if (unit === "%" ) return `${v}%`;
  return `${v.toLocaleString("en-IN")} ${unit}`;
}

function HeadroomBar({ c, amountCr }: { c: PredictiveCase; amountCr: number }) {
  const ceiling = ceilingCr(c);
  const used = Math.min(100, (c.committedCr / ceiling) * 100);
  const ticket = Math.max(0, Math.min(100 - used, (amountCr / ceiling) * 100));
  const over = c.committedCr + amountCr > ceiling;
  return (
    <div>
      <div className="flex justify-between font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>Ceiling use after this ticket</span>
        <span className={over ? "text-primary" : ""}>{(((c.committedCr + amountCr) / ceiling) * 100).toFixed(1)}%</span>
      </div>
      <div className="relative mt-2 h-3 w-full bg-muted" role="img" aria-label={`Already committed ${used.toFixed(0)} percent, this ticket ${ticket.toFixed(0)} percent of the ceiling`}>
        <div className="absolute inset-y-0 left-0 bg-foreground/70" style={{ width: `${used}%` }} />
        <div className="absolute inset-y-0 bg-primary" style={{ left: `${used}%`, width: `${ticket}%` }} />
        <div className="absolute inset-y-[-4px] w-px bg-foreground" style={{ left: "92%" }} title="92% act threshold" />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><span className="mr-1 inline-block h-2 w-2 bg-foreground/70" />Committed {cr(c.committedCr)}</span>
        <span><span className="mr-1 inline-block h-2 w-2 bg-primary" />This ticket {cr(amountCr)}</span>
        <span>Ceiling {cr(ceiling)} ({c.route === "OPI" ? "50%" : "400%"} of net worth)</span>
        <span className="text-foreground">Largest ticket inside the ceiling: {cr(maxTicketCr(c))}</span>
      </div>
    </div>
  );
}

export function PredictiveCases() {
  const feed = useLiveFeed();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(PREDICTIVE_CASES[0]!.id);
  const [overrides, setOverrides] = useState<Record<string, { amountCr: number; docsReady: number }>>({});
  const active = PREDICTIVE_CASES.find((c) => c.id === activeId) ?? PREDICTIVE_CASES[0]!;
  const o = overrides[active.id] ?? { amountCr: active.amountCr, docsReady: active.docsReady };
  const setO = (patch: Partial<typeof o>) => setOverrides((m) => ({ ...m, [active.id]: { ...o, ...patch } }));

  const all = useMemo(
    () => PREDICTIVE_CASES.map((c) => {
      const hubCode = runCase(c, null).code;
      return { c, r: runCase(c, inrPer(feed, hubCode), overrides[c.id] ?? {}) };
    }),
    [feed, overrides],
  );
  const run = all.find((x) => x.c.id === active.id)!.r;
  const purpose = findPurpose(active.purpose);
  const rate = inrPer(feed, run.code);
  const decisive = run.decisive;
  const others = run.forecasts.filter((f) => f.id !== active.decisive);
  const totalTicket = all.reduce((s, x) => s + (overrides[x.c.id]?.amountCr ?? x.c.amountCr), 0);
  const actCount = all.reduce((s, x) => s + x.r.forecasts.filter((f) => f.severity === "act").length, 0);
  const releasable = all.filter((x) => x.r.verdict.state === "release").length;
  const edited = o.amountCr !== active.amountCr || o.docsReady !== active.docsReady;

  const openInDesk = () => {
    setTreasuryScenario({ hub: active.hub, purpose: active.purpose, amountCr: o.amountCr });
    void navigate({ to: "/intelligence", search: { view: "forecast" } });
  };

  return (
    <div>
      {/* Portfolio strip */}
      <dl className="grid grid-cols-2 border-y border-rule/20 sm:grid-cols-4">
        {[
          ["Cases", String(PREDICTIVE_CASES.length), "six sectors, six corridors"],
          ["Tickets modelled", cr(totalTicket), "illustrative, editable below"],
          ["Forecasts to act on", String(actCount), "across all five lenses"],
          ["Ready to release", `${releasable} of ${PREDICTIVE_CASES.length}`, "every forecast inside tolerance"],
        ].map(([k, v, n]) => (
          <div key={k} className="border-r border-rule/15 px-4 py-4 last:border-r-0">
            <dt className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{k}</dt>
            <dd className="font-display mt-1 text-3xl">{v}</dd>
            <dd className="mt-1 text-xs text-muted-foreground">{n}</dd>
          </div>
        ))}
      </dl>

      {/* Case selector */}
      <div role="tablist" aria-label="Predictive cases" className="mt-8 grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-3">
        {all.map(({ c, r }) => {
          const on = c.id === active.id;
          return (
            <button
              key={c.id}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="predictive-case-panel"
              onClick={() => setActiveId(c.id)}
              className={`group bg-background p-5 text-left transition-colors hover:bg-muted/50 ${on ? "outline outline-2 -outline-offset-2 outline-primary" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono-ui text-[10px] tracking-[0.16em] text-primary">CASE {c.n} · {c.sector.toUpperCase()}</span>
                <span className={`font-mono-ui px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${r.verdict.state === "release" ? SEV.clear.chip : r.verdict.state === "fix" ? SEV.watch.chip : SEV.act.chip}`}>
                  {VERDICT[r.verdict.state]}
                </span>
              </div>
              <p className="font-display mt-3 text-lg leading-snug">{c.question}</p>
              <p className="mt-2 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{c.archetype}</p>
            </button>
          );
        })}
      </div>

      {/* Case detail */}
      <section id="predictive-case-panel" role="tabpanel" aria-label={`Case ${active.n}`} className="mt-8 grid gap-8 border-t-2 border-primary pt-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Case {active.n} · {active.sector}</p>
          <h3 className="font-display mt-2 text-3xl leading-tight">{active.archetype}</h3>
          <div className="mt-5 border-l-2 border-rule/30 pl-4">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Without a forward view</p>
            <p className="mt-1 text-sm leading-relaxed">{active.blindSpot}</p>
          </div>

          <dl className="mt-6 divide-y divide-rule/10 border-y border-rule/15 text-sm">
            {[
              ["Hub · currency", `${active.hub} · ${run.code}${rate ? ` · ₹${rate.toFixed(rate < 5 ? 4 : 2)}` : ""}`],
              ["Purpose", `${active.purpose} — ${purpose?.label ?? ""}`],
              ["Route", active.route === "Approval" ? "Approval route" : `${active.route} automatic route`],
              ["Filer", active.firstTimeFiler ? "First overseas filing" : "Known filer"],
              ["Section 195 leg", active.section195 ? "In scope" : "Not engaged"],
              ["Net worth (illustrative)", cr(active.netWorthCr)],
              ["Already committed (illustrative)", cr(active.committedCr)],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[9.5rem_1fr] gap-3 py-2">
                <dt className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          <fieldset className="mt-6 space-y-5">
            <legend className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">What if</legend>
            <label className="block">
              <span className="flex justify-between text-sm"><span>Ticket size</span><span className="font-mono-ui">{cr(o.amountCr)}</span></span>
              <input type="range" min={100} max={Math.max(10000, active.amountCr * 2)} step={50} value={o.amountCr} onChange={(e) => setO({ amountCr: Number(e.target.value) })} className="mt-2 w-full accent-primary" />
            </label>
            <label className="block">
              <span className="flex justify-between text-sm"><span>Document pack ready</span><span className="font-mono-ui">{o.docsReady}%</span></span>
              <input type="range" min={40} max={100} step={1} value={o.docsReady} onChange={(e) => setO({ docsReady: Number(e.target.value) })} className="mt-2 w-full accent-primary" />
            </label>
            {edited ? (
              <Button variant="outline" size="sm" type="button" onClick={() => setOverrides((m) => { const n = { ...m }; delete n[active.id]; return n; })} className="font-mono-ui text-[10px] uppercase tracking-[0.14em]">
                Reset to case inputs
              </Button>
            ) : null}
          </fieldset>
        </div>

        <div className="lg:col-span-7">
          <div className={`p-5 ${run.verdict.state === "release" ? "border border-rule/30" : "bg-primary text-primary-foreground"}`} aria-live="polite">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] opacity-80">Verdict · {VERDICT[run.verdict.state]}</p>
            <p className="font-display mt-2 text-2xl leading-snug">{run.verdict.line}</p>
          </div>

          {decisive ? (
            <article className="mt-6 border border-rule/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Decisive forecast · {decisive.label}</p>
                <span className={`font-mono-ui px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${SEV[decisive.severity].chip}`}>{SEV[decisive.severity].word}</span>
              </div>
              <p className="font-display mt-3 text-2xl leading-snug">{decisive.headline}</p>
              <div className="mt-4 grid grid-cols-3 gap-px bg-rule/15 text-center">
                {[["Likely (p50)", fmt(decisive.p50, decisive.unit)], ["Bad case (p90)", fmt(decisive.p90, decisive.unit)], ["Confidence", `${Math.round(decisive.confidence * 100)}%`]].map(([k, v]) => (
                  <div key={k} className="bg-background px-2 py-3">
                    <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{k}</p>
                    <p className="font-display mt-1 text-xl">{v}</p>
                  </div>
                ))}
              </div>
              {active.decisive === "headroom" ? <div className="mt-5"><HeadroomBar c={active} amountCr={o.amountCr} /></div> : null}
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[["Do", decisive.action.do], ["Why", decisive.action.why], ["Then", decisive.action.then]].map(([k, v]) => (
                  <div key={k} className="border-t-2 border-primary pt-2">
                    <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">{k}</p>
                    <p className="mt-1 text-sm leading-relaxed">{v}</p>
                  </div>
                ))}
              </div>
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Drivers behind this number</summary>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {decisive.drivers.map((d) => <li key={d.k}><span className="text-muted-foreground">{d.k}:</span> {d.v}</li>)}
                </ul>
              </details>
            </article>
          ) : null}

          <ul className="mt-6 divide-y divide-rule/10 border-y border-rule/15">
            {others.map((f) => (
              <li key={f.id} className="grid grid-cols-[5.5rem_1fr] gap-3 py-3 sm:grid-cols-[7rem_1fr_10rem]">
                <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{f.label}</span>
                <span className="text-sm leading-snug">{f.headline}</span>
                <span className="col-start-2 flex items-center gap-2 sm:col-start-auto sm:justify-end">
                  <span className="font-mono-ui whitespace-nowrap text-xs">{fmt(f.p50, f.unit)}</span>
                  <span className={`font-mono-ui px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] ${SEV[f.severity].chip}`}>{SEV[f.severity].word}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={openInDesk} className="font-mono-ui text-[11px] uppercase tracking-[0.14em]">Open this case in the prediction desk</Button>
            <Link to="/agents" search={{ agent: "outlook" }} className="font-mono-ui border border-foreground px-4 py-2 text-[11px] uppercase tracking-[0.14em] hover:text-primary">Ask the currency outlook agent</Link>
            <Link to="/routes" className="font-mono-ui px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary">Check the route</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
