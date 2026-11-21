import { useEffect, useMemo, useRef, useState } from "react";
import { useFxStream } from "@/lib/fx-stream";
import { HUBS } from "@/data/hubs";
import { COUNTRY_META, flag } from "@/data/currencies";
import { arrangementDepth, arrangementFor } from "@/data/india-arrangements";

const OZ_TO_G = 31.1034768;
const METAL_NAME: Record<string, string> = { XAU: "Gold", XAG: "Silver", XPT: "Platinum", XPD: "Palladium" };
// LBMA auction windows, London time.
const LBMA: Record<string, string[]> = { XAU: ["10:30", "15:00"], XAG: ["12:00"], XPT: ["09:45", "14:00"], XPD: ["09:45", "14:00"] };

type Metal = { symbol: string; usdPerOz: number; updatedAt: string | null };

function clock(tz: string) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const h = Number(g("hour")), m = Number(g("minute"));
  return { label: `${g("hour")}:${g("minute")}:${g("second")}`, mins: h * 60 + m, weekend: ["Sat", "Sun"].includes(g("weekday")) };
}

function useNow(ms = 1000) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return n;
}

function useMetals() {
  const [state, setState] = useState<{ metals: Metal[]; prev: Record<string, number>; source: string; at: string; status: "loading" | "live" | "unavailable" }>({ metals: [], prev: {}, source: "", at: "", status: "loading" });
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch("/api/public/metals", { cache: "no-store" });
        if (!r.ok) throw new Error();
        const j = (await r.json()) as { metals: Metal[]; source: string; at: string; stale?: boolean };
        if (!alive) return;
        setState((s) => ({
          metals: j.metals,
          prev: Object.fromEntries(s.metals.map((m) => [m.symbol, m.usdPerOz])),
          source: j.source + (j.stale ? " (stale)" : ""),
          at: j.at,
          status: "live",
        }));
      } catch {
        if (alive) setState((s) => ({ ...s, status: s.metals.length ? s.status : "unavailable" }));
      }
    };
    void pull();
    const id = setInterval(pull, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return state;
}

function Dir({ now, prev }: { now: number; prev?: number | undefined }) {
  if (!prev || prev === now) return <span className="text-muted-foreground">■</span>;
  return now > prev ? <span className="text-primary">▲</span> : <span className="text-destructive">▼</span>;
}

function Cell({ k, v, sub }: { k: string; v: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="border-t border-rule/15 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono-ui text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{k}</span>
        <span className="tnum text-base font-medium">{v}</span>
      </div>
      {sub && <div className="mt-0.5 text-right font-mono-ui text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SessionBadge({ open, label }: { open: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono-ui text-[10px] uppercase tracking-[0.14em] ${open ? "border-primary text-primary" : "border-rule/30 text-muted-foreground"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${open ? "animate-pulse bg-primary" : "bg-muted-foreground"}`} />
      {label}
    </span>
  );
}

/** Indian FX market + London interbank FX & precious-metals desk. */
export function LiveMarketsDesk() {
  const t = useFxStream();
  const metals = useMetals();
  const tick = useNow();
  const hydrated = tick > 0;
  const ist = hydrated ? clock("Asia/Kolkata") : { label: "--:--:--", mins: 0, weekend: true };
  const ldn = hydrated ? clock("Europe/London") : { label: "--:--:--", mins: 0, weekend: true };
  const indiaOpen = !ist.weekend && ist.mins >= 9 * 60 && ist.mins < 17 * 60;
  const londonOpen = !ldn.weekend && ldn.mins >= 8 * 60 && ldn.mins < 17 * 60;
  const usdInr = t.inrPer['USD'] ?? 0;
  const cross = (a: string, b: string) => (t.inrPer[a] && t.inrPer[b] ? t.inrPer[a]! / t.inrPer[b]! : 0);
  const crossPrev = (a: string, b: string) => (t.prev[a] && t.prev[b] ? t.prev[a]! / t.prev[b]! : 0);
  const gap = (c: string) => {
    const o = t.official[c], l = t.inrPer[c];
    return o && l ? `RBI ref ${o.toFixed(4)} · ${(((l - o) / o) * 1e4).toFixed(1)} bps` : "RBI reference not yet loaded";
  };
  const nextAuction = (sym: string) => {
    const slots = LBMA[sym] ?? [];
    const n = slots.find((s) => { const [h, m] = s.split(":").map(Number); return h! * 60 + m! > ldn.mins; });
    return ldn.weekend ? "next auction Monday" : n ? `next LBMA auction ${n} London` : "auctions done today";
  };

  return (
    <div className="grid gap-px border border-rule/20 bg-rule/20 lg:grid-cols-2">
      <div className="bg-background p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-2xl">Indian FX market</h3>
          <SessionBadge open={indiaOpen} label={indiaOpen ? `Onshore open · IST ${ist.label}` : `Onshore closed · IST ${ist.label}`} />
        </div>
        <p className="mb-2 text-xs text-muted-foreground">Onshore interbank & exchange currency-derivative hours 09:00–17:00 IST. Outside hours the tape follows offshore 24×7 prints.</p>
        {["USD", "EUR", "GBP", "JPY", "AED", "SGD"].map((c) => (
          <Cell key={c} k={`${c}/INR${c === "JPY" ? " ×100" : ""}`} v={<><Dir now={t.inrPer[c] ?? 0} prev={t.prev[c]} /> {((t.inrPer[c] ?? 0) * (c === "JPY" ? 100 : 1)).toFixed(4)}</>} sub={gap(c)} />
        ))}
      </div>

      <div className="bg-background p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-2xl">London interbank · FX & metals</h3>
          <SessionBadge open={londonOpen} label={londonOpen ? `London open · ${ldn.label}` : `London closed · ${ldn.label}`} />
        </div>
        <p className="mb-2 text-xs text-muted-foreground">London 08:00–17:00 local carries the deepest FX liquidity; precious metals print 24×5 with LBMA auctions as the benchmark.</p>
        <Cell k="EUR/USD" v={<><Dir now={cross("EUR", "USD")} prev={crossPrev("EUR", "USD")} /> {cross("EUR", "USD").toFixed(5)}</>} />
        <Cell k="GBP/USD" v={<><Dir now={cross("GBP", "USD")} prev={crossPrev("GBP", "USD")} /> {cross("GBP", "USD").toFixed(5)}</>} />
        <Cell k="EUR/GBP" v={<><Dir now={cross("EUR", "GBP")} prev={crossPrev("EUR", "GBP")} /> {cross("EUR", "GBP").toFixed(5)}</>} />
        {metals.status === "unavailable" && <p className="mt-3 text-sm text-destructive">Metals feed unavailable right now — no fallback price is shown.</p>}
        {metals.metals.map((m) => (
          <Cell
            key={m.symbol}
            k={`${METAL_NAME[m.symbol]} ${m.symbol}/USD oz`}
            v={<><Dir now={m.usdPerOz} prev={metals.prev[m.symbol]} /> ${m.usdPerOz.toLocaleString("en-US", { maximumFractionDigits: 2 })}</>}
            sub={`≈ ₹${((m.usdPerOz / OZ_TO_G) * (m.symbol === "XAU" || m.symbol === "XPT" || m.symbol === "XPD" ? 10 : 1000) * usdInr).toLocaleString("en-IN", { maximumFractionDigits: 0 })} per ${m.symbol === "XAG" ? "kg" : "10 g"} (ex-duty/GST) · ${nextAuction(m.symbol)}`}
          />
        ))}
      </div>

      <div className="bg-secondary/60 px-6 py-3 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:col-span-2">
        FX: {t.source || "connecting"} · {t.status} · anchor {t.anchor || "—"} · RBI: {t.officialSource || "—"} {t.officialStamp} · Metals: {metals.source || metals.status} {metals.at && metals.at.slice(11, 19) + " UTC"} · Public composites, not LBMA/FBIL benchmarks or an execution feed.
      </div>
    </div>
  );
}

type SortKey = "depth" | "wht" | "days" | "move";

/** 52-hub comparative grid: live FX move + India's intergovernmental arrangements. */
export function HubComparative() {
  const t = useFxStream();
  const open = useRef<Record<string, number>>({});
  const [sort, setSort] = useState<SortKey>("depth");
  const [q, setQ] = useState("");
  const [onlyTrade, setOnlyTrade] = useState(false);
  for (const [c, v] of Object.entries(t.inrPer)) if (open.current[c] == null && t.status !== "loading") open.current[c] = v;

  const rows = useMemo(() => {
    const out = HUBS.map((h) => {
      const meta = COUNTRY_META[h.country];
      const ccy = meta?.currency ?? "USD";
      const a = arrangementFor(h.country);
      const px = t.inrPer[ccy] ?? 0;
      const o = open.current[ccy];
      const move = o && px ? ((px - o) / o) * 1e4 : 0;
      const wht = Math.min(...(h.wht.match(/\d+(\.\d+)?/g) ?? ["0"]).map(Number));
      return { h, meta, ccy, a, px, move, wht, depth: arrangementDepth(a) };
    }).filter((r) => (!q || `${r.h.city} ${r.h.country} ${r.ccy}`.toLowerCase().includes(q.toLowerCase())) && (!onlyTrade || !/talks|negotiations|No trade/.test(r.a.trade)));
    const f: Record<SortKey, (a: (typeof out)[0], b: (typeof out)[0]) => number> = {
      depth: (a, b) => b.depth - a.depth,
      wht: (a, b) => a.wht - b.wht,
      days: (a, b) => a.h.days - b.h.days,
      move: (a, b) => Math.abs(b.move) - Math.abs(a.move),
    };
    return out.sort(f[sort]);
  }, [t, sort, q, onlyTrade]);

  const top = rows[0];
  return (
    <div>
      {top && (
        <div className="mb-4 border-l-4 border-primary bg-secondary/60 p-4 text-sm">
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">Lead read · </span>
          {top.h.city} ranks first on <b>{{ depth: "arrangement depth", wht: "lowest treaty withholding", days: "fastest legacy clearance", move: "largest live FX move" }[sort]}</b> — {top.a.trade}; DTAA {top.a.dtaa.toLowerCase()}; {top.ccy}/INR {top.px.toFixed(4)}. Use it as a shortlist starting point, then confirm treaty eligibility (TRC, Form 10F, PPT/LOB) before routing.
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hub, country, currency" aria-label="Search hubs" className="h-9 w-64 border border-rule/30 bg-background px-3 text-sm" />
        {(["depth", "wht", "days", "move"] as SortKey[]).map((k) => (
          <button key={k} onClick={() => setSort(k)} className={`h-9 border px-3 font-mono-ui text-[10px] uppercase tracking-[0.14em] ${sort === k ? "border-primary bg-primary text-primary-foreground" : "border-rule/30"}`}>
            {{ depth: "Arrangement depth", wht: "Lowest WHT", days: "Fastest", move: "Live FX move" }[k]}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyTrade} onChange={(e) => setOnlyTrade(e.target.checked)} /> Trade agreement concluded
        </label>
        <span className="ml-auto font-mono-ui text-[10px] uppercase text-muted-foreground">{rows.length} hubs</span>
      </div>
      <div className="max-h-[640px] overflow-auto border border-rule/20">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="sticky top-0">
            <tr className="bg-primary text-primary-foreground">
              {["Hub", "CCY/INR live", "Move since open", "DTAA", "Trade arrangement", "Investment treaty", "Payments / currency", "WHT", "Depth"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-mono-ui text-[10px] font-medium uppercase tracking-[0.14em]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.h.city} className="border-t border-rule/12 even:bg-secondary/60 align-top">
                <td className="px-3 py-2 font-medium">{r.meta ? flag(r.meta.iso2) : ""} {r.h.city}<div className="text-xs font-normal text-muted-foreground">{r.h.country}</div></td>
                <td className="tnum px-3 py-2"><Dir now={r.px} prev={t.prev[r.ccy]} /> {r.ccy} {r.px < 1 ? r.px.toFixed(6) : r.px.toFixed(4)}</td>
                <td className={`tnum px-3 py-2 ${r.move > 0 ? "text-primary" : r.move < 0 ? "text-destructive" : "text-muted-foreground"}`}>{r.move >= 0 ? "+" : ""}{r.move.toFixed(1)} bps</td>
                <td className="px-3 py-2">{r.a.dtaa}{r.a.verify && <span title="Status should be verified against the official source" className="ml-1 text-primary">*</span>}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.a.trade}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.a.investment}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.a.payments ?? "—"}</td>
                <td className="tnum px-3 py-2">{r.h.wht}</td>
                <td className="px-3 py-2">
                  <div className="h-1.5 w-20 bg-rule/15"><div className="h-full bg-primary" style={{ width: `${r.depth}%` }} /></div>
                  <span className="tnum text-xs">{r.depth}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Arrangements compiled from public Income Tax Department (DTAA), Department of Commerce and DEA listings; * = status recently changed or should be re-checked. Depth score is an indicative weighting of DTAA, trade, investment and payment links — not a legal opinion. Withholding shown is the prototype's indicative treaty view. "Move since open" is measured from when this page opened.
      </p>
    </div>
  );
}
