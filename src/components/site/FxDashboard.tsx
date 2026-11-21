import { useEffect, useMemo, useState } from "react";
import { HUBS } from "@/data/hubs";
import { COUNTRY_META } from "@/data/currencies";
import { FxHistory5Y } from "@/components/site/FxHistory5Y";
import { captureFxStamp, useFxStream, type FxTape } from "@/lib/fx-stream";

type Row = {
  code: string;
  name: string;
  iso2: string;
  hubs: string[];
  spot: number;
  prev: number;
};

function meta(country: string) {
  return COUNTRY_META[country] ?? { iso2: "UN", currency: "USD", currencyName: "US Dollar" };
}

/** One row per settlement currency actually used by the 52 hubs. */
function buildRows(tape: FxTape): Row[] {
  const byCode = new Map<string, Row>();
  for (const h of HUBS) {
    const m = meta(h.country);
    const spot = tape.inrPer[m.currency] ?? 0;
    const prev = tape.prev[m.currency] ?? spot;
    const row = byCode.get(m.currency);
    if (row) row.hubs.push(h.city);
    else
      byCode.set(m.currency, {
        code: m.currency,
        name: m.currencyName,
        iso2: m.iso2,
        hubs: [h.city],
        spot,
        prev,
      });
  }
  return [...byCode.values()].sort((a, b) => b.hubs.length - a.hubs.length);
}

function Arrow({ d }: { d: number }) {
  if (d === 0) return <span className="text-muted-foreground">▬</span>;
  return <span className={d > 0 ? "text-primary" : "text-muted-foreground"}>{d > 0 ? "▲" : "▼"}</span>;
}

/**
 * Standalone treasury tape desk: every settlement currency on the rail, the live
 * rupee print, the hubs that settle in it, and the five-year movement of the one
 * the treasurer is looking at — all off the same shared stream the rest of the
 * rail prices on.
 */
export function FxDashboard() {
  const tape = useFxStream();
  const [q, setQ] = useState("");
  const [code, setCode] = useState("SGD");
  const [notional, setNotional] = useState(475);
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  useEffect(() => setOpenedAt(Date.now()), []);
  const [history, setHistory] = useState<{ seq: number; at: number; px: number }[]>([]);

  const rows = useMemo(() => buildRows(tape), [tape]);
  const selected = rows.find((r) => r.code === code) ?? rows[0]!;
  const spot = selected?.spot ?? 0;

  // Rolling in-session print history for the selected currency — the intraday
  // walk the desk actually saw while this page was open.
  useEffect(() => {
    if (!spot) return;
    setHistory((p) => [...p, { seq: tape.seq, at: tape.at, px: spot }].slice(-120));
  }, [tape.seq, spot]);

  useEffect(() => setHistory([]), [code]);

  const filtered = rows.filter((r) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      r.code.toLowerCase().includes(s) ||
      r.name.toLowerCase().includes(s) ||
      r.hubs.some((h) => h.toLowerCase().includes(s))
    );
  });

  const sessionHigh = history.length ? Math.max(...history.map((h) => h.px)) : spot;
  const sessionLow = history.length ? Math.min(...history.map((h) => h.px)) : spot;
  const first = history[0]?.px ?? spot;
  const sessionMove = first ? ((spot - first) / first) * 100 : 0;
  const gross = notional * 1e7;
  const fcy = spot > 0 ? gross / spot : 0;

  const w = 720;
  const h = 120;
  const path = history.length
    ? history
        .map((p, i) => {
          const x = (i / Math.max(1, history.length - 1)) * w;
          const range = Math.max(1e-9, sessionHigh - sessionLow);
          const y = h - ((p.px - sessionLow) / range) * (h - 12) - 6;
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ")
    : "";

  return (
    <div className="space-y-8">
      {/* headline strip */}
      <div className="grid gap-px border border-rule/20 bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Tape status", tape.status === "live" ? "Live interbank" : tape.status === "loading" ? "Syncing" : "Indicative"],
          ["Anchor", tape.anchor || "—"],
          ["Print", `#${tape.seq}`],
          ["Desk open since", openedAt ? new Date(openedAt).toLocaleTimeString("en-IN") : "—"],
        ].map(([k, v]) => (
          <div key={k} className="bg-background p-5">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
            <p className="font-display tnum mt-2 text-xl">{v}</p>
          </div>
        ))}
      </div>

      {/* selected currency */}
      <div className="grid gap-px border border-rule/20 bg-rule/15 lg:grid-cols-3">
        <div className="bg-background p-6">
          <div className="flex items-center gap-3">
            <img
              src={`https://flagcdn.com/${selected.iso2.toLowerCase()}.svg`}
              alt={`${selected.name} jurisdiction flag`}
              loading="lazy"
              className="h-6 w-10 border border-rule/20 object-cover"
            />
            <div>
              <p className="font-display text-3xl leading-none">{selected.code}/INR</p>
              <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {selected.name}
              </p>
            </div>
          </div>
          <p className="font-display tnum mt-6 text-5xl text-primary">
            ₹{spot.toLocaleString("en-IN", { maximumFractionDigits: 4 })}
          </p>
          <p className="font-mono-ui tnum mt-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <Arrow d={spot - selected.prev} /> {Math.abs(spot - selected.prev).toFixed(4)} · session{" "}
            {sessionMove >= 0 ? "+" : ""}
            {sessionMove.toFixed(3)}%
          </p>
          <button
            type="button"
            onClick={() => captureFxStamp(`Tape desk read · ${selected.code}`, selected.code, notional)}
            className="font-mono-ui mt-6 border border-primary bg-primary px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-primary-foreground"
          >
            Stamp this print to the ledger
          </button>
        </div>

        <div className="bg-background p-6 lg:col-span-2">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Intraday walk since this desk opened — {history.length} prints
          </p>
          <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-32 w-full" preserveAspectRatio="none" role="img"
            aria-label={`Intraday movement of ${selected.code} against the Indian Rupee`}>
            <path d={path} fill="none" stroke="var(--primary)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="mt-3 grid grid-cols-3 gap-px bg-rule/15">
            {[
              ["Session high", `₹${sessionHigh.toFixed(4)}`],
              ["Session low", `₹${sessionLow.toFixed(4)}`],
              [`${notional} cr buys`, `${selected.code} ${fcy.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                <p className="font-display tnum mt-1.5 text-lg">{v}</p>
              </div>
            ))}
          </div>
          <label className="font-mono-ui mt-5 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Notional (INR crore)
            <input
              type="range"
              min={5}
              max={5000}
              step={5}
              value={notional}
              onChange={(e) => setNotional(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--primary)]"
            />
          </label>
        </div>
      </div>

      <FxHistory5Y
        code={selected.code}
        spot={spot}
        label={`${selected.name} (${selected.code}) against the Indian Rupee — settles ${selected.hubs.length} of the 52 hubs`}
      />

      {/* full tape */}
      <div className="border border-rule/20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/15 px-5 py-4">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Live tape — every settlement currency on the rail
          </p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search currency or hub"
            className="w-56 border border-rule/25 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule/15">
                {["Currency", "INR per unit", "Tick", "Hubs settling in it", ""].map((th) => (
                  <th key={th} className="font-mono-ui px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const d = r.spot - r.prev;
                return (
                  <tr
                    key={r.code}
                    className={`border-b border-rule/10 ${r.code === selected.code ? "bg-primary/[0.04]" : ""}`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-display text-base">{r.code}</span>{" "}
                      <span className="text-sm text-muted-foreground">{r.name}</span>
                    </td>
                    <td className="tnum px-4 py-2.5 text-sm">
                      {r.spot ? `₹${r.spot.toLocaleString("en-IN", { maximumFractionDigits: 4 })}` : "—"}
                    </td>
                    <td className="tnum px-4 py-2.5 text-sm">
                      <Arrow d={d} /> {Math.abs(d).toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {r.hubs.length} · {r.hubs.slice(0, 4).join(", ")}
                      {r.hubs.length > 4 ? " …" : ""}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => setCode(r.code)}
                        className="font-mono-ui border border-rule/30 px-3 py-1 text-[9px] uppercase tracking-[0.14em] transition-colors hover:border-primary hover:text-primary"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* hub movement */}
      <div className="border border-rule/20">
        <p className="font-mono-ui border-b border-rule/15 px-5 py-4 text-[10px] uppercase tracking-[0.18em] text-primary">
          Hub movement — all 52 corridors on the current print
        </p>
        <div className="grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
          {HUBS.map((hub) => {
            const m = meta(hub.country);
            const px = tape.inrPer[m.currency] ?? 0;
            const pv = tape.prev[m.currency] ?? px;
            const d = px - pv;
            return (
              <button
                key={hub.city}
                type="button"
                onClick={() => setCode(m.currency)}
                className="bg-background p-4 text-left transition-colors hover:bg-primary/[0.04]"
              >
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  {hub.city} · {m.currency}
                </p>
                <p className="font-display tnum mt-1.5 text-lg">
                  {px ? `₹${px.toLocaleString("en-IN", { maximumFractionDigits: 4 })}` : "—"}
                </p>
                <p className="font-mono-ui tnum mt-0.5 text-[10px] text-muted-foreground">
                  <Arrow d={d} /> {Math.abs(d).toFixed(4)} · {hub.route}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
