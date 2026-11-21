/**
 * Live OPI portfolio book.
 *
 * The Currency Radar produces recommendations; this module turns an accepted
 * recommendation into a *position* — a rupee tranche struck at the live tape
 * rate, with a hedge ratio — and then re-prices that position against the
 * streaming tape so a treasury head sees allocation, hedge cover and rupee
 * translation P&L at any moment.
 *
 * Positions persist in the browser (prototype storage, no server custody).
 */

import type { FxTape } from "@/lib/fx-stream";
import type { OpiSignal } from "@/lib/opi-signal";

const KEY = "cv.opi.book.v1";
const EVT = "cv:opi-book";

export type OpiPosition = {
  id: string;
  code: string;
  name: string;
  hub: string | null;
  /** Rupee tranche committed, in ₹ crore. */
  notionalCr: number;
  /** INR per unit captured from the live tape when the position was opened. */
  entryRate: number;
  /** Forward cover on the tranche, percent. */
  hedgePct: number;
  /** Signal state at the moment of booking, kept for the evidence trail. */
  verdict: string;
  p50PctAtEntry: number;
  scoreAtEntry: number;
  openedAt: string;
  source: string;
};

export type PricedPosition = OpiPosition & {
  /** Foreign-currency units bought with the tranche. */
  units: number;
  /** Live INR per unit; falls back to the entry rate when the tape is silent. */
  liveRate: number;
  /** Live rupee value of the unhedged leg, ₹ crore. */
  marketCr: number;
  /** Gross rupee translation move, ₹ crore. */
  grossPnlCr: number;
  /** Offset booked by the forward leg, ₹ crore. */
  hedgePnlCr: number;
  /** Translation P&L after hedge, ₹ crore. */
  netPnlCr: number;
  netPnlPct: number;
  /** Rupee value at risk on the unhedged sleeve over 12m, adverse case. */
  adverseCr: number;
  expectedCr: number;
  movePct: number;
};

function read(): OpiPosition[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OpiPosition[]) : [];
  } catch {
    return [];
  }
}

function write(rows: OpiPosition[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(rows.slice(-200)));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function readBook(): OpiPosition[] {
  return read();
}

export function subscribeBook(fn: (rows: OpiPosition[]) => void): () => void {
  const h = () => fn(read());
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}

/** Open a position from a radar signal at the live tape rate. */
export function openPosition(
  signal: OpiSignal,
  notionalCr: number,
  hedgePct: number,
  source: string,
): OpiPosition | null {
  if (!signal.spot || notionalCr <= 0) return null;
  const pos: OpiPosition = {
    id: `${signal.code}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    code: signal.code,
    name: signal.name,
    hub: signal.hub,
    notionalCr,
    entryRate: signal.spot,
    hedgePct: Math.min(100, Math.max(0, Math.round(hedgePct))),
    verdict: signal.verdict,
    p50PctAtEntry: signal.p50Pct,
    scoreAtEntry: signal.score,
    openedAt: new Date().toISOString(),
    source,
  };
  write([...read(), pos]);
  return pos;
}

export function closePosition(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function clearBook() {
  write([]);
}

export function setHedge(id: string, hedgePct: number) {
  write(read().map((p) => (p.id === id ? { ...p, hedgePct: Math.min(100, Math.max(0, hedgePct)) } : p)));
}

export function pricePosition(p: OpiPosition, tape: FxTape, signal?: OpiSignal): PricedPosition {
  const liveRate = tape.inrPer[p.code] ?? p.entryRate;
  const units = (p.notionalCr * 1e7) / p.entryRate;
  const marketCr = (units * liveRate) / 1e7;
  const grossPnlCr = marketCr - p.notionalCr;
  const hedgePnlCr = -grossPnlCr * (p.hedgePct / 100);
  const netPnlCr = grossPnlCr + hedgePnlCr;
  const openSleeve = p.notionalCr * (1 - p.hedgePct / 100);
  const p50 = signal?.p50Pct ?? p.p50PctAtEntry;
  const p90 = signal?.p90Pct ?? p.p50PctAtEntry - 6;
  return {
    ...p,
    units,
    liveRate,
    marketCr,
    grossPnlCr,
    hedgePnlCr,
    netPnlCr,
    netPnlPct: p.notionalCr ? (netPnlCr / p.notionalCr) * 100 : 0,
    expectedCr: (openSleeve * p50) / 100,
    adverseCr: (openSleeve * p90) / 100,
    movePct: p.entryRate ? ((liveRate - p.entryRate) / p.entryRate) * 100 : 0,
  };
}

export type BookTotals = {
  positions: number;
  notionalCr: number;
  marketCr: number;
  grossPnlCr: number;
  hedgePnlCr: number;
  netPnlCr: number;
  netPnlPct: number;
  expectedCr: number;
  adverseCr: number;
  hedgeBlendedPct: number;
  currencies: number;
  topExposurePct: number;
};

export function bookTotals(rows: PricedPosition[]): BookTotals {
  const notionalCr = rows.reduce((a, r) => a + r.notionalCr, 0);
  const byCode = new Map<string, number>();
  rows.forEach((r) => byCode.set(r.code, (byCode.get(r.code) ?? 0) + r.notionalCr));
  const top = Math.max(0, ...byCode.values());
  const netPnlCr = rows.reduce((a, r) => a + r.netPnlCr, 0);
  return {
    positions: rows.length,
    notionalCr,
    marketCr: rows.reduce((a, r) => a + r.marketCr, 0),
    grossPnlCr: rows.reduce((a, r) => a + r.grossPnlCr, 0),
    hedgePnlCr: rows.reduce((a, r) => a + r.hedgePnlCr, 0),
    netPnlCr,
    netPnlPct: notionalCr ? (netPnlCr / notionalCr) * 100 : 0,
    expectedCr: rows.reduce((a, r) => a + r.expectedCr, 0),
    adverseCr: rows.reduce((a, r) => a + r.adverseCr, 0),
    hedgeBlendedPct: notionalCr
      ? Math.round(rows.reduce((a, r) => a + r.hedgePct * r.notionalCr, 0) / notionalCr)
      : 0,
    currencies: byCode.size,
    topExposurePct: notionalCr ? (top / notionalCr) * 100 : 0,
  };
}

export function bookCsv(rows: PricedPosition[]): string {
  const head = [
    "position_id", "currency", "name", "hub", "opened_at", "source", "verdict_at_entry",
    "score_at_entry", "notional_inr_cr", "entry_rate_inr", "live_rate_inr", "fx_units",
    "move_pct", "hedge_pct", "market_value_inr_cr", "gross_translation_pnl_inr_cr",
    "hedge_offset_inr_cr", "net_translation_pnl_inr_cr", "net_pnl_pct",
    "expected_12m_inr_cr", "adverse_12m_inr_cr",
  ].join(",");
  const body = rows.map((r) =>
    [
      r.id, r.code, `"${r.name}"`, `"${r.hub ?? ""}"`, r.openedAt, `"${r.source}"`, r.verdict,
      r.scoreAtEntry, r.notionalCr.toFixed(2), r.entryRate.toFixed(6), r.liveRate.toFixed(6),
      r.units.toFixed(2), r.movePct.toFixed(4), r.hedgePct, r.marketCr.toFixed(3),
      r.grossPnlCr.toFixed(3), r.hedgePnlCr.toFixed(3), r.netPnlCr.toFixed(3),
      r.netPnlPct.toFixed(3), r.expectedCr.toFixed(3), r.adverseCr.toFixed(3),
    ].join(","),
  );
  return [head, ...body].join("\n");
}

export function downloadBook(rows: PricedPosition[], totals: BookTotals, kind: "csv" | "json") {
  const body =
    kind === "csv"
      ? bookCsv(rows)
      : JSON.stringify({ at: new Date().toISOString(), totals, positions: rows }, null, 2);
  const url = URL.createObjectURL(
    new Blob([body], { type: kind === "csv" ? "text/csv" : "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `corpvidesh-opi-book.${kind}`;
  a.click();
  URL.revokeObjectURL(url);
}
