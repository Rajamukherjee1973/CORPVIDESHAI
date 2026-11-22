import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookRisk, hedgeCost, policyRatio, shockPnl, type HedgePosition } from "@/lib/fx-swings";
import { HUB_CCYS, useMeasuredFxRisk } from "@/lib/use-fx-risk";
import { useHedgeBook } from "@/lib/hedge-book";
import { useFxStream } from "@/lib/fx-stream";

const HORIZONS = [[4, "1 month"], [13, "3 months"], [26, "6 months"], [52, "1 year"]] as const;
const cr = (v: number) => `${v < 0 ? "−" : ""}₹${Math.abs(v).toFixed(2)} cr`;

function Frontier({ points, current }: { points: { h: number; risk: number; cost: number }[]; current: number }) {
  const W = 620, H = 240, P = { l: 52, r: 52, t: 14, b: 32 };
  const maxR = Math.max(...points.map((p) => p.risk), 0.01);
  const maxC = Math.max(...points.map((p) => p.cost), 0.01);
  const X = (h: number) => P.l + h * (W - P.l - P.r);
  const YR = (v: number) => H - P.b - (v / maxR) * (H - P.t - P.b);
  const YC = (v: number) => H - P.b - (v / maxC) * (H - P.t - P.b);
  const line = (f: (p: { h: number; risk: number; cost: number }) => number) => points.map((p, i) => `${i ? "L" : "M"}${X(p.h).toFixed(1)},${f(p).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Residual loss and hedge cost across hedge ratios">
      {[0, 0.25, 0.5, 0.75, 1].map((h) => (
        <g key={h}>
          <line x1={X(h)} x2={X(h)} y1={P.t} y2={H - P.b} className="stroke-border" strokeWidth={0.6} />
          <text x={X(h)} y={H - 12} textAnchor="middle" fontSize="10" className="fill-muted-foreground font-mono-ui">{h * 100}%</text>
        </g>
      ))}
      <text x={P.l - 6} y={YR(maxR) + 3} textAnchor="end" fontSize="10" className="fill-destructive font-mono-ui">₹{maxR.toFixed(0)}</text>
      <text x={W - P.r + 6} y={YC(maxC) + 3} fontSize="10" className="fill-primary font-mono-ui">₹{maxC.toFixed(1)}</text>
      <path d={line((p) => YR(p.risk))} fill="none" strokeWidth={2} className="stroke-destructive" />
      <path d={line((p) => YC(p.cost))} fill="none" strokeWidth={2} strokeDasharray="5 4" className="stroke-primary" />
      <line x1={X(current)} x2={X(current)} y1={P.t} y2={H - P.b} strokeWidth={1.5} className="stroke-foreground" />
    </svg>
  );
}

export function HedgeDesk() {
  const q = useMeasuredFxRisk();
  const tape = useFxStream();
  const [book, setBook, ready] = useHedgeBook();
  const [horizon, setHorizon] = useState<number>(13);
  const [carry, setCarry] = useState(2);
  const [shock, setShock] = useState(-5);
  const [addCcy, setAddCcy] = useState("EUR");
  const [addCr, setAddCr] = useState(100);

  const series = q.data?.series ?? {};
  const vols = q.data?.vols ?? {};
  const risk = useMemo(() => bookRisk(book, series, horizon), [book, series, horizon]);
  const cost = hedgeCost(book, carry / 100, horizon);
  const pnl = shockPnl(book, shock / 100);
  const gross = book.reduce((s, p) => s + Math.max(0, p.exposureCr), 0);
  const avgHedge = gross > 0 ? book.reduce((s, p) => s + Math.max(0, p.exposureCr) * p.hedgeRatio, 0) / gross : 0;
  const frontier = useMemo(() => Array.from({ length: 11 }, (_, i) => {
    const h = i / 10;
    const b = book.map((p) => ({ ...p, hedgeRatio: h }));
    return { h, risk: bookRisk(b, series, horizon)?.hedgedVar ?? 0, cost: hedgeCost(b, carry / 100, horizon) };
  }), [book, series, horizon, carry]);

  const update = (i: number, patch: Partial<HedgePosition>) => setBook(book.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const applyPolicy = () => setBook(book.map((p) => (vols[p.code] ? { ...p, hedgeRatio: policyRatio(vols[p.code]!.vol).ratio } : p)));
  const add = () => { if (addCr > 0 && !book.some((p) => p.code === addCcy)) setBook([...book, { code: addCcy, exposureCr: addCr, hedgeRatio: 0.5 }]); };

  const exportMemo = () => {
    const memo = {
      title: "CorpVidesh AI hedge desk memo (illustrative, not advice)",
      generatedAt: new Date().toISOString(),
      horizonWeeks: horizon,
      carryAssumptionPa: carry / 100,
      positions: book.map((p) => ({ ...p, liveInrPerUnit: tape.anchorInrPer[p.code] ?? null, measuredVol: vols[p.code]?.vol ?? null, policy: vols[p.code] ? policyRatio(vols[p.code]!.vol) : null })),
      risk,
      hedgeCostCr: cost,
      shock: { pct: shock, ...pnl },
      sources: { live: `${tape.source} ${tape.anchor}`, history: q.data?.source, asOf: q.data?.asOf, method: q.data?.method },
    };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(memo, null, 2)], { type: "application/json" }));
    a.download = "corpvidesh-hedge-memo.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const removed = risk && risk.unhedgedVar > 0 ? 1 - risk.hedgedVar / risk.unhedgedVar : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Horizon</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {HORIZONS.map(([w, l]) => (
              <button key={w} type="button" onClick={() => setHorizon(w)} className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] ${horizon === w ? "bg-primary text-primary-foreground" : "border border-rule/40 text-muted-foreground hover:text-primary"}`}>{l}</button>
            ))}
          </div>
        </div>
        <label className="text-xs text-muted-foreground">Forward cost assumption (% a year)
          <input type="number" step={0.25} min={0} max={15} value={carry} onChange={(e) => setCarry(Math.max(0, Number(e.target.value) || 0))} className="mt-1 block w-28 border border-input bg-background px-3 py-1.5 font-mono-ui text-foreground" />
        </label>
        <Button size="sm" variant="outline" onClick={applyPolicy}>Apply example policy to all</Button>
        <Button size="sm" variant="outline" onClick={exportMemo}><Download className="mr-1 h-3.5 w-3.5" />Hedge memo</Button>
        <Link to="/currency-risk" className="text-[11px] uppercase tracking-[0.16em] text-primary hover:underline">Hub currency-risk dashboard →</Link>
      </div>

      <div className="grid gap-px border border-rule/30 bg-rule/30 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { k: "Bad case, no hedges", v: risk ? cr(-risk.unhedgedVar) : "—", n: "1 in 20 chance of worse", c: "text-destructive" },
          { k: "Bad case, with your hedges", v: risk ? cr(-risk.hedgedVar) : "—", n: `${Math.round(avgHedge * 100)}% of ₹${gross.toFixed(0)} cr covered`, c: "" },
          { k: "Risk removed", v: risk ? `${Math.round(removed * 100)}%` : "—", n: "of the bad-case loss", c: "text-primary" },
          { k: "Hedge cost", v: cr(cost), n: `at ${carry}% a year, assumed`, c: "" },
          { k: "Spread across currencies saves", v: risk ? cr(risk.diversification) : "—", n: "vs adding each one up", c: "" },
        ].map((x) => (
          <div key={x.k} className="bg-background p-4">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{x.k}</div>
            <div className={`mt-2 font-display text-2xl ${x.c}`}>{x.v}</div>
            <div className="mt-1 text-xs text-muted-foreground">{x.n}</div>
          </div>
        ))}
      </div>
      {!risk && <p className="text-sm text-muted-foreground" role="status">{q.isPending || !ready ? "Loading a year of rates for your book…" : "Add currencies with at least six months of shared history to see the combined risk."}</p>}

      <div className="overflow-x-auto border border-rule/30">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr><th className="p-3">Currency</th><th className="p-3 text-right">Live ₹</th><th className="p-3">Exposure (₹ cr)</th><th className="p-3">Covered with forwards</th><th className="p-3 text-right">Vol</th><th className="p-3">Example policy</th><th className="p-3 text-right">Bad case alone</th><th className="p-3" aria-label="Remove" /></tr>
          </thead>
          <tbody>
            {book.map((p, i) => {
              const v = vols[p.code]?.vol;
              const pol = v != null ? policyRatio(v) : null;
              const alone = v != null ? p.exposureCr * (1 - p.hedgeRatio) * 1.645 * v * Math.sqrt(horizon / 52) : null;
              const lv = tape.anchorInrPer[p.code];
              return (
                <tr key={p.code} className="border-t border-rule/20">
                  <td className="p-3 font-mono-ui font-medium">{p.code}</td>
                  <td className="p-3 text-right font-mono-ui">{lv ? `₹${lv < 10 ? lv.toFixed(3) : lv.toFixed(2)}` : "—"}</td>
                  <td className="p-3"><input aria-label={`${p.code} exposure in crore`} type="number" min={0} value={p.exposureCr} onChange={(e) => update(i, { exposureCr: Math.max(0, Number(e.target.value) || 0) })} className="w-28 border border-input bg-background px-2 py-1 font-mono-ui" /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <input aria-label={`${p.code} hedge ratio`} type="range" min={0} max={100} step={5} value={Math.round(p.hedgeRatio * 100)} onChange={(e) => update(i, { hedgeRatio: Number(e.target.value) / 100 })} className="w-36 accent-primary" />
                      <span className="w-10 font-mono-ui">{Math.round(p.hedgeRatio * 100)}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono-ui">{v != null ? `${(v * 100).toFixed(1)}%` : "n/a"}</td>
                  <td className="p-3">{pol ? <button type="button" onClick={() => update(i, { hedgeRatio: pol.ratio })} className="text-xs text-primary hover:underline">{pol.band}: use {Math.round(pol.ratio * 100)}%</button> : "—"}</td>
                  <td className="p-3 text-right font-mono-ui text-destructive">{alone != null ? cr(-alone) : "—"}</td>
                  <td className="p-3"><button type="button" aria-label={`Remove ${p.code}`} onClick={() => setBook(book.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center gap-2 border-t border-rule/20 p-3">
          <select aria-label="Currency to add" value={addCcy} onChange={(e) => setAddCcy(e.target.value)} className="border border-input bg-background px-2 py-1 text-sm">
            {[...new Set([...HUB_CCYS, "EUR", "JPY", "CHF"])].sort().map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input aria-label="Exposure to add in crore" type="number" min={1} value={addCr} onChange={(e) => setAddCr(Number(e.target.value) || 0)} className="w-24 border border-input bg-background px-2 py-1 font-mono-ui text-sm" />
          <Button size="sm" onClick={add} disabled={book.some((p) => p.code === addCcy)}>Add currency</Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="border border-rule/30 p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Cover more, pay more</div>
          <h3 className="mt-1 font-display text-2xl">Bad-case loss vs hedge cost at every cover level</h3>
          <div className="mt-4"><Frontier points={frontier} current={avgHedge} /></div>
          <p className="mt-2 text-xs text-muted-foreground"><span className="text-destructive">Solid red</span>: bad-case loss left over. <span className="text-primary">Dashed</span>: forward cost. Black line: your current average cover.</p>
        </div>
        <div className="border border-rule/30 p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Stress test</div>
          <h3 className="mt-1 font-display text-2xl">If the rupee moves {shock > 0 ? "weaker" : "stronger"} by {Math.abs(shock)}% against every currency</h3>
          <input aria-label="Rupee move in percent" type="range" min={-15} max={15} step={1} value={shock} onChange={(e) => setShock(Number(e.target.value))} className="mt-4 w-full accent-primary" />
          <div className="flex justify-between font-mono-ui text-[10px] text-muted-foreground"><span>Rupee 15% stronger</span><span>15% weaker</span></div>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div><dt className="text-xs text-muted-foreground">No hedges</dt><dd className={`font-display text-3xl ${pnl.unhedged < 0 ? "text-destructive" : "text-primary"}`}>{cr(pnl.unhedged)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">With your hedges</dt><dd className={`font-display text-3xl ${pnl.hedged < 0 ? "text-destructive" : "text-primary"}`}>{cr(pnl.hedged)}</dd></div>
          </dl>
          {risk?.worstWeek && (
            <p className="mt-5 border-t border-rule/30 pt-4 text-sm">Replaying the worst real week ({risk.worstWeek.date}) on today's book: <span className="font-mono-ui text-destructive">{cr(risk.worstWeek.unhedged)}</span> without hedges, <span className="font-mono-ui">{cr(risk.worstWeek.hedged)}</span> with them.</p>
          )}
        </div>
      </div>

      {risk && risk.codes.length > 1 && (
        <div className="border border-rule/30 p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Which currencies move together</div>
          <p className="mt-1 text-sm text-muted-foreground">Weekly moves against the rupee over {risk.observations} shared weeks. Close to 1 means they rise and fall together, so spreading money between them helps less.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="text-xs">
              <thead><tr><th />{risk.codes.map((c) => <th key={c} className="px-2 py-1 font-mono-ui">{c}</th>)}</tr></thead>
              <tbody>
                {risk.codes.map((c, i) => (
                  <tr key={c}>
                    <th className="pr-2 text-right font-mono-ui">{c}</th>
                    {risk.corr[i]!.map((v, j) => (
                      <td key={j} className="h-10 w-14 text-center font-mono-ui" style={{ backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(Math.max(0, v) * 55)}%, transparent)` }}>{v.toFixed(2)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Illustrative risk desk. Losses use a year of weekly rupee reference rates ({q.data?.asOf ? `to ${q.data.asOf}` : "loading"}) and how the currencies moved together; live rates come from the 60-second interbank feed. The forward cost is your assumption, the cover rule is an example, and nothing here books, quotes or recommends a hedge — forwards are arranged with an authorised dealer bank under its own documentation. Your book stays in this browser tab only.
      </p>
    </div>
  );
}
