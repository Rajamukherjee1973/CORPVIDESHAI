import { useMemo, useState } from "react";
import { ODI_HISTORY, ODI_MARKERS, ODI_SECTORS, ODI_SOURCES, type OdiYear, type SectorKey } from "@/data/odi-sector-history";
import { amountIn, cagr, fmtAmount, fmtAxis, fyShort, niceMax, odiCsv, sectorShares, sectorYears, totalIn, type OdiUnit } from "@/lib/odi-history";

type View = "amount" | "share";

const W = 1040;
const H = 380;
const PAD = { l: 70, r: 10, t: 28, b: 44 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

const first = ODI_HISTORY[0]!;
const last = ODI_HISTORY[ODI_HISTORY.length - 1]!;
const firstSplit = sectorYears()[0]!;

function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex border border-foreground">
      {options.map(([v, t]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`font-mono-ui px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors ${value === v ? "bg-foreground text-background" : "hover:bg-muted"}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function Sparkline({ k, unit }: { k: SectorKey; unit: OdiUnit }) {
  const pts = ODI_HISTORY.map((y, i) => ({ i, v: y.sectors ? amountIn(y, y.sectors[k], unit) : null }));
  const max = Math.max(...pts.map((p) => p.v ?? 0)) || 1;
  const x = (i: number) => (i / (ODI_HISTORY.length - 1)) * 120;
  const y = (v: number) => 26 - (v / max) * 24;
  const segs: string[] = [];
  let cur = "";
  for (const p of pts) {
    if (p.v === null) { if (cur) segs.push(cur); cur = ""; continue; }
    cur += `${cur ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`;
  }
  if (cur) segs.push(cur);
  return (
    <svg viewBox="0 0 120 28" className="h-7 w-28" aria-hidden="true">
      {segs.map((d) => <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={1.4} />)}
    </svg>
  );
}

export function OdiSectorHistory() {
  const [unit, setUnit] = useState<OdiUnit>("inr");
  const [view, setView] = useState<View>("amount");
  const [focus, setFocus] = useState<SectorKey | null>(null);
  const [selected, setSelected] = useState<string>(last.fy);

  const sel = ODI_HISTORY.find((y) => y.fy === selected) ?? last;
  const yMax = useMemo(() => (view === "share" ? 100 : niceMax(Math.max(...ODI_HISTORY.map((y) => totalIn(y, unit))))), [unit, view]);
  const slot = PLOT_W / ODI_HISTORY.length;
  const bw = slot * 0.66;
  const yPx = (v: number) => PAD.t + PLOT_H - (v / yMax) * PLOT_H;

  const firstInr = totalIn(first, "inr");
  const lastInr = totalIn(last, "inr");
  const multiple = totalIn(last, unit) / totalIn(first, unit);
  const growth = cagr(totalIn(first, unit), totalIn(last, unit), ODI_HISTORY.length - 1);
  const finThen = sectorShares(firstSplit)!.fin;
  const finNow = sectorShares(last)!.fin;
  const mfgThen = sectorShares(firstSplit)!.mfg;
  const mfgNow = sectorShares(last)!.mfg;

  const downloadCsv = () => {
    const blob = new Blob([odiCsv()], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "corpvidesh-india-odi-sector-outflows-fy2001-fy2026.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const segmentsFor = (y: OdiYear) => {
    if (!y.sectors) return null;
    const shares = sectorShares(y)!;
    let acc = 0;
    return ODI_SECTORS.map((s) => {
      const v = view === "share" ? shares[s.key] : amountIn(y, y.sectors![s.key], unit);
      const seg = { key: s.key, color: s.color, y0: acc, y1: acc + v };
      acc += v;
      return seg;
    });
  };

  const ticks = Array.from({ length: 6 }, (_, i) => (yMax / 5) * i);

  return (
    <section id="rupee-outflow" className="mx-auto max-w-[1400px] scroll-mt-24 px-6 py-10" aria-labelledby="odi-history-title">
      <div className="mb-8 flex items-center gap-4 border-t border-rule pt-3">
        <h2 className="font-mono-ui text-[10px] font-normal uppercase tracking-[0.22em] text-primary">Real data · 26 years of rupee outflow by sector</h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">India · actual overseas direct investment per year · FY2000-01 → FY2025-26</p>
          <h3 id="odi-history-title" className="font-display mt-4 text-4xl leading-[1.05] sm:text-5xl">
            {fmtAmount(firstInr, "inr")} <span className="text-primary">→ {fmtAmount(lastInr, "inr")}</span>
          </h3>
        </div>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
          Indian companies now send more than seventy times as many rupees abroad each year as they did in 2000-01, spread across far more
          sectors. Each transfer is still reported through AD Category-I banks and reviewed desk by desk — the volume CorpVidesh AI is built to carry.
        </p>
      </div>

      <div className="mt-10 grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [fmtAmount(totalIn(first, unit), unit), `FY2000-01 outflow`, `${fmtAmount(first.usdMn, "usd")} at ₹${first.inrPerUsd.toFixed(2)}/US$.`],
          [fmtAmount(totalIn(last, unit), unit), `FY2025-26 outflow`, `${fmtAmount(last.usdMn, "usd")} at ₹${last.inrPerUsd.toFixed(2)}/US$ (provisional).`],
          [`${multiple.toFixed(0)}×`, `Growth in ${unit === "inr" ? "rupee" : "dollar"} terms`, `${(growth * 100).toFixed(1)}% compound a year over 25 years.`],
          [`${finThen.toFixed(0)}% → ${finNow.toFixed(0)}%`, "Financial & business services share", `Manufacturing fell from ${mfgThen.toFixed(0)}% to ${mfgNow.toFixed(0)}% (${fyShort(firstSplit.fy)}–FY26).`],
        ].map(([k, t, d]) => (
          <div key={t} className="bg-background p-6">
            <p className="font-display text-3xl text-primary sm:text-4xl">{k}</p>
            <p className="font-mono-ui mt-3 text-[10px] uppercase tracking-[0.16em]">{t}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Toggle label="Currency" value={unit} onChange={setUnit} options={[["inr", "₹ crore"], ["usd", "US$ million"]]} />
        <Toggle label="Chart view" value={view} onChange={setView} options={[["amount", "Amount"], ["share", "Sector share %"]]} />
        <button type="button" onClick={downloadCsv} className="font-mono-ui ml-auto border border-rule/40 px-3 py-2 text-[10px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary">
          Download data (CSV)
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Highlight a sector">
        {ODI_SECTORS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={focus === s.key}
            onClick={() => setFocus((f) => (f === s.key ? null : s.key))}
            className={`font-mono-ui inline-flex items-center gap-2 border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] transition-opacity ${focus === s.key ? "border-foreground" : "border-rule/20"} ${focus && focus !== s.key ? "opacity-45" : ""}`}
          >
            <span className="inline-block h-2.5 w-2.5 border border-rule/30" style={{ background: s.color }} aria-hidden="true" />
            {s.short}
          </button>
        ))}
        <span className="font-mono-ui inline-flex items-center gap-2 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          <svg width="10" height="10" aria-hidden="true"><rect width="10" height="10" fill="url(#odi-hatch-key)" stroke="currentColor" strokeWidth="0.6" /><defs><pattern id="odi-hatch-key" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="3" stroke="currentColor" strokeWidth="1" /></pattern></defs></svg>
          Total only — no official sector table
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="min-w-0 border border-rule/20 bg-background p-3">
          <p className="font-mono-ui mb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:hidden">Swipe the chart sideways for all 26 years →</p>
          <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[680px]" role="img" aria-label={`Stacked bar chart of India's actual overseas direct investment by sector, FY2000-01 to FY2025-26, in ${unit === "inr" ? "rupee crore" : "US dollar million"}`}>
            <defs>
              <pattern id="odi-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" fill="var(--color-muted)" />
                <line x1="0" y1="0" x2="0" y2="5" stroke="var(--color-muted-foreground)" strokeWidth="1.2" />
              </pattern>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={yPx(t)} y2={yPx(t)} stroke="var(--color-rule)" strokeOpacity={t === 0 ? 0.9 : 0.12} />
                <text x={PAD.l - 8} y={yPx(t) + 3} textAnchor="end" className="font-mono-ui" fontSize="10" fill="var(--color-muted-foreground)">
                  {view === "share" ? `${t}%` : fmtAxis(t, unit)}
                </text>
              </g>
            ))}
            {ODI_HISTORY.map((y, i) => {
              const x = PAD.l + i * slot + (slot - bw) / 2;
              const segs = segmentsFor(y);
              const active = y.fy === sel.fy;
              const total = view === "share" ? 100 : totalIn(y, unit);
              const marker = ODI_MARKERS.findIndex((m) => m.fy === y.fy);
              return (
                <g
                  key={y.fy}
                  data-fy={y.fy}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`${y.fy}: ${fmtAmount(totalIn(y, unit), unit)}${y.sectors ? "" : ", sector split not published"}`}
                  onClick={() => setSelected(y.fy)}
                  onMouseEnter={() => setSelected(y.fy)}
                  onFocus={() => setSelected(y.fy)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const n = ODI_HISTORY[Math.min(ODI_HISTORY.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)))]!;
                      setSelected(n.fy);
                      (e.currentTarget.ownerSVGElement?.querySelector(`[data-fy="${n.fy}"]`) as SVGGElement | null)?.focus();
                    }
                  }}
                  className="cursor-pointer outline-none focus-visible:[&>rect.hit]:stroke-primary"
                >
                  <rect className="hit" x={PAD.l + i * slot} y={PAD.t} width={slot} height={PLOT_H} fill={active ? "var(--color-muted)" : "transparent"} fillOpacity={active ? 0.7 : 0} stroke="transparent" strokeWidth={1.5} />
                  {segs
                    ? segs.map((s) => (
                        <rect key={s.key} x={x} width={bw} y={yPx(s.y1)} height={Math.max(0, yPx(s.y0) - yPx(s.y1))} fill={s.color} opacity={focus && focus !== s.key ? 0.14 : 1} />
                      ))
                    : <rect x={x} width={bw} y={yPx(total)} height={yPx(0) - yPx(total)} fill="url(#odi-hatch)" opacity={view === "share" ? 0.35 : focus ? 0.4 : 1} stroke="var(--color-muted-foreground)" strokeWidth={0.6} />}
                  {marker >= 0 && (
                    <g>
                      <line x1={x + bw / 2} x2={x + bw / 2} y1={PAD.t - 14} y2={yPx(total) - 4} stroke="var(--color-primary)" strokeDasharray="2 3" />
                      <circle cx={x + bw / 2} cy={PAD.t - 18} r={7} fill="var(--color-primary)" />
                      <text x={x + bw / 2} y={PAD.t - 15} textAnchor="middle" fontSize="9" fill="var(--color-primary-foreground)" className="font-mono-ui">{marker + 1}</text>
                    </g>
                  )}
                  <text x={x + bw / 2} y={H - PAD.b + 16} textAnchor="middle" fontSize="10" className="font-mono-ui" fill={active ? "var(--color-primary)" : "var(--color-muted-foreground)"} fontWeight={active ? 700 : 400}>
                    {`’${y.fy.slice(5)}`}
                  </text>
                </g>
              );
            })}
            <text x={PAD.l} y={H - 6} fontSize="10" className="font-mono-ui" fill="var(--color-muted-foreground)">Financial year ending March · hover, tap or use ← → keys</text>
          </svg>
          </div>
          <ol className="mt-3 grid gap-1 px-1 text-xs text-muted-foreground sm:grid-cols-3">
            {ODI_MARKERS.map((m, i) => (
              <li key={m.fy} className="flex gap-2"><span className="font-mono-ui text-primary">{i + 1}</span><span><span className="font-mono-ui">{m.fy}</span> — {m.label}</span></li>
            ))}
          </ol>
        </div>

        <aside className="border border-foreground bg-background p-5" aria-live="polite">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Selected year</p>
          <p className="font-display mt-2 text-3xl">{sel.fy}</p>
          <p className="font-display mt-3 text-2xl text-primary">{fmtAmount(totalIn(sel, unit), unit)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {unit === "inr" ? fmtAmount(sel.usdMn, "usd") : fmtAmount(totalIn(sel, "inr"), "inr")} · ₹{sel.inrPerUsd.toFixed(2)} per US$ ({sel.rateCompiled ? "year average of RBI reference rates, compiled" : "RBI year average"})
          </p>
          {sel.sectors ? (
            <ul className="mt-5 space-y-2.5">
              {[...ODI_SECTORS].sort((a, b) => sel.sectors![b.key] - sel.sectors![a.key]).map((s) => {
                const share = sectorShares(sel)![s.key];
                return (
                  <li key={s.key} className={focus && focus !== s.key ? "opacity-45" : ""}>
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="flex items-center gap-2"><span className="inline-block h-2 w-2" style={{ background: s.color }} aria-hidden="true" />{s.short}</span>
                      <span className="font-mono-ui whitespace-nowrap">{share.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 h-1 bg-muted"><div className="h-1" style={{ width: `${share}%`, background: s.color }} /></div>
                    <p className="font-mono-ui mt-0.5 text-[10px] text-muted-foreground">{fmtAmount(amountIn(sel, sel.sectors![s.key], unit), unit)}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-5 border-l-2 border-rule/40 pl-3 text-sm text-muted-foreground">
              No official nine-sector table was found for this year, so only the total is shown. Nothing is estimated.
            </p>
          )}
          {sel.note && <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">Note: {sel.note}</p>}
          <a href={ODI_SOURCES[sel.source].url} target="_blank" rel="noreferrer" className="font-mono-ui mt-4 block text-[10px] uppercase leading-relaxed tracking-[0.12em] text-primary hover:underline">
            Source: {ODI_SOURCES[sel.source].label} ↗
          </a>
        </aside>
      </div>

      <div className="mt-10 overflow-x-auto border border-rule/20">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Sector outflow, FY2008-09 compared with FY2025-26</caption>
          <thead>
            <tr className="font-mono-ui bg-foreground text-[10px] uppercase tracking-[0.14em] text-background">
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3 text-right">FY2008-09</th>
              <th className="px-4 py-3 text-right">FY2025-26</th>
              <th className="px-4 py-3 text-right">Change</th>
              <th className="px-4 py-3 text-right">Share then → now</th>
              <th className="bg-primary px-4 py-3 text-primary-foreground">Trend where published</th>
            </tr>
          </thead>
          <tbody>
            {[...ODI_SECTORS].sort((a, b) => last.sectors![b.key] - last.sectors![a.key]).map((s) => {
              const a = amountIn(firstSplit, firstSplit.sectors![s.key], unit);
              const b = amountIn(last, last.sectors![s.key], unit);
              return (
                <tr key={s.key} className={`border-t border-rule/15 ${focus === s.key ? "bg-muted/50" : ""}`}>
                  <td className="px-4 py-3"><span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5" style={{ background: s.color }} aria-hidden="true" />{s.label}</span></td>
                  <td className="font-mono-ui px-4 py-3 text-right text-xs">{fmtAmount(a, unit)}</td>
                  <td className="font-mono-ui px-4 py-3 text-right text-xs">{fmtAmount(b, unit)}</td>
                  <td className={`font-mono-ui px-4 py-3 text-right text-xs ${b >= a ? "text-primary" : "text-muted-foreground"}`}>{a > 0 ? `${(b / a).toFixed(1)}×` : "—"}</td>
                  <td className="font-mono-ui px-4 py-3 text-right text-xs">{sectorShares(firstSplit)![s.key].toFixed(1)}% → {sectorShares(last)![s.key].toFixed(1)}%</td>
                  <td className="px-4 py-2 text-foreground"><Sparkline k={s.key} unit={unit} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="mt-6 border-l-2 border-primary pl-5 text-sm">
        <summary className="font-mono-ui cursor-pointer text-[10px] uppercase tracking-[0.16em] text-primary">Method, gaps and sources</summary>
        <ul className="mt-4 space-y-2 leading-relaxed text-muted-foreground">
          <li>— <strong className="text-foreground">Measure:</strong> actual ODI outflow = equity + loans + guarantees invoked, as published by RBI and the Ministry of Finance. Guarantees issued (a contingent commitment) are excluded, so these figures are lower than “total financial commitment” headlines.</li>
          <li>— <strong className="text-foreground">Rupees:</strong> each year’s US$ figure is converted at RBI’s financial-year average ₹/US$ rate. Part of the rupee growth therefore reflects the rupee’s depreciation (₹45.68 → ₹88.31); the US$ view removes that effect. FY2024-25 and FY2025-26 averages are compiled from RBI daily reference rates because RBI's Handbook table does not yet include them.</li>
          <li>— <strong className="text-foreground">Sectors:</strong> RBI’s nine-sector activity classification of the overseas entity. Official year-wise tables were found for FY2008-09 to FY2010-11 and FY2013-14 to FY2025-26. FY2000-01 to FY2007-08 (older classification) and FY2011-12 to FY2012-13 show totals only.</li>
          <li>— <strong className="text-foreground">Revisions:</strong> each year uses the latest official fact sheet found; Ministry of Finance figures are provisional and are revised as AD banks report. FY2011-12 and FY2012-13 totals come from a research compilation of RBI data, not an official annual table.</li>
          <li>— This is public aggregate data. It contains no company-level transfer records and is not investment advice.</li>
        </ul>
        <ul className="mt-4 space-y-1.5">
          {Object.values(ODI_SOURCES).map((src) => (
            <li key={src.url}><a href={src.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{src.label} ↗</a></li>
          ))}
        </ul>
      </details>
    </section>
  );
}
