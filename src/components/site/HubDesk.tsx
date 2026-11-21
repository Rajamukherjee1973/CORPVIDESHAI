import { useEffect, useMemo, useState } from "react";
import { HUBS } from "@/data/hubs";
import { COUNTRY_META, FALLBACK_RATES } from "@/data/currencies";
import { COMPANIES } from "@/data/companies";

/** Top of the listed universe, streamed as an NSE / BSE tape. */
const TAPE = COMPANIES.slice(0, 40);

const crore = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })} cr`;

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

/** Deterministic opening price so the server and the client agree on first paint. */
function seedPrice(rank: number, netWorth: number) {
  return Math.max(42, Math.round(((netWorth / (rank + 6)) * 7.3) % 4200) + 60);
}

type Tick = { last: number; open: number; dir: 0 | 1 | -1 };

/** Simulated NSE / BSE streaming tape driven by a bounded random walk. */
function useEquityStream(running: boolean, intervalMs: number) {
  const [ticks, setTicks] = useState<Record<string, Tick>>(() =>
    Object.fromEntries(
      TAPE.map((c) => {
        const p = seedPrice(c.rank, c.netWorth);
        return [c.name, { last: p, open: p, dir: 0 } as Tick];
      }),
    ),
  );
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setTicks((old) => {
        const next: Record<string, Tick> = {};
        for (const [k, v] of Object.entries(old)) {
          const drift = (Math.random() - 0.49) * v.open * 0.004;
          const last = Math.max(v.open * 0.9, Math.min(v.open * 1.1, v.last + drift));
          next[k] = { ...v, last, dir: last > v.last ? 1 : last < v.last ? -1 : 0 };
        }
        return next;
      });
      setBeat((b) => b + 1);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [running, intervalMs]);

  return { ticks, beat };
}

type Hub = (typeof HUBS)[number];
type Company = (typeof COMPANIES)[number];

/** The whole statutory + money simulation for one corridor selection. */
function computeSim(company: Company, amount: number, hub: Hub, inrPerUnit: number | null) {
  const ceiling = company.netWorth * 4;
  const total = company.used + amount;
  const utilisation = (total / ceiling) * 100;
  const breach = total > ceiling;
  const whtPct = 0; // investment principal, not a chargeable income payment
  const grossInr = amount * 1e7; // crore → rupees
  const wht = grossInr * (whtPct / 100);
  const netInr = grossInr - wht;
  const credited = inrPerUnit ? netInr / inrPerUnit : null;
  return {
    ceiling,
    total,
    utilisation,
    headroom: ceiling - total,
    route: breach ? ("Approval" as const) : ("Automatic" as const),
    whtPct,
    wht,
    netInr,
    credited,
    minutes: breach ? 41 : 9,
    manualDays: hub.days,
  };
}

/**
 * First-page hub desk: pick any of the 52 hubs from a dropdown, pick a listed
 * counterparty from the NSE / BSE tape, and watch the full statutory
 * simulation recompute against streaming market data and live FX.
 */
export function HubDesk() {
  const [hubCity, setHubCity] = useState(HUBS[0]!.city);
  const [companyName, setCompanyName] = useState(TAPE[0]!.name);
  const [amount, setAmount] = useState(4750);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [feed, setFeed] = useState<"loading" | "live" | "indicative">("loading");
  const [tapeLive, setTapeLive] = useState(true);
  const [tapeMs, setTapeMs] = useState(1400);
  const [compare, setCompare] = useState(false);
  const [hubCityB, setHubCityB] = useState(HUBS[1]?.city ?? HUBS[0]!.city);
  const { ticks, beat } = useEquityStream(tapeLive, tapeMs);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/INR");
        const d = (await r.json()) as { rates?: Record<string, number> };
        if (!alive || !d.rates) throw new Error("feed");
        setRates({ ...FALLBACK_RATES, ...d.rates });
        setFeed("live");
      } catch {
        if (alive) setFeed((s) => (s === "live" ? "live" : "indicative"));
      }
    };
    void pull();
    const id = window.setInterval(pull, 60_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const hub = HUBS.find((h) => h.city === hubCity) ?? HUBS[0]!;
  const meta = COUNTRY_META[hub.country] ?? { iso2: "UN", currency: "USD", currencyName: "US Dollar" };
  const company = COMPANIES.find((c) => c.name === companyName) ?? TAPE[0]!;
  const tick = ticks[company.name];

  const perInr = rates[meta.currency];
  const inrPerUnit = perInr ? 1 / perInr : null;

  const hubB = HUBS.find((h) => h.city === hubCityB) ?? HUBS[0]!;
  const metaB = COUNTRY_META[hubB.country] ?? { iso2: "UN", currency: "USD", currencyName: "US Dollar" };
  const perInrB = rates[metaB.currency];
  const inrPerUnitB = perInrB ? 1 / perInrB : null;
  const simB = useMemo(
    () => computeSim(company, amount, hubB, inrPerUnitB),
    [company, amount, hubB, inrPerUnitB],
  );

  const sim = useMemo(
    () => computeSim(company, amount, hub, inrPerUnit),
    [company, amount, hub, inrPerUnit],
  );

  const stages = [
    { t: "00:00", s: "Treasury submits net worth, prior commitment and this proposal" },
    { t: "00:11", s: `Rule 7 ceiling tested — ${sim.utilisation.toFixed(1)}% of 400% of net worth` },
    { t: "00:38", s: `Route determined: ${sim.route} · corridor ${hub.city}` },
    { t: "01:24", s: "Investment principal: no generic withholding; separate chargeable income needs treaty review" },
    { t: "02:47", s: "Six regulators read the same packet in parallel at GIFT IFSC" },
    {
      t: sim.route === "Approval" ? "41:00" : "09:00",
      s: `Cleared and priced in ${meta.currency} — manual comparison ${sim.manualDays} days`,
    },
  ];

  return (
    <div className="border border-rule/25">
      <style>{`@keyframes cv-tape{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>

      {/* streaming NSE / BSE tape */}
      <div className="overflow-hidden border-b border-rule/15 bg-primary py-2.5 text-primary-foreground">
        <div className="flex w-max gap-7 whitespace-nowrap" style={{ animation: "cv-tape 120s linear infinite" }}>
          {[...TAPE, ...TAPE].map((c, i) => {
            const tk = ticks[c.name]!;
            const chg = ((tk.last - tk.open) / tk.open) * 100;
            return (
              <span key={`${c.name}-${i}`} className="flex items-center gap-2 text-[12px]">
                <span className="font-mono-ui tracking-[0.1em] opacity-70">
                  {c.exchange.includes("NSE") ? "NSE" : "BSE"}
                </span>
                <span className="font-mono-ui tracking-[0.08em]">
                  {c.name.slice(0, 22).toUpperCase()}
                </span>
                <span className="tnum font-medium">₹{tk.last.toFixed(2)}</span>
                <span className={`tnum text-[11px] ${chg < 0 ? "opacity-60" : "opacity-95"}`}>
                  {chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* tape controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-rule/15 px-4 py-2.5">
        <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          NSE / BSE tape
        </span>
        <button
          type="button"
          onClick={() => setTapeLive((v) => !v)}
          aria-pressed={tapeLive}
          className="font-mono-ui border border-primary px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-primary"
        >
          {tapeLive ? "Stop stream" : "Start stream"}
        </button>
        <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          Refresh every
        </span>
        {[500, 1400, 3000, 10000].map((ms) => (
          <button
            key={ms}
            type="button"
            onClick={() => setTapeMs(ms)}
            aria-pressed={tapeMs === ms}
            className={`font-mono-ui border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${
              tapeMs === ms ? "border-primary text-primary" : "border-rule/30 text-muted-foreground"
            }`}
          >
            {ms < 1000 ? `${ms} ms` : `${ms / 1000} s`}
          </button>
        ))}
        <span className="tnum font-mono-ui ml-auto text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {tapeLive ? "streaming" : "frozen"} · tick {beat}
        </span>
      </div>

      {/* selectors */}
      <div className="grid gap-px border-b border-rule/15 bg-rule/15 md:grid-cols-3">
        <label className="bg-background p-4">
          <span className="font-mono-ui block text-[10px] uppercase tracking-[0.16em] text-primary">
            Target hub — all 52 corridors
          </span>
          <span className="mt-2 flex items-center gap-2">
            <Flag iso2={meta.iso2} />
            <select
              value={hubCity}
              onChange={(e) => setHubCity(e.target.value)}
              className="font-mono-ui w-full border border-rule/30 bg-background px-2 py-2 text-[12px] tracking-[0.06em]"
            >
              {HUBS.map((h) => (
                <option key={h.city} value={h.city}>
                  {h.city} · {h.country}
                </option>
              ))}
            </select>
          </span>
          <span className="mt-2 block text-xs text-muted-foreground">
            {meta.currency} · {meta.currencyName} ·{" "}
            {inrPerUnit ? `₹${inrPerUnit.toLocaleString("en-IN", { maximumFractionDigits: 4 })}` : "—"} per unit
          </span>
        </label>

        <label className="bg-background p-4">
          <span className="font-mono-ui block text-[10px] uppercase tracking-[0.16em] text-primary">
            Filing entity — NSE / BSE listed
          </span>
          <select
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="font-mono-ui mt-2 w-full border border-rule/30 bg-background px-2 py-2 text-[12px] tracking-[0.06em]"
          >
            {TAPE.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} · {c.exchange}
              </option>
            ))}
          </select>
          <span className="mt-2 block text-xs text-muted-foreground">
            Last traded ₹{tick ? tick.last.toFixed(2) : "—"} · net worth {crore(company.netWorth)} · tick {beat}
          </span>
        </label>

        <label className="bg-background p-4">
          <span className="font-mono-ui block text-[10px] uppercase tracking-[0.16em] text-primary">
            Proposed remittance (₹ crore)
          </span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
            className="font-mono-ui mt-2 w-full border border-rule/30 bg-background px-2 py-2 text-[12px]"
          />
          <span className="mt-2 block text-xs text-muted-foreground">
            Feed: {feed === "live" ? "live FX" : feed === "loading" ? "syncing" : "indicative FX"} · equity tape
            simulated for demonstration
          </span>
        </label>
      </div>

      {/* simulation output */}
      <div className="grid gap-px bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Route determined", sim.route],
          ["Ceiling utilisation", `${sim.utilisation.toFixed(1)}%`],
          ["Headroom left", crore(Math.round(sim.headroom))],
          [
            `Credited in ${hub.city}`,
            sim.credited
              ? `${meta.currency} ${sim.credited.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
              : "—",
          ],
        ].map(([k, v]) => (
          <div key={k} className="bg-background p-4">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
            <p className="mt-1.5 font-display text-2xl tracking-tight text-primary">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-px border-t border-rule/15 bg-rule/15 lg:grid-cols-2">
        <div className="bg-background p-5">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Clearance simulation
          </p>
          <ul className="mt-3 space-y-2">
            {stages.map((s) => (
              <li key={s.t} className="flex gap-3 border-b border-rule/12 pb-2 text-sm">
                <span className="font-mono-ui w-14 shrink-0 text-[11px] text-primary">{s.t}</span>
                <span className="text-muted-foreground">{s.s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-background p-5">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Corridor and money detail
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              ["Corridor route class", hub.route],
              ["Treaty basis", hub.treaty],
              ["Withholding priced", `${sim.whtPct}%`],
              ["Tax withheld", crore(Math.round(sim.wht / 1e7))],
              ["Net remitted", crore(Math.round(sim.netInr / 1e7))],
              ["Manual benchmark", `${sim.manualDays} days`],
              ["CorpVidesh clearance", `${sim.minutes} minutes`],
              ["Prior commitment", crore(company.used)],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-rule/12 pb-1.5">
                <dt className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{k}</dt>
                <dd className="text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{hub.note}</p>
        </div>
      </div>

      {/* scenario compare mode */}
      <div className="border-t border-rule/15">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setCompare((v) => !v)}
            aria-pressed={compare}
            className="font-mono-ui bg-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-primary-foreground"
          >
            {compare ? "Close compare mode" : "Compare two hubs"}
          </button>
          {compare && (
            <label className="flex items-center gap-2">
              <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Scenario B hub
              </span>
              <Flag iso2={metaB.iso2} />
              <select
                value={hubCityB}
                onChange={(e) => setHubCityB(e.target.value)}
                className="font-mono-ui border border-rule/30 bg-background px-2 py-1.5 text-[12px] tracking-[0.06em]"
              >
                {HUBS.map((h) => (
                  <option key={h.city} value={h.city}>
                    {h.city} · {h.country}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span className="font-mono-ui ml-auto text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Same filer, same amount — only the corridor changes
          </span>
        </div>

        {compare && (
          <div className="overflow-x-auto border-t border-rule/15">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-rule/[0.04]">
                  {["Measure", `A · ${hub.city}`, `B · ${hubB.city}`, "Delta (B − A)"].map((h) => (
                    <th
                      key={h}
                      className="font-mono-ui border-b border-rule/20 px-4 py-2 text-left text-[9px] uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows(hub, hubB, meta.currency, metaB.currency, sim, simB).map((r) => (
                  <tr key={r.k}>
                    <td className="border-b border-rule/12 px-4 py-2.5 text-muted-foreground">{r.k}</td>
                    <td className="tnum border-b border-rule/12 px-4 py-2.5">{r.a}</td>
                    <td className="tnum border-b border-rule/12 px-4 py-2.5">{r.b}</td>
                    <td
                      className={`tnum border-b border-rule/12 px-4 py-2.5 ${
                        r.changed ? "font-medium text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {r.d}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-mono-ui mr-2 text-[9px] uppercase tracking-[0.16em] text-primary">
                In plain words
              </span>
              Both columns send the same rupees from the same company. The difference is only the
              treaty and the corridor: it changes how much tax is held back in India, how much
              actually lands abroad, and how long a manual clearance would have taken.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

type Sim = ReturnType<typeof computeSim>;

function compareRows(a: Hub, b: Hub, ccyA: string, ccyB: string, sa: Sim, sb: Sim) {
  const signed = (n: number, unit: string, digits = 0) =>
    `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: digits })} ${unit}`;
  const whtCrA = sa.wht / 1e7;
  const whtCrB = sb.wht / 1e7;
  return [
    { k: "Treaty basis", a: a.treaty, b: b.treaty, d: a.treaty === b.treaty ? "same" : "different treaty", changed: a.treaty !== b.treaty },
    { k: "Route class", a: a.route, b: b.route, d: a.route === b.route ? "same" : "different class", changed: a.route !== b.route },
    { k: "Withholding rate", a: `${sa.whtPct}%`, b: `${sb.whtPct}%`, d: signed(sb.whtPct - sa.whtPct, "pp", 2), changed: sa.whtPct !== sb.whtPct },
    { k: "Tax withheld in India", a: crore(Math.round(whtCrA)), b: crore(Math.round(whtCrB)), d: signed(Math.round(whtCrB - whtCrA), "cr"), changed: Math.round(whtCrA) !== Math.round(whtCrB) },
    { k: "Net remitted", a: crore(Math.round(sa.netInr / 1e7)), b: crore(Math.round(sb.netInr / 1e7)), d: signed(Math.round((sb.netInr - sa.netInr) / 1e7), "cr"), changed: sa.netInr !== sb.netInr },
    {
      k: "Credited abroad",
      a: sa.credited ? `${ccyA} ${sa.credited.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—",
      b: sb.credited ? `${ccyB} ${sb.credited.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—",
      d: ccyA === ccyB && sa.credited && sb.credited ? signed(sb.credited - sa.credited, ccyB) : "different currency",
      changed: true,
    },
    { k: "CorpVidesh clearance", a: `${sa.minutes} min`, b: `${sb.minutes} min`, d: signed(sb.minutes - sa.minutes, "min"), changed: sa.minutes !== sb.minutes },
    { k: "Manual benchmark", a: `${sa.manualDays} days`, b: `${sb.manualDays} days`, d: signed(sb.manualDays - sa.manualDays, "days"), changed: sa.manualDays !== sb.manualDays },
    { k: "Ceiling utilisation", a: `${sa.utilisation.toFixed(1)}%`, b: `${sb.utilisation.toFixed(1)}%`, d: signed(sb.utilisation - sa.utilisation, "pp", 1), changed: false },
  ];
}
