"use client";

/**
 * The prediction surface — one desk that replaces the three reporting desks.
 *
 * The FX tape, the hub board and the corridor pricing ledger each used to
 * present a table. Folded together here they produce a forward view: for one
 * entity, one corridor and one ticket, the rail forecasts clearance, cost,
 * currency drift, query risk and statutory headroom, and opens each with the
 * action that most improves it.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HUBS } from "@/data/hubs";
import { findHub } from "@/data/hub-catalog";
import { HubOptions } from "./HubOptions";
import { COUNTRY_META } from "@/data/currencies";
import { findListed, LISTED_1000, NETWORTH_FY } from "@/data/listed";
import { CompanyPicker } from "@/components/site/CompanyPicker";
import { forecastAll, verdict, type Forecast, type RouteKind } from "@/lib/predict";
import { inrPer, useLiveFeed } from "@/lib/live-feed";
import { recordCapture, setFxPageContext } from "@/lib/fx-stream";
import { assertFact } from "@/lib/agents/memory";
import { CurrencyOutlookAgent } from "@/components/site/CurrencyOutlookAgent";
import { useTreasuryFocus } from "@/lib/treasury-focus";
import { useTreasuryScenario } from "@/lib/treasury-scenario";

const SEV: Record<Forecast["severity"], { chip: string; word: string }> = {
  act: { chip: "bg-primary text-primary-foreground", word: "Act" },
  watch: { chip: "border border-primary text-primary", word: "Watch" },
  clear: { chip: "border border-rule/30 text-muted-foreground", word: "Clear" },
};

function fmt(v: number, unit: string) {
  if (unit === "min") {
    if (v < 90) return `${v} min`;
    const h = v / 60;
    return h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`;
  }
  return `${v.toLocaleString("en-IN")} ${unit}`;
}

export function PredictionSurface() {
  const feed = useLiveFeed();
  const [entity, setEntity] = useTreasuryFocus();
  const [scenario, setScenario] = useTreasuryScenario();
  const hubCity = scenario.hub;
  const setHubCity = (hub: string) => setScenario({ hub });
  const notional = scenario.amountCr;
  const setNotional = (amountCr: number) => setScenario({ amountCr });
  const [route, setRoute] = useState<RouteKind>("ODI");
  useEffect(() => { setRoute(scenario.purpose.startsWith("OPI") ? "OPI" : "ODI"); }, [scenario.purpose]);
  const [docs, setDocs] = useState(78);
  const [firstTime, setFirstTime] = useState(false);
  const [s195, setS195] = useState(true);

  const hub = useMemo(() => findHub(hubCity) ?? HUBS[0]!, [hubCity]);
  const code = COUNTRY_META[hub.country]?.currency ?? "USD";
  const rate = inrPer(feed, code);
  const company = findListed(entity);

  const forecasts = useMemo(
    () =>
      forecastAll(
        {
          hub,
          notionalCr: notional,
          route,
          docsReady: docs,
          firstTimeFiler: firstTime,
          section195: s195,
          rateNow: rate,
          rateRef: rate ? rate * 0.9968 : null,
          netWorthCr: company?.netWorth ?? null,
          committedCr: company?.used ?? null,
        },
        code,
      ),
    [hub, notional, route, docs, firstTime, s195, rate, company, code],
  );

  const v = verdict(forecasts);

  useEffect(() => {
    setFxPageContext({ desk: "Prediction surface", code, crore: notional });
  }, [code, notional]);

  useEffect(() => {
    if (!company) return;
    assertFact("entity", company.name, "prediction surface");
    assertFact("net_worth_cr", String(company.netWorth), NETWORTH_FY);
  }, [company]);

  useEffect(() => {
    assertFact("corridor", `${hub.city} · ${code} · ${route}`, "prediction surface");
  }, [hub.city, code, route]);

  return (
    <div className="border border-rule/20">
      {/* ---------------- verdict band ---------------- */}
      <div className="border-b border-rule/20 bg-primary px-6 py-6 text-primary-foreground">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] opacity-80">
          Forecast · not a report
        </p>
        <p className="font-display mt-2 text-3xl leading-tight lg:text-4xl">{v.line}</p>
        <p className="font-mono-ui mt-3 text-[11px] uppercase tracking-[0.14em] opacity-80">
          {company?.name ?? entity} → {hub.city} · ₹{notional.toLocaleString("en-IN")} cr ·{" "}
          {rate ? `₹${rate.toFixed(4)}/${code} live` : `${code} — tape connecting`}
        </p>
      </div>

      {/* ---------------- inputs ---------------- */}
      <div className="grid gap-px border-b border-rule/20 bg-rule/15 lg:grid-cols-4">
        <div className="bg-background p-5 lg:col-span-2">
          <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Indian party
          </p>
          <div className="mt-2">
            <CompanyPicker value={entity} onChange={setEntity} />
          </div>
          {company ? (
            <p className="font-mono-ui tnum mt-3 text-[11px] text-muted-foreground">
              Audited net worth ₹{company.netWorth.toLocaleString("en-IN")} cr · {NETWORTH_FY} ·
              commitment outstanding ₹{company.used.toLocaleString("en-IN")} cr
            </p>
          ) : null}
        </div>

        <div className="bg-background p-5">
          <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Destination hub
          </p>
          <select
            value={hubCity}
            onChange={(e) => setHubCity(e.target.value)}
            className="font-mono-ui mt-2 w-full border border-rule/25 bg-background px-3 py-2 text-xs"
          >
            <HubOptions withCurrency />
          </select>
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value as RouteKind)}
            className="font-mono-ui mt-2 w-full border border-rule/25 bg-background px-3 py-2 text-xs"
          >
            <option value="ODI">ODI — automatic route</option>
            <option value="OPI">OPI — automatic route</option>
            <option value="Approval">Approval route — RBI sanction</option>
          </select>
        </div>

        <div className="bg-background p-5">
          <label className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Ticket ₹{notional.toLocaleString("en-IN")} cr
          </label>
          <input
            type="range"
            min={5}
            max={5000}
            step={5}
            value={notional}
            onChange={(e) => setNotional(Number(e.target.value))}
            className="mt-2 w-full accent-[hsl(var(--primary))]"
          />
          <label className="font-mono-ui mt-4 block text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Evidence pack {docs}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={docs}
            onChange={(e) => setDocs(Number(e.target.value))}
            className="mt-2 w-full accent-[hsl(var(--primary))]"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFirstTime((x) => !x)}
              className={`font-mono-ui border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${firstTime ? "border-primary text-primary" : "border-rule/25 text-muted-foreground"}`}
            >
              First-time filer
            </button>
            <button
              type="button"
              onClick={() => setS195((x) => !x)}
              className={`font-mono-ui border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${s195 ? "border-primary text-primary" : "border-rule/25 text-muted-foreground"}`}
            >
              Section 195
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- forecasts ---------------- */}
      <div className="grid gap-px bg-rule/15 lg:grid-cols-2">
        {forecasts.map((f) => (
          <article key={f.id} className="bg-background p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  {f.label}
                </p>
                <p className="font-display mt-2 max-w-md text-xl leading-snug">{f.headline}</p>
              </div>
              <span
                className={`font-mono-ui shrink-0 px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${SEV[f.severity].chip}`}
              >
                {SEV[f.severity].word}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-px bg-rule/15">
              <div className="bg-background p-3">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  p50
                </p>
                <p className="font-display tnum mt-1 text-2xl text-primary">
                  {fmt(f.p50, f.unit)}
                </p>
              </div>
              <div className="bg-background p-3">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  p90
                </p>
                <p className="font-display tnum mt-1 text-2xl">{fmt(f.p90, f.unit)}</p>
              </div>
              <div className="bg-background p-3">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  Manual desk
                </p>
                <p className="font-display tnum mt-1 text-2xl text-muted-foreground">
                  {fmt(f.legacy, f.unit)}
                </p>
              </div>
            </div>

            <div className="mt-5 border-l-2 border-primary pl-4">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
                Recommended action
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed">{f.action.do}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.action.why}</p>
              <p className="font-mono-ui mt-2 text-[10px] uppercase tracking-[0.12em] text-primary">
                Then → {f.action.then}
              </p>
            </div>

            <dl className="mt-5 grid gap-1 border-t border-rule/15 pt-3 sm:grid-cols-2">
              {f.drivers.map((d) => (
                <div key={d.k} className="flex justify-between gap-3 text-[11px]">
                  <dt className="text-muted-foreground">{d.k}</dt>
                  <dd className="tnum text-right">{d.v}</dd>
                </div>
              ))}
            </dl>
            <p className="font-mono-ui mt-3 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Model confidence {(f.confidence * 100).toFixed(0)}%
            </p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule/20 px-6 py-4">
        <p className="text-xs text-muted-foreground">
          Priced off the same live tape that stamps the ledger — {feed.status === "live" ? `${feed.source} · ${feed.stamp}` : "tape connecting"}.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              recordCapture("Prediction surface", "action", `${hub.city} ${route} forecast stamped`, code, notional)
            }
            className="font-mono-ui bg-primary px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-primary-foreground"
          >
            Stamp forecast to ledger
          </button>
          <Link
            to="/ledger"
            className="font-mono-ui border border-rule/30 px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary"
          >
            Open the priced ledger
          </Link>
        </div>
      </div>
      <div className="px-6"><CurrencyOutlookAgent corridorCode={code} /></div>
    </div>
  );
}
