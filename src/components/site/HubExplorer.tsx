import { useMemo, useState } from "react";
import { HUBS } from "@/data/hubs";
import { COUNTRY_META } from "@/data/currencies";
import { FxHistory5Y } from "@/components/site/FxHistory5Y";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { captureFxStamp, useFxStream, type FxStamp } from "@/lib/fx-stream";

function meta(country: string) {
  return COUNTRY_META[country] ?? { iso2: "UN", currency: "USD", currencyName: "US Dollar" };
}

function Flag({ iso2, className = "h-5 w-8" }: { iso2: string; className?: string }) {
  return (
    <img
      src={`https://flagcdn.com/${iso2.toLowerCase()}.svg`}
      alt={`${iso2} national flag`}
      loading="lazy"
      className={`${className} border border-rule/20 object-cover`}
    />
  );
}

/**
 * Click any of the 52 hubs and read its settlement currency live: streaming
 * rupee print, five-year movement, and the corridor walked in 3D.
 */
export function HubExplorer() {
  const [city, setCity] = useState(HUBS[0]!.city);
  const [notional, setNotional] = useState(475);
  const [stamps, setStamps] = useState<FxStamp[]>([]);
  const tape = useFxStream();

  const hub = HUBS.find((h) => h.city === city) ?? HUBS[0]!;
  const m = meta(hub.country);
  const spot = tape.inrPer[m.currency] ?? 1;
  const prev = tape.prev[m.currency] ?? spot;
  const tick = spot - prev;

  const wht = useMemo(() => {
    const n = Number((hub.wht.match(/\d+(\.\d+)?/) ?? ["0"])[0]);
    return Number.isFinite(n) ? n : 0;
  }, [hub.wht]);

  const gross = notional * 1e7;
  const net = gross * (1 - wht / 100);
  const fcy = spot > 0 ? net / spot : 0;

  const capture = (action: string) => {
    const s = captureFxStamp(`${action} · ${hub.city}`, m.currency, notional);
    setStamps((p) => [s, ...p].slice(0, 6));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-px border border-rule/20 bg-rule/15 lg:grid-cols-3">
        <div className="bg-background p-6">
          <label className="font-mono-ui block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Select one of the 52 hubs
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-3 w-full border border-rule/25 bg-transparent px-3 py-2.5 text-sm tracking-normal outline-none focus:border-primary"
            >
              {HUBS.map((h) => (
                <option key={h.city} value={h.city}>
                  {h.city} — {h.country} ({meta(h.country).currency})
                </option>
              ))}
            </select>
          </label>

          <label className="font-mono-ui mt-6 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
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
            <span className="font-display tnum mt-1 block text-2xl text-primary">
              ₹{notional.toLocaleString("en-IN")} cr
            </span>
          </label>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => capture("Corridor priced")}
              className="font-mono-ui border border-primary bg-primary px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-primary-foreground"
            >
              Capture live rate
            </button>
            <button
              type="button"
              onClick={() => capture("Intake committed")}
              className="font-mono-ui border border-rule/30 px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary"
            >
              Commit intake on this print
            </button>
          </div>
        </div>

        <div className="bg-background p-6">
          <div className="flex items-center gap-3">
            <Flag iso2={m.iso2} />
            <div>
              <p className="font-display text-3xl leading-none">{hub.city}</p>
              <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {hub.country} · {m.currencyName}
              </p>
            </div>
          </div>
          <p className="font-display tnum mt-6 text-5xl text-primary">
            ₹{spot.toLocaleString("en-IN", { maximumFractionDigits: 4 })}
          </p>
          <p className="font-mono-ui tnum mt-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            1 {m.currency} · {tick === 0 ? "▬ flat" : `${tick > 0 ? "▲" : "▼"} ${Math.abs(tick).toFixed(4)}`} · print #{tape.seq} ·{" "}
            {tape.status === "live" ? `live${tape.anchor ? ` · ${tape.anchor}` : ""}` : tape.status === "loading" ? "syncing" : "indicative"}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{hub.note}</p>
        </div>

        <div className="grid grid-cols-2 gap-px bg-rule/15">
          {[
            ["Route", hub.route],
            ["Treaty", hub.treaty],
            ["s.195 view", hub.wht],
            ["Paper today", `${hub.days} days`],
            ["Net remitted", `₹${(net / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 1 })} cr`],
            [`In ${m.currency}`, fcy.toLocaleString("en-IN", { maximumFractionDigits: 0 })],
          ].map(([k, v], i) => (
            <div key={k} className="bg-background p-5">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
              <p className={`font-display tnum mt-2 text-2xl ${i > 3 ? "text-primary" : ""}`}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      <FxHistory5Y
        code={m.currency}
        spot={spot}
        label={`${hub.city}, ${hub.country} — settlement currency ${m.currency} (${m.currencyName}) against the Indian Rupee`}
      />

      {stamps.length > 0 && (
        <div className="border border-rule/20">
          <p className="font-mono-ui border-b border-rule/15 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-primary">
            Rate stamps captured by treasury actions — written to the ledger
          </p>
          <div className="grid gap-px bg-rule/15 md:grid-cols-2">
            {stamps.map((s) => (
              <div key={`${s.digest}-${s.at}`} className="bg-background p-4">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">{s.action}</p>
                <p className="tnum mt-2 text-sm">
                  1 {s.code} = ₹{s.rate.toFixed(4)} · print #{s.seq} ·{" "}
                  {s.fcy ? `${s.code} ${s.fcy.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                </p>
                <p className="font-mono-ui tnum mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {new Date(s.at).toLocaleTimeString("en-IN")} · digest {s.digest} · {s.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <DeskProcess3D desk="hubs" code={m.currency} />
    </div>
  );
}
