/**
 * 52 currencies against the rupee, streaming 24x7, with a predictive OPI
 * recommendation for treasury heads on every line.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useFxStream, formatInr, officialGapBps, recordCapture } from "@/lib/fx-stream";
import { openPosition } from "@/lib/opi-book";
import {
  RAIL_CURRENCIES,
  opiBoard,
  opiPortfolio,
  opiCsv,
  type OpiSignal,
  type OpiVerdict,
} from "@/lib/opi-signal";


const REGIONS = ["ALL", "AMER", "EMEA", "APAC", "MENA", "AFR"] as const;
const SORTS = [
  ["score", "OPI conviction"],
  ["p50", "12-month outlook"],
  ["session", "Session move"],
  ["vol", "Volatility"],
  ["code", "Alphabetical"],
] as const;

const VERDICT_CLASS: Record<OpiVerdict, string> = {
  Accumulate: "bg-primary text-primary-foreground",
  "Phase in": "bg-primary/15 text-primary",
  Hold: "bg-muted text-muted-foreground",
  Defer: "border border-rule/40 text-muted-foreground",
};

function pct(v: number, dp = 2) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(dp)}%`;
}

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function CurrencyRadar() {
  const tape = useFxStream();
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("ALL");
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>("score");
  const [q, setQ] = useState("");
  const [only, setOnly] = useState(false);
  const [budget, setBudget] = useState(500);
  const [pick, setPick] = useState("USD");
  const [accept, setAccept] = useState(50);
  const [booked, setBooked] = useState<string | null>(null);


  const signals = useMemo(() => opiBoard(tape), [tape.seq, tape.anchor]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const arr = signals.filter(
      (s) =>
        (region === "ALL" || s.region === region) &&
        (!only || s.opiEligible) &&
        (!t || s.code.toLowerCase().includes(t) || s.name.toLowerCase().includes(t)),
    );
    const by: Record<string, (a: OpiSignal, b: OpiSignal) => number> = {
      score: (a, b) => b.score - a.score,
      p50: (a, b) => b.p50Pct - a.p50Pct,
      session: (a, b) => b.sessionPct - a.sessionPct,
      vol: (a, b) => a.volPct - b.volPct,
      code: (a, b) => a.code.localeCompare(b.code),
    };
    return [...arr].sort(by[sort]!);
  }, [signals, region, sort, q, only]);

  const sel = signals.find((s) => s.code === pick) ?? signals[0]!;
  const book = useMemo(() => opiPortfolio(signals, budget), [signals, budget]);
  const gap = officialGapBps(tape, sel.code);
  const live = tape.status === "live";

  return (
    <div className="border border-rule/25">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule/20 bg-foreground px-6 py-4 text-background">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-background/60">
            Currency radar — 52 pairs against the rupee
          </p>
          <p className="font-display mt-1 text-2xl">
            {live ? "Streaming 24 × 7" : tape.status === "loading" ? "Connecting…" : "Indicative tape"}
            <span className="font-mono-ui ml-3 text-[11px] uppercase tracking-[0.16em] text-background/60">
              {tape.tier === "terminal" ? "Terminal" : "Interbank"} · {tape.source} · seq {tape.seq}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => download("corpvidesh-opi-radar.csv", opiCsv(signals), "text/csv")}
            className="border border-background/30 px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] hover:border-background"
          >
            Export CSV
          </button>
          <button
            onClick={() =>
              download(
                "corpvidesh-opi-radar.json",
                JSON.stringify({ at: tape.at, source: tape.source, signals }, null, 2),
                "application/json",
              )
            }
            className="border border-background/30 px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] hover:border-background"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-rule/20 px-6 py-4">
        <div className="flex flex-wrap gap-px bg-rule/20">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] ${
                region === r ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="border border-rule/30 bg-background px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.16em]"
        >
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>
              Sort — {l}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search currency"
          className="border border-rule/30 bg-background px-3 py-2 font-mono-ui text-[11px]"
        />
        <label className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} />
          OPI corridors only
        </label>
        <span className="font-mono-ui ml-auto text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {shown.length} of {RAIL_CURRENCIES.length} pairs
        </span>
      </div>

      <div className="grid lg:grid-cols-[1.35fr_1fr]">
        {/* board */}
        <div className="max-h-[560px] overflow-y-auto border-b border-rule/20 lg:border-b-0 lg:border-r">
          <table className="w-full">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b border-rule/25 text-left font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                <th className="px-4 py-3">Pair</th>
                <th className="px-4 py-3 text-right">INR / unit</th>
                <th className="px-4 py-3 text-right">Session</th>
                <th className="px-4 py-3 text-right">12-month</th>
                <th className="px-4 py-3 text-right">Conviction</th>
                <th className="px-4 py-3">Call</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr
                  key={s.code}
                  onClick={() => setPick(s.code)}
                  className={`cursor-pointer border-b border-rule/10 text-sm hover:bg-muted/50 ${
                    s.code === sel.code ? "bg-muted/60" : ""
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono-ui text-[11px] tracking-[0.1em]">{s.code}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">{s.name}</span>
                  </td>
                  <td className="tnum px-4 py-2.5 text-right">
                    {s.spot ? `${formatInr(s.spot, s.spot < 1 ? 6 : 4)}` : "—"}
                    <span
                      className={`ml-1 ${s.tick > 0 ? "text-primary" : s.tick < 0 ? "text-muted-foreground" : "opacity-30"}`}
                    >
                      {s.tick > 0 ? "▲" : s.tick < 0 ? "▼" : "·"}
                    </span>
                  </td>
                  <td className="tnum px-4 py-2.5 text-right text-[12px]">{pct(s.sessionPct, 3)}</td>
                  <td className="tnum px-4 py-2.5 text-right text-[12px]">{pct(s.p50Pct, 1)}</td>
                  <td className="tnum px-4 py-2.5 text-right text-[12px]">{s.score}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block px-2 py-1 font-mono-ui text-[9px] uppercase tracking-[0.14em] ${VERDICT_CLASS[s.verdict]}`}
                    >
                      {s.verdict}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* recommendation */}
        <div className="p-6">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Recommendation — {sel.name} ({sel.code})
          </p>
          <p className="font-display mt-2 text-4xl">
            {sel.spot ? `${formatInr(sel.spot, sel.spot < 1 ? 6 : 4)}` : "—"}
            <span className="font-mono-ui ml-3 text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
              {sel.hub ? `settles at ${sel.hub}` : "no rail hub"}
            </span>
          </p>

          <div className="mt-5 grid grid-cols-2 gap-px bg-rule/15">
            {[
              ["Central case, 12m", pct(sel.p50Pct, 1)],
              ["Adverse case, 12m", pct(sel.p90Pct, 1)],
              ["Confidence", `${sel.confidence}%`],
              ["Volatility, annualised", `${sel.volPct.toFixed(1)}%`],
              ["Five-year rupee move", pct(sel.fiveYearPct, 1)],
              ["Gap to RBI reference", gap == null ? "—" : `${gap.toFixed(0)} bps`],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-3">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{k}</p>
                <p className="font-display tnum mt-1 text-xl">{v}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{sel.driver}</p>

          <div className="mt-4 border-l-2 border-primary bg-muted/40 p-4">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
              Recommended action — {sel.verdict}
            </p>
            <p className="mt-2 text-sm leading-relaxed">{sel.action}</p>
            <p className="font-mono-ui mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Allocation {sel.allocationPct}% · hedge {sel.hedgePct}% · withholding {sel.whtNote} ·{" "}
              {sel.opiEligible ? "OPI eligible corridor" : "ODI-only corridor"}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const p = openPosition(sel, accept, sel.hedgePct, "Currency Radar recommendation");
                  if (p) {
                    recordCapture("Currency radar", "action", `Open OPI position ${sel.code}`, sel.code, accept);
                    setBooked(`${sel.code} booked at ${formatInr(p.entryRate, p.entryRate < 1 ? 6 : 4)}`);
                  } else setBooked("No live rate on this pair yet.");
                }}
                className="bg-primary px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary-foreground"
              >
                Add to OPI book
              </button>
              <label className="font-mono-ui flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                ₹
                <input
                  type="number"
                  min={1}
                  step={5}
                  value={accept}
                  onChange={(e) => setAccept(Math.max(1, Number(e.target.value) || 0))}
                  className="tnum w-20 border border-rule/30 bg-background px-2 py-1 text-right"
                />
                cr
              </label>
              <Link
                to="/portfolio"
                className="border border-rule/40 px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] hover:border-primary hover:text-primary"
              >
                Open live book
              </Link>
            </div>
            {booked && (
              <p className="font-mono-ui mt-2 text-[10px] uppercase tracking-[0.14em] text-primary">
                {booked}
              </p>
            )}
          </div>


          {/* portfolio */}
          <div className="mt-6 border-t border-rule/20 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                Suggested OPI book
              </p>
              <label className="font-mono-ui flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Budget ₹
                <input
                  type="number"
                  min={10}
                  step={50}
                  value={budget}
                  onChange={(e) => setBudget(Math.max(10, Number(e.target.value) || 0))}
                  className="tnum w-24 border border-rule/30 bg-background px-2 py-1 text-right"
                />
                cr
              </label>
            </div>
            <button
              onClick={() => {
                book.rows.forEach((r) => openPosition(r, r.tranche, r.hedgePct, "Radar suggested book"));
                recordCapture("Currency radar", "action", "Accept suggested OPI book", sel.code, budget);
                setBooked(`Suggested book of ₹${budget} cr sent to the live portfolio.`);
              }}
              className="mt-3 w-full bg-foreground px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-background"
            >
              Book this entire allocation live
            </button>

            <div className="mt-3 space-y-1">
              {book.rows.map((r) => (
                <div
                  key={r.code}
                  className="flex items-center justify-between border-b border-rule/10 py-1.5 text-[12px]"
                >
                  <span className="font-mono-ui tracking-[0.1em]">{r.code}</span>
                  <span className="text-muted-foreground">{r.hub}</span>
                  <span className="tnum">₹{r.tranche.toFixed(0)} cr</span>
                  <span className="tnum text-primary">{pct(r.p50Pct, 1)}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              On ₹{budget.toLocaleString("en-IN")} crore, the book carries an expected translation
              gain of{" "}
              <span className="text-foreground">₹{book.expected.toFixed(1)} crore</span> over twelve
              months, an adverse case of{" "}
              <span className="text-foreground">₹{book.adverse.toFixed(1)} crore</span>, at a blended
              hedge of {book.hedge}%. Prototype output — not investment advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
