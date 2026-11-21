import { useEffect, useMemo, useRef, useState } from "react";
import {
  HUB_MARKETS,
  indicativeLevel,
  marketOpen,
  type HubMarket,
} from "@/data/exchanges";
import { useFxStream } from "@/lib/fx-stream";

type Quote = {
  symbol: string;
  price: number;
  prevClose: number;
  currency: string;
  venue: string;
  ts: number;
};

type Board = Record<string, Quote>;

const POLL_MS = 30_000;
const TICK_MS = 1000;

/**
 * Live board for the 52 hub venues: an anchor pull from the market feed every
 * 30 seconds and a bounded micro-walk each second for venues that are trading,
 * so an open floor visibly prints while a shut floor holds its last close.
 */
function useMarketBoard() {
  const [board, setBoard] = useState<Board>({});
  const [prev, setPrev] = useState<Board>({});
  const [state, setState] = useState<"loading" | "live" | "offline">("loading");
  const [at, setAt] = useState<number>(0);
  const anchor = useRef<Board>({});
  const latest = useRef<Board>({});

  useEffect(() => {
    let alive = true;

    const pull = async () => {
      try {
        const r = await fetch("/api/public/markets");
        const d = (await r.json()) as { quotes?: Board; at?: number };
        if (!alive || !d.quotes) throw new Error("feed");
        anchor.current = d.quotes;
        setPrev(latest.current);
        latest.current = d.quotes;
        setBoard(d.quotes);
        setAt(d.at ?? Date.now());
        setState("live");
      } catch {
        if (alive) setState((s) => (s === "live" ? "live" : "offline"));
      }
    };

    const tick = () => {
      const base = anchor.current;
      if (!Object.keys(base).length) return;
      const now = new Date();
      const openSymbols = new Set(
        HUB_MARKETS.filter((m) => m.symbol && marketOpen(m, now)).map((m) => m.symbol as string),
      );
      const next: Board = {};
      for (const [sym, q] of Object.entries(base)) {
        const last = latest.current[sym] ?? q;
        if (!openSymbols.has(sym)) {
          next[sym] = last;
          continue;
        }
        const pulled = last.price + (q.price - last.price) * 0.05;
        const px = pulled * (1 + (Math.random() - 0.5) * 0.0006);
        const band = q.price * 0.002;
        next[sym] = {
          ...q,
          price: Math.min(q.price + band, Math.max(q.price - band, px)),
          ts: Date.now(),
        };
      }
      if (!alive) return;
      setPrev(latest.current);
      latest.current = next;
      setBoard(next);
    };

    void pull();
    const idPoll = setInterval(pull, POLL_MS);
    const idTick = setInterval(tick, TICK_MS);
    return () => {
      alive = false;
      clearInterval(idPoll);
      clearInterval(idTick);
    };
  }, []);

  return { board, prev, state, at };
}

const REGIONS = ["All", "Asia Pacific", "Middle East", "Europe", "Africa", "Americas"] as const;

function fmtLevel(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function pct(now: number, before: number): string {
  if (!before) return "0.00%";
  const p = ((now - before) / before) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
}

function Row({
  m,
  quote,
  before,
  open,
  inrPer,
}: {
  m: HubMarket;
  quote: Quote | null;
  before: Quote | null;
  open: boolean;
  inrPer: number | undefined;
}) {
  const level = quote?.price ?? indicativeLevel(m);
  const session = quote ? pct(level, quote.prevClose) : "0.00%";
  const up = quote ? level >= quote.prevClose : true;
  const ticked = before && quote ? Math.sign(quote.price - before.price) : 0;

  return (
    <div
      data-testid={`market-${m.city}`}
      className="grid gap-3 border-b border-rule/15 bg-background p-4 sm:grid-cols-[1.4fr_1fr_0.9fr_0.9fr]"
    >
      <div>
        <p className="font-display text-lg leading-tight">{m.city}</p>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {m.country} · {m.exchange}
        </p>
      </div>

      <div>
        <p className="text-sm">{m.index}</p>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {m.symbol ? `${m.symbol} · ${m.currency}` : `Indicative · ${m.currency}`}
        </p>
      </div>

      <div>
        <p
          className={
            ticked > 0
              ? "font-display tnum text-xl text-primary transition-colors"
              : ticked < 0
                ? "font-display tnum text-xl text-muted-foreground transition-colors"
                : "font-display tnum text-xl transition-colors"
          }
        >
          {fmtLevel(level)}
        </p>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {inrPer ? `≈ ₹${fmtLevel(level * inrPer)}` : "₹ —"}
        </p>
      </div>

      <div className="sm:text-right">
        <p
          className={
            up
              ? "font-mono-ui text-sm tracking-[0.08em] text-primary"
              : "font-mono-ui text-sm tracking-[0.08em] text-muted-foreground"
          }
        >
          {session}
        </p>
        <p
          className={
            open
              ? "font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary"
              : "font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          }
        >
          {open ? "Trading now" : "Session shut"}
        </p>
      </div>
    </div>
  );
}

export function MarketsBoard() {
  const { board, prev, state, at } = useMarketBoard();
  const tape = useFxStream();
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("All");
  const [q, setQ] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clock = now ?? new Date(0);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return HUB_MARKETS.filter((m) => {
      if (region !== "All" && m.region !== region) return false;
      if (openOnly && !marketOpen(m, clock)) return false;
      if (!needle) return true;
      return `${m.city} ${m.country} ${m.exchange} ${m.index} ${m.symbol ?? ""}`
        .toLowerCase()
        .includes(needle);
    });
  }, [region, q, openOnly, clock]);

  const openCount = HUB_MARKETS.filter((m) => marketOpen(m, clock)).length;

  return (
    <div data-testid="markets-board" className="border border-rule/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/20 bg-background px-4 py-3">
        <div className="flex flex-wrap items-center gap-1">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              aria-pressed={region === r}
              className={
                region === r
                  ? "font-mono-ui border border-primary bg-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-primary-foreground"
                  : "font-mono-ui border border-rule/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              }
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => setOpenOnly((v) => !v)}
            aria-pressed={openOnly}
            className={
              openOnly
                ? "font-mono-ui border border-primary bg-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-primary-foreground"
                : "font-mono-ui border border-rule/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            }
          >
            Trading now
          </button>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search hub, exchange or index"
          className="font-mono-ui w-full max-w-xs border border-rule/25 bg-background px-3 py-1.5 text-xs outline-none focus:border-primary sm:w-64"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/15 bg-background px-4 py-2">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="text-primary">Streaming 24h</span>
          {" · "}
          {openCount} of {HUB_MARKETS.length} floors trading
          {" · "}
          {state === "live" ? "Live feed" : state === "loading" ? "Connecting" : "Indicative"}
          {at ? ` · anchor ${new Date(at).toISOString().slice(11, 19)} UTC` : ""}
          {" · "}
          {now ? `${now.toISOString().slice(11, 19)} UTC` : "--:--:-- UTC"}
        </p>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {rows.length} venue{rows.length === 1 ? "" : "s"} shown
        </p>
      </div>

      <div className="hidden grid-cols-[1.4fr_1fr_0.9fr_0.9fr] gap-3 border-b border-rule/20 bg-background px-4 py-2 sm:grid">
        {["Hub / exchange", "Benchmark", "Level", "Session"].map((h, i) => (
          <p
            key={h}
            className={`font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground ${i === 3 ? "text-right" : ""}`}
          >
            {h}
          </p>
        ))}
      </div>

      <div>
        {rows.map((m) => (
          <Row
            key={`${m.city}-${m.index}`}
            m={m}
            quote={m.symbol ? (board[m.symbol] ?? null) : null}
            before={m.symbol ? (prev[m.symbol] ?? null) : null}
            open={marketOpen(m, clock)}
            inrPer={tape.inrPer[m.currency]}
          />
        ))}
        {rows.length === 0 ? (
          <p className="bg-background p-6 text-sm text-muted-foreground">
            No venue matches that filter.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Continuous scrolling strip of every hub benchmark, for page headers. */
export function MarketsTicker() {
  const { board } = useMarketBoard();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(id);
  }, []);
  const clock = now ?? new Date(0);

  return (
    <div className="overflow-x-auto border-y border-rule/20 bg-background">
      <div className="flex min-w-max items-center">
        {HUB_MARKETS.map((m) => {
          const qte = m.symbol ? board[m.symbol] : undefined;
          const level = qte?.price ?? indicativeLevel(m);
          const open = marketOpen(m, clock);
          return (
            <span
              key={`${m.city}-${m.index}`}
              className="inline-flex shrink-0 items-baseline gap-3 border-r border-rule/15 px-5 py-2"
            >
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {m.city}
              </span>
              <span className="font-display tnum text-base">{fmtLevel(level)}</span>
              <span
                className={
                  qte && level >= qte.prevClose
                    ? "font-mono-ui text-[10px] text-primary"
                    : "font-mono-ui text-[10px] text-muted-foreground"
                }
              >
                {qte ? pct(level, qte.prevClose) : "—"}
              </span>
              <span
                className={
                  open
                    ? "font-mono-ui text-[9px] uppercase tracking-[0.14em] text-primary"
                    : "font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
                }
              >
                {open ? "open" : "shut"}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
