import { useEffect, useMemo, useRef, useState } from "react";
import {
  changePct,
  crossRate,
  direction,
  formatRate,
  pairKey,
  pairsFor,
  venueOpen,
  type Pair,
  type Venue,
} from "@/lib/fx";

const VENUES: { id: Venue; label: string; sub: string }[] = [
  { id: "london", label: "London interbank", sub: "EBS / Reuters majors · 07:00–17:00 UTC" },
  { id: "india", label: "Indian FX market", sub: "Mumbai interbank & GIFT IFSC · 09:00–17:00 IST" },
];

type Snapshot = {
  rates: Record<string, number>;
  stamp: string;
  source: string;
  tier: "terminal" | "interbank";
  /** RBI reference rate, INR per unit. */
  official: Record<string, number>;
  officialSource: string;
  officialStamp: string;
};

const TICK_MS = 1000;

/**
 * Continuous USD-base tape. An anchor poll against the round-the-clock feed
 * route every 20 seconds, with a bounded micro-walk between anchors so both
 * venues keep printing 24 hours a day even when a cash session is shut.
 */
function useUsdRates(pollMs = 20_000) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [prev, setPrev] = useState<Record<string, number>>({});
  const [state, setState] = useState<"loading" | "live" | "offline">("loading");
  const anchor = useRef<Record<string, number>>({});
  const latest = useRef<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch("/api/public/fx");
        const d = (await r.json()) as {
          rates?: Record<string, number>;
          stamp?: string;
          source?: string;
          tier?: "terminal" | "interbank";
          official?: { inrPer: Record<string, number>; source: string; stamp: string } | null;
        };
        if (!alive || !d.rates) throw new Error("feed");
        anchor.current = d.rates;
        setSnap((old) => {
          if (old) setPrev(old.rates);
          return {
            rates: d.rates!,
            stamp: d.stamp ?? "",
            source: d.source ?? "interbank",
            tier: d.tier ?? "interbank",
            official: d.official?.inrPer ?? old?.official ?? {},
            officialSource: d.official?.source ?? old?.officialSource ?? "",
            officialStamp: d.official?.stamp ?? old?.officialStamp ?? "",
          };
        });
        latest.current = d.rates;
        setState("live");
      } catch {
        if (alive) setState((s) => (s === "live" ? "live" : "offline"));
      }
    };

    // Micro-structure walk between anchors: ±12 bps band, mean-reverting.
    const tick = () => {
      const base = anchor.current;
      if (!Object.keys(base).length) return;
      const next: Record<string, number> = {};
      for (const [code, a] of Object.entries(base)) {
        const last = latest.current[code] ?? a;
        const pulled = last + (a - last) * 0.06;
        const px = pulled * (1 + (Math.random() - 0.5) * 0.00035);
        const band = a * 0.0012;
        next[code] = Math.min(a + band, Math.max(a - band, px));
      }
      const before = latest.current;
      latest.current = next;
      if (!alive) return;
      setPrev(before);
      setSnap((old) => (old ? { ...old, rates: next } : old));
    };

    void pull();
    const idPoll = setInterval(pull, pollMs);
    const idTick = setInterval(tick, TICK_MS);
    return () => {
      alive = false;
      clearInterval(idPoll);
      clearInterval(idTick);
    };
  }, [pollMs]);

  return { snap, prev, state };
}


function Quote({
  p,
  rate,
  before,
  dense = false,
}: {
  p: Pair;
  rate: number | null;
  before: number | null;
  dense?: boolean;
}) {
  const dir = rate === null ? "flat" : direction(rate, before ?? undefined);
  return (
    <span
      data-testid={`quote-${pairKey(p)}`}
      className={`inline-flex shrink-0 items-baseline border-r border-rule/15 ${dense ? "gap-2 px-3.5 py-1.5" : "gap-3 px-6 py-2"}`}
    >
      <span className="font-mono-ui text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {pairKey(p)}
      </span>
      <span className={`font-display tabular-nums ${dense ? "text-base" : "text-lg"}`}>
        {rate === null ? "—" : formatRate(rate, p)}
      </span>
      <span
        data-direction={dir}
        className={
          dir === "up"
            ? "font-mono-ui text-[10px] tracking-[0.12em] text-primary"
            : dir === "down"
              ? "font-mono-ui text-[10px] tracking-[0.12em] text-muted-foreground line-through decoration-primary/60"
              : "font-mono-ui text-[10px] tracking-[0.12em] text-muted-foreground"
        }
      >
        {rate === null ? "0.00%" : changePct(rate, before ?? undefined)}
      </span>
    </span>
  );
}

/**
 * Dual-venue foreign-exchange tape: London interbank majors and the Indian
 * rupee market, refreshed every minute from a live reference feed.
 */
export function FxTicker({ compact = false }: { compact?: boolean }) {
  const { snap, prev, state } = useUsdRates();
  const [venue, setVenue] = useState<Venue>("india");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    const rates = snap?.rates ?? {};
    return pairsFor(venue).map((p) => ({
      p,
      rate: crossRate(rates, p.base, p.quote, "USD"),
      before: crossRate(prev, p.base, p.quote, "USD"),
    }));
  }, [snap, prev, venue]);

  const open = venueOpen(venue, now ?? new Date(0));
  const meta = VENUES.find((v) => v.id === venue);

  const status = `${open ? "Cash session open" : "Cash session shut"} · ${state === "live" ? `${snap?.tier === "terminal" ? "Terminal feed" : "Interbank feed"}${snap?.source ? ` · ${snap.source}` : ""}${snap?.stamp ? ` · ${snap.stamp}` : ""}` : state === "loading" ? "Connecting" : "Indicative"}${snap?.official?.["USD"] ? ` · RBI reference ₹${snap.official["USD"].toFixed(4)}/USD${snap.officialStamp ? ` · ${snap.officialStamp}` : ""}` : ""}`;

  if (compact) {
    return (
      <section data-testid="fx-ticker" aria-label="Live FX tape" className="border-b border-rule/20 bg-background">
        <div className="mx-auto flex max-w-[1400px] items-stretch">
          <div className="flex shrink-0 items-center gap-px border-r border-rule/15 px-2 sm:px-3" role="group" aria-label="FX venue">
            {VENUES.map((v) => (
              <button key={v.id} onClick={() => setVenue(v.id)} aria-pressed={venue === v.id} aria-label={v.label} title={v.sub}
                className={`font-mono-ui px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${venue === v.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"}`}>
                {v.id === "india" ? "INR" : "LDN"}
              </button>
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
            <div className="flex min-w-max items-center">
              {rows.map((r) => <Quote key={pairKey(r.p)} p={r.p} rate={r.rate} before={r.before} dense />)}
            </div>
          </div>
          <p title={status} className="hidden shrink-0 items-center gap-1.5 border-l border-rule/15 px-3 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground md:flex">
            <span aria-hidden className={`size-1.5 ${state === "live" ? "animate-pulse bg-primary" : "bg-muted-foreground"}`} />
            <span className="text-primary">{state === "live" ? "Live" : state === "loading" ? "Connecting" : "Indicative"}</span>
            <span>{now ? `${now.toISOString().slice(11, 19)} UTC` : "--:--:-- UTC"}</span>
            <span className="sr-only">{status}</span>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="fx-ticker" className="border-y border-rule/20 bg-background">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-2.5">
        <div className="flex items-center gap-1">
          {VENUES.map((v) => (
            <button
              key={v.id}
              onClick={() => setVenue(v.id)}
              aria-pressed={venue === v.id}
              className={
                venue === v.id
                  ? "font-mono-ui border border-primary bg-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-primary-foreground"
                  : "font-mono-ui border border-rule/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              }
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="text-primary">Streaming 24h</span>
          {" · "}
          <span className={open ? "text-primary" : ""}>{open ? "Cash session open" : "Cash session shut"}</span>
          {" · "}
          {state === "live"
            ? `${snap?.tier === "terminal" ? "Terminal feed" : "Interbank feed"}${snap?.source ? ` · ${snap.source}` : ""}${snap?.stamp ? ` · ${snap.stamp}` : ""}`
            : state === "loading"
              ? "Connecting"
              : "Indicative"}
          {" · "}
          {now ? `${now.toISOString().slice(11, 19)} UTC` : "--:--:-- UTC"}
          {snap?.official?.["USD"] ? (
            <>
              {" · "}
              <span className="text-primary">
                RBI reference ₹{snap.official["USD"].toFixed(4)}/USD
                {snap.officialStamp ? ` · ${snap.officialStamp}` : ""}
              </span>
            </>
          ) : null}
        </p>

      </div>

      <div className="overflow-x-auto border-t border-rule/15">
        <div className="flex min-w-max items-center">
          {rows.map((r) => (
            <Quote key={pairKey(r.p)} p={r.p} rate={r.rate} before={r.before} />
          ))}
        </div>
      </div>

      {compact ? null : (
        <p className="mx-auto max-w-[1400px] px-6 py-2 text-xs leading-relaxed text-muted-foreground">
          {meta?.sub} — {venue === "india"
            ? "these are the rates a treasury actually books an outbound remittance at."
            : "these are the crosses that set the price before the rupee leg is applied."}
        </p>
      )}
    </section>
  );
}
