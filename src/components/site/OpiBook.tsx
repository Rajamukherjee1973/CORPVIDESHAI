"use client";

/**
 * Live OPI portfolio book — allocation, hedge cover and rupee translation P&L
 * on every position accepted from the Currency Radar, re-priced on every tick
 * of the 24x7 tape.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatInr, recordCapture, useFxStream } from "@/lib/fx-stream";
import { opiBoard, type OpiSignal } from "@/lib/opi-signal";
import {
  bookTotals,
  closePosition,
  clearBook,
  downloadBook,
  openPosition,
  pricePosition,
  readBook,
  setHedge,
  subscribeBook,
  type OpiPosition,
  type PricedPosition,
} from "@/lib/opi-book";

const cr = (v: number, dp = 2) => `₹${v.toFixed(dp)} cr`;
const pct = (v: number, dp = 2) => `${v >= 0 ? "+" : ""}${v.toFixed(dp)}%`;
const sign = (v: number) => (v >= 0 ? "text-primary" : "text-muted-foreground");

export function OpiBook() {
  const tape = useFxStream();
  const [rows, setRows] = useState<OpiPosition[]>([]);
  const [pick, setPick] = useState("USD");
  const [size, setSize] = useState(50);
  const [hedge, setHedgeInput] = useState<number | null>(null);

  useEffect(() => {
    setRows(readBook());
    return subscribeBook(setRows);
  }, []);

  const signals = useMemo(() => opiBoard(tape), [tape.seq, tape.anchor]);
  const byCode = useMemo(() => {
    const m = new Map<string, OpiSignal>();
    signals.forEach((s) => m.set(s.code, s));
    return m;
  }, [signals]);

  const sel = byCode.get(pick) ?? signals[0]!;
  const hedgeVal = hedge ?? sel.hedgePct;

  const priced: PricedPosition[] = useMemo(
    () => rows.map((p) => pricePosition(p, tape, byCode.get(p.code))),
    [rows, tape.seq, byCode],
  );
  const totals = useMemo(() => bookTotals(priced), [priced]);

  const add = () => {
    const p = openPosition(sel, size, hedgeVal, "Currency Radar recommendation");
    if (p) recordCapture("OPI portfolio", "action", `Open OPI position ${sel.code}`, sel.code, size);
  };

  const acceptAll = () => {
    signals
      .filter((s) => s.opiEligible && s.allocationPct > 0 && s.spot)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .forEach((s, i, arr) => {
        const share = arr.reduce((a, x) => a + x.allocationPct, 0) || 1;
        openPosition(s, (s.allocationPct / share) * 300, s.hedgePct, "Radar suggested book");
      });
    recordCapture("OPI portfolio", "action", "Accept radar suggested book", "USD", 300);
  };

  return (
    <div className="border border-rule/25">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule/20 bg-foreground px-6 py-4 text-background">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-background/60">
            Live OPI book — allocation · hedge · rupee translation
          </p>
          <p className="font-display mt-1 text-2xl">
            {totals.positions
              ? `${cr(totals.marketCr, 1)} marked live`
              : "No positions open yet"}
            <span className="font-mono-ui ml-3 text-[11px] uppercase tracking-[0.16em] text-background/60">
              {tape.status === "live" ? "streaming" : tape.status} · {tape.source} · seq {tape.seq}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadBook(priced, totals, "csv")}
            className="border border-background/30 px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] hover:border-background"
          >
            Export CSV
          </button>
          <button
            onClick={() => downloadBook(priced, totals, "json")}
            className="border border-background/30 px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] hover:border-background"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* totals */}
      <div className="grid grid-cols-2 gap-px bg-rule/15 md:grid-cols-4 lg:grid-cols-7">
        {[
          ["Positions", String(totals.positions)],
          ["Allocated", cr(totals.notionalCr, 1)],
          ["Marked live", cr(totals.marketCr, 1)],
          ["Gross translation", cr(totals.grossPnlCr, 2)],
          ["Hedge offset", cr(totals.hedgePnlCr, 2)],
          ["Net translation P&L", `${cr(totals.netPnlCr, 2)} (${pct(totals.netPnlPct)})`],
          ["Blended hedge", `${totals.hedgeBlendedPct}%`],
        ].map(([k, v], i) => (
          <div key={k} className="bg-background p-4">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              {k}
            </p>
            <p className={`font-display tnum mt-1 text-xl ${i >= 3 && i <= 5 ? sign(totals.netPnlCr) : ""}`}>
              {v}
            </p>
          </div>
        ))}
      </div>

      {/* add position */}
      <div className="flex flex-wrap items-end gap-3 border-y border-rule/20 px-6 py-4">
        <label className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Currency
          <select
            value={sel.code}
            onChange={(e) => {
              setPick(e.target.value);
              setHedgeInput(null);
            }}
            className="mt-1 block border border-rule/30 bg-background px-3 py-2 font-mono-ui text-[11px]"
          >
            {signals.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name} · {s.verdict}
              </option>
            ))}
          </select>
        </label>
        <label className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Tranche ₹ cr
          <input
            type="number"
            min={1}
            step={5}
            value={size}
            onChange={(e) => setSize(Math.max(1, Number(e.target.value) || 0))}
            className="tnum mt-1 block w-28 border border-rule/30 bg-background px-3 py-2 text-right"
          />
        </label>
        <label className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Hedge {hedgeVal}%
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={hedgeVal}
            onChange={(e) => setHedgeInput(Number(e.target.value))}
            className="mt-2 block w-40"
          />
        </label>
        <button
          onClick={add}
          className="bg-primary px-4 py-2.5 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary-foreground"
        >
          Book position at {sel.spot ? formatInr(sel.spot, sel.spot < 1 ? 6 : 4) : "—"}
        </button>
        <button
          onClick={acceptAll}
          className="border border-rule/40 px-4 py-2.5 font-mono-ui text-[10px] uppercase tracking-[0.16em] hover:border-primary hover:text-primary"
        >
          Accept radar book (₹300 cr)
        </button>
        {totals.positions > 0 && (
          <button
            onClick={() => clearBook()}
            className="ml-auto font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
          >
            Clear book
          </button>
        )}
      </div>

      {/* positions */}
      {priced.length === 0 ? (
        <div className="px-6 py-10 text-sm leading-relaxed text-muted-foreground">
          The book is empty. Accept a recommendation from the{" "}
          <Link to="/" hash="radar" className="text-primary underline-offset-4 hover:underline">
            Currency Radar
          </Link>{" "}
          or book a tranche above — each position is struck at the live tape rate and re-priced on
          every tick.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-rule/25 text-left font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3 text-right">Allocation</th>
                <th className="px-4 py-3 text-right">Entry</th>
                <th className="px-4 py-3 text-right">Live</th>
                <th className="px-4 py-3 text-right">Move</th>
                <th className="px-4 py-3 text-right">Hedge</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Offset</th>
                <th className="px-4 py-3 text-right">Net P&L</th>
                <th className="px-4 py-3 text-right">12m band</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {priced.map((r) => (
                <tr key={r.id} className="border-b border-rule/10 text-sm">
                  <td className="px-4 py-3">
                    <span className="font-mono-ui text-[11px] tracking-[0.1em]">{r.code}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      {r.hub ?? "no rail hub"} · {r.verdict} · {new Date(r.openedAt).toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="tnum px-4 py-3 text-right">{cr(r.notionalCr, 1)}</td>
                  <td className="tnum px-4 py-3 text-right text-[12px]">
                    {formatInr(r.entryRate, r.entryRate < 1 ? 6 : 4)}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-[12px]">
                    {formatInr(r.liveRate, r.liveRate < 1 ? 6 : 4)}
                  </td>
                  <td className={`tnum px-4 py-3 text-right text-[12px] ${sign(r.movePct)}`}>
                    {pct(r.movePct, 3)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={r.hedgePct}
                      onChange={(e) => setHedge(r.id, Number(e.target.value) || 0)}
                      className="tnum w-16 border border-rule/30 bg-background px-2 py-1 text-right text-[12px]"
                    />
                  </td>
                  <td className={`tnum px-4 py-3 text-right text-[12px] ${sign(r.grossPnlCr)}`}>
                    {cr(r.grossPnlCr, 2)}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-[12px] text-muted-foreground">
                    {cr(r.hedgePnlCr, 2)}
                  </td>
                  <td className={`tnum px-4 py-3 text-right ${sign(r.netPnlCr)}`}>
                    {cr(r.netPnlCr, 2)}
                    <span className="ml-1 text-[11px] text-muted-foreground">{pct(r.netPnlPct)}</span>
                  </td>
                  <td className="tnum px-4 py-3 text-right text-[12px] text-muted-foreground">
                    {cr(r.expectedCr, 1)} / {cr(r.adverseCr, 1)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => closePosition(r.id)}
                      className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
                    >
                      Close
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {priced.length > 0 && (
        <p className="border-t border-rule/20 px-6 py-4 text-sm leading-relaxed text-muted-foreground">
          {totals.currencies} currencies, largest single exposure {totals.topExposurePct.toFixed(0)}%
          of the book. On the unhedged sleeve the twelve-month central case is{" "}
          <span className="text-foreground">{cr(totals.expectedCr, 1)}</span> with an adverse case of{" "}
          <span className="text-foreground">{cr(totals.adverseCr, 1)}</span>. Every entry rate is a
          stamped capture from the live tape. Prototype output — not investment advice.
        </p>
      )}
    </div>
  );
}
