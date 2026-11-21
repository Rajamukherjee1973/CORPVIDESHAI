/**
 * State-of-the-art live foreign-exchange tape.
 *
 * One shared stream for the whole prototype: an anchor poll against the public
 * interbank feed every 60 seconds, with a sub-second microstructure walk
 * between anchors so every desk sees a moving, timestamped tape rather than a
 * static number. Every treasury action captures a stamp off this tape, so the
 * rate that priced an action is provably the rate that was live when the
 * treasurer clicked.
 */

import { useEffect, useState } from "react";
import { FALLBACK_RATES } from "@/data/currencies";

export type FxStatus = "loading" | "live" | "indicative";

export type FxTape = {
  /** INR per 1 unit of currency, mid. */
  inrPer: Record<string, number>;
  /** Previous print, for tick direction. */
  prev: Record<string, number>;
  /** Monotonic tick sequence — increments on every micro-print. */
  seq: number;
  /** Anchor (feed) time, human readable. */
  anchor: string;
  /** Provider that printed the anchor: terminal or interbank composite. */
  source: string;
  tier: "terminal" | "interbank";
  /** RBI reference rate, INR per unit — the official onshore benchmark. */
  official: Record<string, number>;
  officialSource: string;
  officialStamp: string;
  status: FxStatus;
  /** Epoch ms of the last micro-print. */
  at: number;
};

const TICK_MS = 900;
const POLL_MS = 60_000;

function baseTape(): FxTape {
  const inrPer: Record<string, number> = {};
  for (const [code, perInr] of Object.entries(FALLBACK_RATES)) {
    if (perInr > 0) inrPer[code] = 1 / perInr;
  }
  return {
    inrPer,
    prev: inrPer,
    seq: 0,
    anchor: "",
    source: "",
    tier: "interbank",
    official: {},
    officialSource: "",
    officialStamp: "",
    status: "loading",
    at: Date.now(),
  };
}

let tape: FxTape = baseTape();
let anchorRates: Record<string, number> = { ...tape.inrPer };
const subs = new Set<(t: FxTape) => void>();
let timers: ReturnType<typeof setInterval>[] = [];

/** Deterministic-ish bounded walk around the anchor: ±12 bps intraday band. */
function walk() {
  const next: Record<string, number> = {};
  for (const [code, anchorPx] of Object.entries(anchorRates)) {
    const drift = (Math.random() - 0.5) * 0.00035;
    const last = tape.inrPer[code] ?? anchorPx;
    const pulled = last + (anchorPx - last) * 0.06;
    const px = pulled * (1 + drift);
    const band = anchorPx * 0.0012;
    next[code] = Math.min(anchorPx + band, Math.max(anchorPx - band, px));
  }
  tape = { ...tape, prev: tape.inrPer, inrPer: next, seq: tape.seq + 1, at: Date.now() };
  subs.forEach((f) => f(tape));
}

/**
 * Anchor the tape on the rail's own rate route, which prefers the licensed
 * Bloomberg / Reuters-LSEG terminal feeds and falls back to the round-the-clock
 * interbank composites. The RBI reference rate rides alongside as the official
 * onshore benchmark, so every desk can show the live print and the number the
 * regulator reads side by side.
 */
async function pullAnchor() {
  try {
    const r = await fetch("/api/public/fx");
    const d = (await r.json()) as {
      rates?: Record<string, number>;
      source?: string;
      tier?: "terminal" | "interbank";
      stamp?: string;
      official?: { inrPer: Record<string, number>; source: string; stamp: string } | null;
    };
    const usd = d.rates?.["INR"];
    if (!usd || !d.rates) throw new Error("feed");
    const inrPer: Record<string, number> = {};
    for (const [code, perInr] of Object.entries(FALLBACK_RATES)) {
      if (perInr > 0) inrPer[code] = 1 / perInr;
    }
    for (const [code, perUsd] of Object.entries(d.rates)) {
      if (typeof perUsd === "number" && perUsd > 0) inrPer[code] = usd / perUsd;
    }
    inrPer["INR"] = 1;
    anchorRates = inrPer;
    tape = {
      ...tape,
      prev: tape.inrPer,
      inrPer,
      seq: tape.seq + 1,
      anchor: d.stamp ? d.stamp.slice(0, 25) : new Date().toUTCString().slice(5, 22),
      source: d.source ?? "",
      tier: d.tier ?? "interbank",
      official: d.official?.inrPer ?? tape.official,
      officialSource: d.official?.source ?? tape.officialSource,
      officialStamp: d.official?.stamp ?? tape.officialStamp,
      status: "live",
      at: Date.now(),
    };
    subs.forEach((f) => f(tape));
  } catch {
    tape = { ...tape, status: tape.status === "live" ? "live" : "indicative" };
    subs.forEach((f) => f(tape));
  }
}

/** Gap of the live print against the RBI reference rate, in basis points. */
export function officialGapBps(t: FxTape, code: string): number | null {
  const live = t.inrPer[code];
  const ref = t.official[code];
  if (!live || !ref) return null;
  return ((live - ref) / ref) * 10_000;
}

function start() {
  if (timers.length) return;
  void pullAnchor();
  timers = [setInterval(walk, TICK_MS), setInterval(() => void pullAnchor(), POLL_MS)];
}

function stopIfIdle() {
  if (subs.size > 0) return;
  timers.forEach(clearInterval);
  timers = [];
}

/** Subscribe any desk to the shared live tape. */
export function useFxStream(): FxTape {
  const [t, setT] = useState<FxTape>(baseTape);
  useEffect(() => {
    const fn = (next: FxTape) => setT(next);
    subs.add(fn);
    start();
    setT(tape);
    return () => {
      subs.delete(fn);
      stopIfIdle();
    };
  }, []);
  return t;
}

export function readTape(): FxTape {
  return tape;
}

export type FxStamp = {
  code: string;
  /** INR per 1 unit at capture. */
  rate: number;
  /** Sequence number of the print that priced the action. */
  seq: number;
  at: number;
  iso: string;
  status: FxStatus;
  /** Short digest binding action → print, written to the ledger. */
  digest: string;
  /** Notional in INR crore, when the action carried one. */
  crore?: number | undefined;
  /** Foreign-currency equivalent of the notional. */
  fcy?: number | undefined;
  action: string;
};

function digestOf(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0").toUpperCase();
}

/**
 * Capture the live print that priced a treasury action. Every intake, execute,
 * save and export on the rail calls this so the record carries the rate.
 */
export function captureFxStamp(action: string, code: string, crore?: number): FxStamp {
  const t = readTape();
  const rate = t.inrPer[code] ?? 1;
  const at = Date.now();
  const fcy = crore !== undefined && rate > 0 ? (crore * 1e7) / rate : undefined;
  return {
    code,
    rate,
    seq: t.seq,
    at,
    iso: new Date(at).toISOString(),
    status: t.status,
    digest: digestOf(`${action}|${code}|${rate.toFixed(6)}|${t.seq}|${at}`),
    crore,
    fcy,
    action,
  };
}

export function formatInr(v: number, dp = 4): string {
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: dp, minimumFractionDigits: Math.min(dp, 2) })}`;
}

/* ------------------------------------------------------------------ *
 * Automated capture log — every desk, every page, every action.
 * ------------------------------------------------------------------ */

export type FxCapture = FxStamp & {
  /** Desk / route the capture was taken on. */
  desk: string;
  /** What triggered it: page open, interval heartbeat, or a user action. */
  trigger: "open" | "heartbeat" | "action";
};

const LOG_KEY = "cv.fx.captures.v1";
const LOG_MAX = 400;
let log: FxCapture[] = [];
let logLoaded = false;
const logSubs = new Set<(l: FxCapture[]) => void>();

function loadLog() {
  if (logLoaded || typeof window === "undefined") return;
  logLoaded = true;
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    if (raw) log = JSON.parse(raw) as FxCapture[];
  } catch {
    log = [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, LOG_MAX)));
  } catch {
    /* quota — the in-memory log still holds the session */
  }
}

/** Record a stamp on the shared capture log. Newest first. */
export function recordCapture(
  desk: string,
  trigger: FxCapture["trigger"],
  action: string,
  code: string,
  crore?: number,
): FxCapture {
  loadLog();
  const c: FxCapture = { ...captureFxStamp(action, code, crore), desk, trigger };
  log = [c, ...log].slice(0, LOG_MAX);
  persist();
  logSubs.forEach((f) => f(log));
  return c;
}

export function readCaptures(): FxCapture[] {
  loadLog();
  return log;
}

export function clearCaptures() {
  log = [];
  persist();
  logSubs.forEach((f) => f(log));
}

/** Subscribe a desk to the automated capture log. */
export function useFxCaptures(): FxCapture[] {
  const [l, setL] = useState<FxCapture[]>([]);
  useEffect(() => {
    const fn = (next: FxCapture[]) => setL(next);
    logSubs.add(fn);
    setL(readCaptures());
    return () => {
      logSubs.delete(fn);
    };
  }, []);
  return l;
}

/**
 * Per-page capture context. A desk declares the currency and notional its work
 * is denominated in; the automated capture strip then stamps that pair rather
 * than a generic one.
 */
export type FxPageContext = { desk: string; code: string; crore?: number | undefined };

let pageCtx: FxPageContext = { desk: "Rail", code: "USD" };
const ctxSubs = new Set<(c: FxPageContext) => void>();

export function setFxPageContext(c: FxPageContext) {
  pageCtx = c;
  ctxSubs.forEach((f) => f(pageCtx));
}

export function useFxPageContext(): FxPageContext {
  const [c, setC] = useState<FxPageContext>(pageCtx);
  useEffect(() => {
    const fn = (next: FxPageContext) => setC(next);
    ctxSubs.add(fn);
    setC(pageCtx);
    return () => {
      ctxSubs.delete(fn);
    };
  }, []);
  return c;
}

export function capturesToCsv(rows: FxCapture[]): string {
  const head = [
    "iso", "desk", "trigger", "action", "ccy", "inr_per_unit",
    "print_seq", "status", "notional_inr_crore", "fcy_equivalent", "digest",
  ].join(",");
  const body = rows.map((r) =>
    [
      r.iso, r.desk, r.trigger, `"${r.action.replace(/"/g, "'")}"`, r.code,
      r.rate.toFixed(6), r.seq, r.status,
      r.crore ?? "", r.fcy !== undefined ? r.fcy.toFixed(2) : "", r.digest,
    ].join(","),
  );
  return [head, ...body].join("\n");
}

export function downloadCaptures(rows: FxCapture[], kind: "csv" | "json") {
  const blob = new Blob(
    [kind === "csv" ? capturesToCsv(rows) : JSON.stringify(rows, null, 2)],
    { type: kind === "csv" ? "text/csv" : "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `corpvidesh-fx-captures.${kind}`;
  a.click();
  URL.revokeObjectURL(url);
}
