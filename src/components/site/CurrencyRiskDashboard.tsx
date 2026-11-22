import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COUNTRY_META, flag } from "@/data/currencies";
import { FX_RISK_METHOD, FX_RISK_SOURCE } from "@/lib/fx-risk";
import { useFxStream } from "@/lib/fx-stream";
import { horizonMove, policyRatio, swingStats, type Swing } from "@/lib/fx-swings";
import { hubsIn, UNIVERSE_LABEL, type HubUniverse } from "@/lib/hub-compare";
import { useMeasuredFxRisk } from "@/lib/use-fx-risk";
import { addToHedgeBook } from "@/lib/hedge-book";
import { FxSpark } from "@/components/site/FxSpark";

type SortKey = "vol" | "chg52w" | "chg13w" | "chg4w" | "maxDrawdown" | "city";
const SORT_LABEL: Record<SortKey, string> = {
  vol: "Volatility (high first)",
  chg52w: "1-year change (worst first)",
  chg13w: "3-month change (worst first)",
  chg4w: "1-month change (worst first)",
  maxDrawdown: "Deepest fall from peak",
  city: "Hub name",
};
const UNIVERSES: HubUniverse[] = ["all", "global", "africa"];
const WATCH_KEY = "cv-fx-watch-v1";

const pct = (v: number | null | undefined, dp = 1) => (v == null ? "—" : `${v > 0 ? "+" : ""}${(v * 100).toFixed(dp)}%`);
const inr = (v: number | null | undefined) => (!v ? "—" : v < 1 ? `₹${v.toFixed(4)}` : v < 10 ? `₹${v.toFixed(3)}` : `₹${v.toFixed(2)}`);
const tone = (v: number | null | undefined) => (v == null ? "" : v < 0 ? "text-destructive" : "text-primary");

type Row = { city: string; country: string; ccy: string; iso2: string; live: number | null; swing: Swing | null; sinceSnap: number | null };

function RangeBar({ s }: { s: Swing }) {
  return (
    <div className="w-28" title={`52-week low ${inr(s.low)} (${s.lowDate}) · high ${inr(s.high)} (${s.highDate})`}>
      <div className="relative h-1.5 bg-muted">
        <span className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-foreground" style={{ left: `${Math.min(100, Math.max(0, s.rangePos * 100))}%` }} />
      </div>
      <div className="mt-1 flex justify-between font-mono-ui text-[9px] text-muted-foreground"><span>{inr(s.low)}</span><span>{inr(s.high)}</span></div>
    </div>
  );
}

export function CurrencyRiskDashboard() {
  const q = useMeasuredFxRisk();
  const tape = useFxStream();
  const [universe, setUniverse] = useState<HubUniverse>("all");
  const [sort, setSort] = useState<SortKey>("vol");
  const [search, setSearch] = useState("");
  const [watch, setWatch] = useState<string[]>([]);
  const [watchOnly, setWatchOnly] = useState(false);
  const [picked, setPicked] = useState("Singapore");
  const [exposure, setExposure] = useState(250);
  const [horizon, setHorizon] = useState(13);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(WATCH_KEY) ?? "[]"); if (Array.isArray(v)) setWatch(v.filter((x) => typeof x === "string")); } catch { /* ignore */ }
  }, []);
  const toggleWatch = (city: string) => {
    const next = watch.includes(city) ? watch.filter((c) => c !== city) : [...watch, city];
    setWatch(next);
    try { localStorage.setItem(WATCH_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const series = q.data?.series ?? {};
  const live = tape.status === "live" ? tape.anchorInrPer : {};

  const all: Row[] = useMemo(() => hubsIn("all").map((h) => {
    const meta = COUNTRY_META[h.country];
    const ccy = meta?.currency ?? "USD";
    const swing = swingStats(ccy, series[ccy]);
    const lv = live[ccy] ?? null;
    return { city: h.city, country: h.country, ccy, iso2: meta?.iso2 ?? "UN", live: lv, swing, sinceSnap: lv && swing ? lv / swing.last - 1 : null };
  }), [series, live]);

  const inUniverse = new Set(hubsIn(universe).map((h) => h.city));
  const s = search.trim().toLowerCase();
  const rows = all
    .filter((r) => inUniverse.has(r.city))
    .filter((r) => !watchOnly || watch.includes(r.city))
    .filter((r) => !s || `${r.city} ${r.country} ${r.ccy}`.toLowerCase().includes(s))
    .sort((a, b) => {
      if (sort === "city") return a.city.localeCompare(b.city);
      const av = a.swing?.[sort] ?? null, bv = b.swing?.[sort] ?? null;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sort === "vol" ? bv - av : av - bv;
    });

  const sel = all.find((r) => r.city === picked) ?? all[0]!;
  const selPts = series[sel.ccy] ?? [];
  const move = sel.swing ? horizonMove(sel.swing.vol, horizon) : null;
  const policy = sel.swing ? policyRatio(sel.swing.vol) : null;

  const measured = all.filter((r) => r.swing);
  const avgVol = measured.length ? measured.reduce((t, r) => t + r.swing!.vol, 0) / measured.length : null;
  const weakest = [...measured].sort((a, b) => (a.swing!.chg52w ?? 0) - (b.swing!.chg52w ?? 0))[0];
  const calmest = [...measured].sort((a, b) => a.swing!.vol - b.swing!.vol)[0];
  const wildest = [...measured].sort((a, b) => b.swing!.vol - a.swing!.vol)[0];

  const exportCsv = () => {
    const head = ["hub", "country", "currency", "live_inr_per_unit", "live_stamp", "last_weekly_inr", "last_weekly_date", "chg_1w", "chg_1m", "chg_3m", "chg_1y", "low_52w", "high_52w", "max_drawdown", "vol_annualised"];
    const lines = rows.map((r) => [r.city, r.country, r.ccy, r.live ?? "", tape.anchor, r.swing?.last ?? "", r.swing?.lastDate ?? "", r.swing?.chg1w ?? "", r.swing?.chg4w ?? "", r.swing?.chg13w ?? "", r.swing?.chg52w ?? "", r.swing?.low ?? "", r.swing?.high ?? "", r.swing?.maxDrawdown ?? "", r.swing?.vol ?? ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `corpvidesh-hub-currency-risk-${q.data?.asOf ?? "latest"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-10">
      <div className="grid gap-px border border-rule/30 bg-rule/30 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Live feed", v: tape.status === "live" ? "Live" : tape.status === "loading" ? "Connecting…" : "Unavailable", n: tape.status === "live" ? `${tape.source || "Interbank composite"} · ${tape.anchor}` : "Rates refresh every 60 seconds" },
          { k: "Average hub volatility", v: avgVol == null ? "—" : `${(avgVol * 100).toFixed(1)}%`, n: `${measured.length} of ${all.length} hubs measured` },
          { k: "Calmest / most volatile", v: calmest && wildest ? `${calmest.ccy} / ${wildest.ccy}` : "—", n: calmest && wildest ? `${(calmest.swing!.vol * 100).toFixed(1)}% vs ${(wildest.swing!.vol * 100).toFixed(1)}% a year` : "" },
          { k: "Weakest vs ₹ over a year", v: weakest ? `${weakest.ccy} ${pct(weakest.swing!.chg52w)}` : "—", n: weakest ? weakest.city : "" },
        ].map((c) => (
          <div key={c.k} className="bg-background p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{c.k}</div>
            <div className="mt-2 font-display text-3xl">{c.v}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.n}</div>
          </div>
        ))}
      </div>

      {q.isError || q.data?.error ? (
        <p role="alert" className="border-l-2 border-destructive pl-3 text-sm">Exchange-rate history could not be loaded right now. Live rates still show; try again in a few minutes.</p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="border border-rule/30 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Selected hub</div>
              <h3 className="font-display text-3xl">{flag(sel.iso2)} {sel.city} · {sel.ccy}</h3>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl">{inr(sel.live ?? sel.swing?.last)}</div>
              <div className="text-xs text-muted-foreground">{sel.live ? `live per 1 ${sel.ccy} · ${pct(sel.sinceSnap, 2)} since ${sel.swing?.lastDate ?? "last week"}` : `weekly reference ${sel.swing?.lastDate ?? ""}`}</div>
            </div>
          </div>
          <div className="mt-4">
            {q.isPending ? <div className="h-56 animate-pulse bg-muted" /> : <FxSpark points={selPts} live={sel.live} w={760} h={260} axis label={`${sel.ccy} in rupees, weekly over the past year`} />}
          </div>
          {sel.swing && (
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {[
                ["1 week", pct(sel.swing.chg1w, 2), tone(sel.swing.chg1w)],
                ["1 month", pct(sel.swing.chg4w), tone(sel.swing.chg4w)],
                ["3 months", pct(sel.swing.chg13w), tone(sel.swing.chg13w)],
                ["1 year", pct(sel.swing.chg52w), tone(sel.swing.chg52w)],
                ["Worst week", sel.swing.worstWeek ? `${pct(sel.swing.worstWeek.chg)} · ${sel.swing.worstWeek.date}` : "—", "text-destructive"],
                ["Best week", sel.swing.bestWeek ? `${pct(sel.swing.bestWeek.chg)} · ${sel.swing.bestWeek.date}` : "—", "text-primary"],
                ["Deepest fall from peak", pct(sel.swing.maxDrawdown), "text-destructive"],
                ["Volatility, annualised", `${(sel.swing.vol * 100).toFixed(1)}%`, ""],
              ].map(([k, v, c]) => (
                <div key={k}><dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{k}</dt><dd className={`mt-1 font-mono-ui ${c}`}>{v}</dd></div>
              ))}
            </dl>
          )}
        </div>

        <div className="border border-rule/30 p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Track your exposure</div>
          <h3 className="mt-1 font-display text-2xl">What could {sel.ccy} cost you?</h3>
          <label className="mt-5 block text-xs text-muted-foreground" htmlFor="cr-exp">Money held in {sel.ccy} (₹ crore)</label>
          <input id="cr-exp" type="number" min={1} value={exposure} onChange={(e) => setExposure(Math.max(0, Number(e.target.value) || 0))} className="mt-1 w-full border border-input bg-background px-3 py-2 font-mono-ui" />
          <div className="mt-4 text-xs text-muted-foreground">Horizon</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {[[4, "1 month"], [13, "3 months"], [26, "6 months"], [52, "1 year"]].map(([w, l]) => (
              <button key={w} type="button" onClick={() => setHorizon(Number(w))} className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] ${horizon === w ? "bg-primary text-primary-foreground" : "border border-rule/40 text-muted-foreground hover:text-primary"}`}>{l}</button>
            ))}
          </div>
          {move && sel.swing && policy ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-baseline justify-between border-b border-rule/30 pb-3"><span className="text-sm">Typical move (1 in 3 chance of worse)</span><span className="font-mono-ui">±₹{(exposure * move.sigma).toFixed(2)} cr</span></div>
              <div className="flex items-baseline justify-between border-b border-rule/30 pb-3"><span className="text-sm">Bad case (1 in 20 chance of worse)</span><span className="font-mono-ui text-destructive">−₹{(exposure * move.p95).toFixed(2)} cr</span></div>
              <div className="flex items-baseline justify-between border-b border-rule/30 pb-3"><span className="text-sm">Same as the worst past week</span><span className="font-mono-ui">{sel.swing.worstWeek ? `${sel.swing.worstWeek.chg < 0 ? "−" : "+"}₹${Math.abs(exposure * sel.swing.worstWeek.chg).toFixed(2)} cr` : "—"}</span></div>
              <div className="bg-muted/50 p-3 text-sm">
                <span className="font-medium">{policy.band} volatility.</span> A simple rule would cover about <span className="font-mono-ui">{Math.round(policy.ratio * 100)}%</span> with forwards — an example rule, not advice.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { addToHedgeBook(sel.ccy, exposure); setAdded(sel.ccy); }}>Add {sel.ccy} to hedge book</Button>
                <Button size="sm" variant="outline" asChild><Link to="/intelligence" search={{ view: "hedging" }}>Open hedge desk →</Link></Button>
              </div>
              {added === sel.ccy && <p className="text-xs text-primary" role="status">{sel.ccy} is in your hedge book for this session.</p>}
            </div>
          ) : <p className="mt-6 text-sm text-muted-foreground">{q.isPending ? "Loading a year of rates…" : `${sel.ccy} has no measurable history from the source.`}</p>}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {UNIVERSES.map((u) => (
              <button key={u} type="button" onClick={() => setUniverse(u)} className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] ${universe === u ? "bg-primary text-primary-foreground" : "border border-rule/40 text-muted-foreground hover:text-primary"}`}>{UNIVERSE_LABEL[u]}</button>
            ))}
            <button type="button" aria-pressed={watchOnly} onClick={() => setWatchOnly(!watchOnly)} className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] ${watchOnly ? "bg-foreground text-background" : "border border-rule/40 text-muted-foreground hover:text-primary"}`}>★ Watchlist ({watch.length})</button>
          </div>
          <input aria-label="Search hubs" placeholder="Search hub, country or currency" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-52 flex-1 border border-input bg-background px-3 py-1.5 text-sm" />
          <select aria-label="Sort hubs" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="border border-input bg-background px-3 py-1.5 text-sm">
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-3.5 w-3.5" />CSV</Button>
        </div>

        <div className="mt-4 overflow-x-auto border border-rule/30">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="p-3" aria-label="Watch" />
                <th className="p-3">Hub</th>
                <th className="p-3 text-right">Live ₹ per unit</th>
                <th className="p-3 text-right">vs last week's close</th>
                <th className="p-3 text-right">1W</th>
                <th className="p-3 text-right">1M</th>
                <th className="p-3 text-right">3M</th>
                <th className="p-3 text-right">1Y</th>
                <th className="p-3">52-week range</th>
                <th className="p-3 text-right">Max fall</th>
                <th className="p-3 text-right">Vol</th>
                <th className="p-3">Past year</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.city} onClick={() => setPicked(r.city)} className={`cursor-pointer border-t border-rule/20 hover:bg-muted/40 ${r.city === sel.city ? "bg-muted/60" : ""}`}>
                  <td className="p-3">
                    <button type="button" aria-label={watch.includes(r.city) ? `Remove ${r.city} from watchlist` : `Watch ${r.city}`} onClick={(e) => { e.stopPropagation(); toggleWatch(r.city); }}>
                      <Star className={`h-4 w-4 ${watch.includes(r.city) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </button>
                  </td>
                  <td className="p-3"><span className="mr-1">{flag(r.iso2)}</span><span className="font-medium">{r.city}</span> <span className="font-mono-ui text-xs text-muted-foreground">{r.ccy}</span></td>
                  <td className="p-3 text-right font-mono-ui">{inr(r.live)}</td>
                  <td className={`p-3 text-right font-mono-ui ${tone(r.sinceSnap)}`}>{pct(r.sinceSnap, 2)}</td>
                  <td className={`p-3 text-right font-mono-ui ${tone(r.swing?.chg1w)}`}>{pct(r.swing?.chg1w)}</td>
                  <td className={`p-3 text-right font-mono-ui ${tone(r.swing?.chg4w)}`}>{pct(r.swing?.chg4w)}</td>
                  <td className={`p-3 text-right font-mono-ui ${tone(r.swing?.chg13w)}`}>{pct(r.swing?.chg13w)}</td>
                  <td className={`p-3 text-right font-mono-ui ${tone(r.swing?.chg52w)}`}>{pct(r.swing?.chg52w)}</td>
                  <td className="p-3">{r.swing ? <RangeBar s={r.swing} /> : "—"}</td>
                  <td className="p-3 text-right font-mono-ui text-destructive">{r.swing ? pct(r.swing.maxDrawdown) : "—"}</td>
                  <td className="p-3 text-right font-mono-ui">{r.swing ? `${(r.swing.vol * 100).toFixed(1)}%` : q.isPending ? "…" : "n/a"}</td>
                  <td className="p-3"><FxSpark points={series[r.ccy] ?? []} live={r.live} label={`${r.ccy} past year`} /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={12} className="p-6 text-center text-muted-foreground">{watchOnly ? "Star hubs to build your watchlist." : "No hub matches that search."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 text-xs leading-relaxed text-muted-foreground md:grid-cols-2">
        <p><span className="font-medium text-foreground">Live rate:</span> the exact print from the interbank feed, refreshed every 60 seconds ({tape.source || "provider pending"}{tape.anchor ? `, ${tape.anchor}` : ""}). It is a reference mid, not a dealable bank quote. Currencies the feed does not carry show "—".</p>
        <p><span className="font-medium text-foreground">History:</span> {FX_RISK_SOURCE}; 53 weekly observations to {q.data?.asOf ?? "—"}. {FX_RISK_METHOD}. Past swings describe what happened, not what will happen; thinly traded currencies can be noisy.</p>
      </div>
    </div>
  );
}
