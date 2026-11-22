import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Pin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { flag, COUNTRY_META } from "@/data/currencies";
import { useFxStream } from "@/lib/fx-stream";
import { useTreasuryScenario } from "@/lib/treasury-scenario";
import type { RouteKind } from "@/lib/predict";
import {
  compareHubs,
  hubsIn,
  summariseGroups,
  SCORE_WEIGHTS,
  UNIVERSE_LABEL,
  type HubCompareRow,
  type HubUniverse,
} from "@/lib/hub-compare";

type SortKey = "score" | "costBps" | "driftPct" | "legacyDays" | "depth";
const SORT_LABEL: Record<SortKey, string> = {
  score: "Score",
  costBps: "All-in cost",
  driftPct: "FX tail",
  legacyDays: "Paper route",
  depth: "Arrangement depth",
};
const UNIVERSES: HubUniverse[] = ["all", "global", "africa", "SADC", "COMESA"];
const ROUTES: RouteKind[] = ["ODI", "OPI", "Approval"];
const FORECAST_ORDER = ["clearance", "cost", "drift", "rework"] as const;
const MAX_PINS = 3;

const sevClass = { clear: "text-primary", watch: "text-foreground", act: "text-destructive" } as const;

function rate(v: number | null): string {
  if (!v) return "—";
  return v < 1 ? `₹${(v * 100).toFixed(2)}/100` : `₹${v.toFixed(3)}`;
}

/** Scatter: paper-route days (x) against FX tail % of ticket (y); dot size = arrangement depth. */
function RiskMap({ rows, pins, onPick }: { rows: HubCompareRow[]; pins: string[]; onPick: (c: string) => void }) {
  const W = 620, H = 340, P = { l: 52, r: 18, t: 18, b: 40 };
  const xs = rows.map((r) => r.legacyDays), ys = rows.map((r) => r.driftPct);
  const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1;
  const y1 = Math.max(...ys) * 1.12 || 1;
  const X = (v: number) => P.l + ((v - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
  const Y = (v: number) => H - P.b - (v / y1) * (H - P.t - P.b);
  const ticksX = Array.from({ length: 6 }, (_, i) => Math.round(x0 + ((x1 - x0) * i) / 5));
  const ticksY = Array.from({ length: 5 }, (_, i) => (y1 * i) / 4);
  const ordered = [...rows].sort((a, b) => Number(pins.includes(a.hub.city)) - Number(pins.includes(b.hub.city)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Hub risk map: paper-route days against FX tail risk">
      {ticksY.map((t) => (
        <g key={`y${t}`}>
          <line x1={P.l} x2={W - P.r} y1={Y(t)} y2={Y(t)} className="stroke-border" strokeWidth={0.6} />
          <text x={P.l - 6} y={Y(t) + 3} textAnchor="end" fontSize="9" className="fill-muted-foreground font-mono-ui">{t.toFixed(2)}%</text>
        </g>
      ))}
      {ticksX.map((t) => (
        <text key={`x${t}`} x={X(t)} y={H - P.b + 14} textAnchor="middle" fontSize="9" className="fill-muted-foreground font-mono-ui">{t}d</text>
      ))}
      <text x={(W + P.l) / 2} y={H - 6} textAnchor="middle" fontSize="9" letterSpacing="1.5" className="fill-muted-foreground font-mono-ui">PAPER ROUTE TODAY (DAYS) →</text>
      <text x={12} y={(H - P.b) / 2} textAnchor="middle" fontSize="9" letterSpacing="1.5" transform={`rotate(-90 12 ${(H - P.b) / 2})`} className="fill-muted-foreground font-mono-ui">FX TAIL, % OF TICKET →</text>
      <text x={P.l + 6} y={P.t + 10} fontSize="9" letterSpacing="1.2" className="fill-primary font-mono-ui">BEST ZONE · FAST + STABLE</text>
      {ordered.map((r) => {
        const on = pins.includes(r.hub.city);
        const cx = X(r.legacyDays), cy = Y(r.driftPct), rad = 3 + (r.depth / 100) * 5;
        const africa = r.group === "africa";
        return (
          <g key={r.hub.city} role="button" tabIndex={0} aria-pressed={on} aria-label={`${r.hub.city}: score ${r.score}`} className="cursor-pointer outline-none"
            onClick={() => onPick(r.hub.city)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(r.hub.city); } }}>
            <title>{`${r.hub.city} · score ${r.score} · ${r.legacyDays}d · tail ${r.driftPct}%`}</title>
            {africa ? (
              <rect x={cx - rad} y={cy - rad} width={rad * 2} height={rad * 2} transform={`rotate(45 ${cx} ${cy})`}
                className={on ? "fill-primary stroke-foreground" : "fill-primary/35 stroke-primary"} strokeWidth={on ? 1.5 : 0.8} />
            ) : (
              <circle cx={cx} cy={cy} r={rad} className={on ? "fill-primary stroke-foreground" : "fill-foreground/20 stroke-foreground/60"} strokeWidth={on ? 1.5 : 0.6} />
            )}
            {on && <text x={cx + rad + 4} y={cy + 3} fontSize="11" fontWeight={700} className="fill-foreground">{r.hub.city}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function HubPredictiveCompare({ defaultUniverse = "all" }: { defaultUniverse?: HubUniverse }) {
  const fx = useFxStream();
  const [scenario, setScenario] = useTreasuryScenario();
  const [universe, setUniverse] = useState<HubUniverse>(defaultUniverse);
  const [routeOverride, setRoute] = useState<RouteKind | null>(null);
  const [docsReady, setDocs] = useState(90);
  const [s195, setS195] = useState(true);
  const [firstTime, setFirstTime] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [userPins, setPins] = useState<string[] | null>(null);
  const route: RouteKind = routeOverride ?? (scenario.purpose.startsWith("OPI") ? "OPI" : "ODI");

  const rows = useMemo(
    () => compareHubs(hubsIn(universe), { notionalCr: scenario.amountCr, route, docsReady, firstTimeFiler: firstTime, section195: s195, inrPer: fx.inrPer }),
    [universe, scenario.amountCr, route, docsReady, firstTime, s195, fx.inrPer],
  );
  const groups = useMemo(() => summariseGroups(rows), [rows]);
  const sorted = useMemo(() => {
    const dir: Record<SortKey, 1 | -1> = { score: -1, costBps: 1, driftPct: 1, legacyDays: 1, depth: -1 };
    return [...rows].sort((a, b) => dir[sort] * (a[sort] - b[sort]) || a.rank - b.rank);
  }, [rows, sort]);

  const defaults = useMemo(() => {
    const out: string[] = [];
    const add = (c?: string) => { if (c && !out.includes(c) && rows.some((r) => r.hub.city === c)) out.push(c); };
    add(scenario.hub);
    add(rows.find((r) => r.group === "global")?.hub.city);
    add(rows.find((r) => r.group === "africa")?.hub.city);
    for (const r of rows) if (out.length < MAX_PINS) add(r.hub.city);
    return out.slice(0, MAX_PINS);
  }, [rows, scenario.hub]);
  const pins = (userPins ?? defaults).filter((c) => rows.some((r) => r.hub.city === c));
  const pinned = pins.map((c) => rows.find((r) => r.hub.city === c)!).filter(Boolean);

  const toggle = (city: string) => {
    const cur = pins;
    if (cur.includes(city)) setPins(cur.filter((c) => c !== city));
    else setPins([...cur.slice(-(MAX_PINS - 1)), city]);
  };

  const best = (id: (typeof FORECAST_ORDER)[number]) => {
    const vals = pinned.map((r) => r.forecasts.find((f) => f.id === id)?.p50 ?? Infinity);
    return Math.min(...vals);
  };
  const leader = rows[0];

  return (
    <div className="min-w-0">
      {/* Controls */}
      <div className="grid gap-px border border-border bg-border lg:grid-cols-[1.3fr_1fr_1fr]">
        <div className="bg-background p-4">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Compare universe</p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Hub universe">
            {UNIVERSES.map((u) => (
              <Button key={u} size="sm" variant={universe === u ? "default" : "outline"} className="rounded-none" aria-pressed={universe === u} onClick={() => { setUniverse(u); setPins(null); }}>
                {UNIVERSE_LABEL[u]}
              </Button>
            ))}
          </div>
          <p className="mt-3 font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Route</p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Investment route">
            {ROUTES.map((r) => (
              <Button key={r} size="sm" variant={route === r ? "default" : "outline"} className="rounded-none" aria-pressed={route === r} onClick={() => setRoute(r)}>
                {r === "Approval" ? "Approval route" : `${r} automatic`}
              </Button>
            ))}
          </div>
        </div>
        <div className="bg-background p-4">
          <label className="block">
            <span className="flex items-baseline justify-between font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Ticket <b className="tnum text-sm normal-case tracking-normal text-foreground">₹{scenario.amountCr.toLocaleString("en-IN")} cr</b>
            </span>
            <input type="range" min={10} max={5000} step={5} value={scenario.amountCr} onChange={(e) => setScenario({ amountCr: Number(e.target.value) })} className="mt-2 w-full accent-primary" aria-label="Ticket size in crore" />
          </label>
          <label className="mt-3 block">
            <span className="flex items-baseline justify-between font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Evidence pack <b className="tnum text-sm normal-case tracking-normal text-foreground">{docsReady}%</b>
            </span>
            <input type="range" min={40} max={100} step={1} value={docsReady} onChange={(e) => setDocs(Number(e.target.value))} className="mt-2 w-full accent-primary" aria-label="Evidence pack completeness" />
          </label>
        </div>
        <div className="space-y-2 bg-background p-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={s195} onChange={(e) => setS195(e.target.checked)} className="accent-primary" /> Section 195 leg in scope</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={firstTime} onChange={(e) => setFirstTime(e.target.checked)} className="accent-primary" /> First-time filer</label>
          <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
            Same case, same model, every hub. Ticket follows the shared treasury scenario.
          </p>
        </div>
      </div>

      {/* Lead read + group comparison */}
      {leader && (
        <div className="mt-4 border-l-4 border-primary bg-secondary/60 p-4 text-sm leading-relaxed">
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">Model lead · </span>
          <b>{leader.hub.city}</b> scores {leader.score}/100 across {rows.length} hubs for a ₹{scenario.amountCr.toLocaleString("en-IN")} cr {route} ticket — {leader.costBps} bps all-in, FX tail {leader.driftPct}% of ticket, {leader.legacyDays}-day paper route today. {leader.verdict.line}
        </div>
      )}

      <div className="mt-4 grid gap-px border border-border bg-border md:grid-cols-2">
        {groups.filter((g) => g.count > 0).map((g) => (
          <div key={g.group} className="bg-background p-4">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">{g.group === "global" ? "Global hubs" : "African SADC/COMESA hubs"} · {g.count} in view</p>
            <dl className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {[
                ["Avg score", String(g.avgScore)],
                ["Avg cost", `${g.avgCostBps} bps`],
                ["Avg FX tail", `${g.avgDriftPct}%`],
                ["Avg route", `${g.avgDays} d`],
                ["DTAA in force", `${g.dtaaShare}%`],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{k}</dt>
                  <dd className="tnum mt-0.5 font-display text-2xl leading-none">{v}</dd>
                </div>
              ))}
            </dl>
            {g.best && (
              <button type="button" onClick={() => toggle(g.best!.hub.city)} className="mt-3 text-left text-xs text-muted-foreground hover:text-foreground">
                Best in group: <b className="text-foreground">{g.best.hub.city}</b> (#{g.best.rank}, score {g.best.score}) — {pins.includes(g.best.hub.city) ? "pinned" : "tap to pin"}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Risk map + head-to-head */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <div className="min-w-0 self-start border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Risk map · tap any hub to pin</p>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">● global · ◆ African · size = arrangement depth</p>
          </div>
          {rows.length > 0 && <RiskMap rows={rows} pins={pins} onPick={toggle} />}
        </div>

        <div className="min-w-0">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Head-to-head · up to {MAX_PINS} hubs</p>
          {pinned.length === 0 ? (
            <p className="mt-3 border border-dashed border-border p-6 text-sm text-muted-foreground">Pin hubs from the map or the table to compare forecasts side by side.</p>
          ) : (
            <div className={`mt-2 grid gap-px border border-border bg-border ${pinned.length === 3 ? "sm:grid-cols-3" : pinned.length === 2 ? "sm:grid-cols-2" : ""}`}>
              {pinned.map((r) => {
                const iso = COUNTRY_META[r.hub.country]?.iso2;
                const inScenario = scenario.hub === r.hub.city;
                return (
                  <div key={r.hub.city} className="min-w-0 bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">#{r.rank} · {r.group === "africa" ? `African · ${r.blocs.join("+")}` : "Global"}</p>
                        <p className="font-display truncate text-xl leading-tight">{iso ? <span aria-hidden="true">{flag(iso)} </span> : null}{r.hub.city}</p>
                        <p className="text-xs text-muted-foreground">{r.ccy} · {rate(r.rateNow)}</p>
                      </div>
                      <button type="button" aria-label={`Unpin ${r.hub.city}`} onClick={() => toggle(r.hub.city)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
                    </div>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="tnum font-display text-4xl leading-none text-primary">{r.score}</span>
                      <span className="pb-1 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-muted-foreground">/100 score</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-secondary"><div className="h-full bg-primary" style={{ width: `${r.score}%` }} /></div>
                    <dl className="mt-3 space-y-1.5 text-xs">
                      {FORECAST_ORDER.map((id) => {
                        const f = r.forecasts.find((x) => x.id === id);
                        if (!f) return null;
                        const isBest = pinned.length > 1 && f.p50 === best(id) && new Set(pinned.map((p) => p.forecasts.find((x) => x.id === id)?.p50)).size > 1;
                        return (
                          <div key={id} className="flex items-baseline justify-between gap-2 border-b border-border pb-1">
                            <dt className="text-muted-foreground">{f.label}</dt>
                            <dd className={`tnum text-right font-medium ${sevClass[f.severity]}`}>
                              {isBest && <span className="mr-1 font-mono-ui text-[9px] uppercase text-primary">best</span>}
                              {f.p50}<span className="text-muted-foreground"> / {f.p90} {f.unit}</span>
                            </dd>
                          </div>
                        );
                      })}
                      <div className="flex items-baseline justify-between gap-2 border-b border-border pb-1">
                        <dt className="text-muted-foreground">Paper route today</dt><dd className="tnum font-medium">{r.legacyDays} days</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-muted-foreground">India DTAA</dt><dd className="font-medium">{r.dtaa}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-xs leading-snug text-muted-foreground">{r.verdict.line}</p>
                    <Button size="sm" variant={inScenario ? "outline" : "default"} className="mt-3 w-full rounded-none" disabled={inScenario} onClick={() => setScenario({ hub: r.hub.city })}>
                      {inScenario ? <><Check /> Scenario hub</> : <>Use as scenario hub</>}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">p50 / p90 per forecast. Clearance and query risk depend on the case, so they match across hubs; cost, FX tail and route time are corridor-specific.</p>
          <Button asChild variant="outline" size="sm" className="mt-3 rounded-none">
            <Link to="/console">Run the chosen hub through clearance <ArrowRight /></Link>
          </Button>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Rank by</span>
        {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
          <Button key={k} size="sm" variant={sort === k ? "default" : "outline"} className="h-8 rounded-none font-mono-ui text-[10px] uppercase tracking-[0.12em]" aria-pressed={sort === k} onClick={() => setSort(k)}>
            {SORT_LABEL[k]}
          </Button>
        ))}
        <span className="ml-auto font-mono-ui text-[10px] uppercase text-muted-foreground">{rows.length} hubs · {pins.length}/{MAX_PINS} pinned</span>
      </div>
      <div className="mt-2 max-h-[560px] overflow-auto border border-border">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-primary text-primary-foreground">
              {["#", "Hub", "Group", "Score", "All-in cost", "FX tail (95%)", "Paper route → rail", "Query risk", "Depth", "DTAA", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-mono-ui text-[10px] font-medium uppercase tracking-[0.14em]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const on = pins.includes(r.hub.city);
              const iso = COUNTRY_META[r.hub.country]?.iso2;
              return (
                <tr key={r.hub.city} onClick={() => toggle(r.hub.city)} className={`cursor-pointer border-t border-border align-top even:bg-secondary/50 hover:bg-secondary ${on ? "outline outline-2 -outline-offset-2 outline-primary" : ""}`}>
                  <td className="tnum px-3 py-2 font-mono-ui text-[11px] text-muted-foreground">{String(r.rank).padStart(2, "0")}</td>
                  <td className="px-3 py-2 font-medium">{iso ? <span aria-hidden="true">{flag(iso)} </span> : null}{r.hub.city}<span className="block text-xs font-normal text-muted-foreground">{r.hub.country} · {r.ccy}</span></td>
                  <td className="px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.1em]">{r.group === "africa" ? <span className="text-primary">African · {r.blocs.join("+")}</span> : r.blocs.length ? `Global · ${r.blocs.join("+")}` : "Global"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2"><div className="h-1.5 w-16 bg-secondary"><div className="h-full bg-primary" style={{ width: `${r.score}%` }} /></div><span className="tnum font-medium">{r.score}</span></div>
                  </td>
                  <td className="tnum px-3 py-2">{r.costBps} bps</td>
                  <td className="tnum px-3 py-2">₹{r.driftP90Cr} cr <span className="text-xs text-muted-foreground">({r.driftPct}%)</span></td>
                  <td className="tnum px-3 py-2">{r.legacyDays} d → <span className="text-primary">{r.railMin} min</span></td>
                  <td className="tnum px-3 py-2">{r.queryPct}%</td>
                  <td className="tnum px-3 py-2">{r.depth}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.dtaa}</td>
                  <td className="px-3 py-2">{on ? <Pin className="size-4 text-primary" aria-label="Pinned" /> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Score = {SORT_WEIGHTS_TEXT}, each normalised across the hubs in view. Forecasts reuse the Prediction model: AD margin band by corridor depth, assumed annualised currency volatility, legacy route days and India's arrangement stack. Indicative demonstration only — not tax, legal or investment advice, and not evidence of treaty eligibility or regulator approval.
      </p>
    </div>
  );
}

const SORT_WEIGHTS_TEXT = `${SCORE_WEIGHTS.depth * 100}% arrangement depth + ${SCORE_WEIGHTS.cost * 100}% all-in cost + ${SCORE_WEIGHTS.drift * 100}% FX tail + ${SCORE_WEIGHTS.days * 100}% paper-route days`;
