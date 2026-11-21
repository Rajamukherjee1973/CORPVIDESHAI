import { useEffect, useMemo, useState } from "react";
import { HUBS } from "@/data/hubs";
import { COUNTRY_META, FALLBACK_RATES } from "@/data/currencies";

type Row = {
  city: string;
  country: string;
  iso2: string;
  code: string;
  name: string;
  days: number;
  route: string;
};

const ROWS: Row[] = HUBS.map((h) => {
  const m = COUNTRY_META[h.country] ?? { iso2: "UN", currency: "USD", currencyName: "US Dollar" };
  return {
    city: h.city,
    country: h.country,
    iso2: m.iso2,
    code: m.currency,
    name: m.currencyName,
    days: h.days,
    route: h.route,
  };
});

const SYMBOLS = Array.from(new Set(ROWS.map((r) => r.code)));

function Flag({ iso2, className = "h-4 w-6" }: { iso2: string; className?: string }) {
  return (
    <img
      src={`https://flagcdn.com/${iso2.toLowerCase()}.svg`}
      alt={`${iso2} national flag`}
      loading="lazy"
      className={`${className} border border-rule/20 object-cover`}
    />
  );
}

/** Live national-symbol ticker for all 52 hubs, priced against the Indian Rupee. */
export function HubTicker() {
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [prev, setPrev] = useState<Record<string, number>>(FALLBACK_RATES);
  const [state, setState] = useState<"loading" | "live" | "indicative">("loading");
  const [stamp, setStamp] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    let first = true;
    const pull = async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/INR");
        const d = (await r.json()) as {
          rates?: Record<string, number>;
          time_last_update_utc?: string;
        };
        if (!alive || !d.rates) throw new Error("feed");
        setRates((old) => {
          const next = { ...FALLBACK_RATES, ...d.rates } as Record<string, number>;
          setPrev(first ? next : old);
          first = false;
          return next;
        });
        setStamp(d.time_last_update_utc?.slice(5, 22) ?? "");
        setState("live");
      } catch {
        if (alive) setState((s) => (s === "live" ? "live" : "indicative"));
      }
    };
    void pull();
    const id = setInterval(pull, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const priced = useMemo(() => SYMBOLS.filter((s) => rates[s]).length, [rates]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ROWS;
    return ROWS.filter((r) =>
      [r.city, r.country, r.code, r.name].some((v) => v.toLowerCase().includes(t)),
    );
  }, [q]);

  const inrPer = (code: string) => {
    const r = rates[code];
    return r ? 1 / r : null;
  };
  const delta = (code: string) => {
    const a = rates[code];
    const b = prev[code];
    if (!a || !b || a === b) return 0;
    return 1 / a - 1 / b;
  };

  return (
    <div className="border border-rule/25">
      <style>{`@keyframes cv-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/15 px-6 py-4">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            52 hubs · national symbol ticker · live vs INR
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Every corridor's flag, settlement currency and current rupee price, refreshed every 60
            seconds.
          </p>
        </div>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {state === "live"
            ? `Live · ${stamp} · ${priced}/${SYMBOLS.length} currencies priced`
            : state === "loading"
              ? "Syncing feed"
              : "Feed unreachable · indicative rates"}
        </p>
      </div>

      {/* running ticker tape */}
      <div className="overflow-hidden border-b border-rule/15 bg-primary py-2.5 text-primary-foreground">
        <div
          className="flex w-max gap-8 whitespace-nowrap"
          style={{ animation: "cv-marquee 90s linear infinite" }}
        >
          {[...ROWS, ...ROWS].map((r, i) => {
            const v = inrPer(r.code);
            const d = delta(r.code);
            return (
              <span key={`${r.city}-${i}`} className="flex items-center gap-2 text-[12px]">
                <Flag iso2={r.iso2} className="h-3.5 w-5" />
                <span className="font-mono-ui tracking-[0.1em]">{r.city.toUpperCase()}</span>
                <span className="font-mono-ui opacity-75">{r.code}</span>
                <span className="tnum font-medium">
                  ₹{v ? v.toLocaleString("en-IN", { maximumFractionDigits: 4 }) : "—"}
                </span>
                <span className="tnum opacity-80">
                  {d === 0 ? "▬" : d > 0 ? "▲" : "▼"}
                  {d !== 0 ? Math.abs(d).toFixed(4) : ""}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="border-b border-rule/15 px-6 py-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by hub, country or currency"
          className="w-full max-w-md border border-rule/25 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((r) => {
          const v = inrPer(r.code);
          const d = delta(r.code);
          return (
            <div key={r.city} className="bg-background px-4 py-4">
              <div className="flex items-center gap-2">
                <Flag iso2={r.iso2} />
                <p className="font-display text-lg leading-none">{r.city}</p>
              </div>
              <p className="mt-1 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {r.country} · {r.route}
              </p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-mono-ui text-[11px] tracking-[0.12em] text-primary">
                  1 {r.code}
                </span>
                <span className="tnum font-display text-2xl">
                  ₹{v ? v.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span>{r.name}</span>
                <span className={d > 0 ? "text-primary" : ""}>
                  {d === 0 ? "▬ flat" : `${d > 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(4)}`}
                </span>
              </div>
              <p className="mt-2 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Paper today {r.days} days · on rail 9 min
              </p>
            </div>
          );
        })}
      </div>

      <p className="border-t border-rule/15 px-6 py-4 text-sm text-muted-foreground">
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
          In plain words —
        </span>{" "}
        each tile is one of the 52 financial centres the rail can send money to. The flag shows the
        country, the code shows the currency they settle in, and the big number is how many rupees
        one unit of that currency costs right now. The arrow shows whether it moved up or down since
        the last refresh.
      </p>
    </div>
  );
}