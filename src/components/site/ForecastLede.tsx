"use client";

/**
 * ForecastLede — every desk now opens with a forecast and a recommended
 * action instead of a table. The lede runs the same deterministic prediction
 * model the folded prediction surface uses, on a live reference corridor, and
 * shows only the forecasts that matter to the desk it sits on.
 */

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { HUBS } from "@/data/hubs";
import { findHub } from "@/data/hub-catalog";
import { COUNTRY_META } from "@/data/currencies";
import { forecastAll, verdict, type Forecast, type RouteKind } from "@/lib/predict";
import { inrPer, useLiveFeed } from "@/lib/live-feed";

type Props = {
  /** Desk label, used in the reference line. */
  desk: string;
  /** Forecast ids to surface, in order. */
  focus: string[];
  /** Reference corridor city. */
  hubCity?: string;
  notionalCr?: number;
  route?: RouteKind;
  docsReady?: number;
  section195?: boolean;
  firstTimeFiler?: boolean;
  netWorthCr?: number;
  committedCr?: number;
};

const SEV: Record<Forecast["severity"], string> = {
  act: "bg-primary text-primary-foreground",
  watch: "border border-primary text-primary",
  clear: "border border-rule/30 text-muted-foreground",
};

function fmt(v: number, unit: string) {
  if (unit === "min") {
    if (v < 90) return `${v} min`;
    const h = v / 60;
    return h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`;
  }
  return `${v.toLocaleString("en-IN")} ${unit}`;
}

export function ForecastLede({
  desk,
  focus,
  hubCity = "Singapore",
  notionalCr = 475,
  route = "ODI",
  docsReady = 78,
  section195 = true,
  firstTimeFiler = false,
  netWorthCr = 42000,
  committedCr = 9800,
}: Props) {
  const feed = useLiveFeed();
  const hub = useMemo(() => findHub(hubCity) ?? HUBS[0], [hubCity]);
  const code = hub ? COUNTRY_META[hub.country]?.currency ?? "USD" : "USD";
  const rate = inrPer(feed, code);

  const all = useMemo(
    () =>
      hub ? forecastAll(
        {
          hub,
          notionalCr,
          route,
          docsReady,
          firstTimeFiler,
          section195,
          rateNow: rate,
          rateRef: rate ? rate * 0.994 : null,
          netWorthCr,
          committedCr,
        },
        code,
      ) : [],
    [hub, notionalCr, route, docsReady, firstTimeFiler, section195, rate, code, netWorthCr, committedCr],
  );

  const shown = focus
    .map((id) => all.find((f) => f.id === id))
    .filter((f): f is Forecast => Boolean(f));
  const list = shown.length ? shown : all.slice(0, 2);
  const v = verdict(list);
  const lead = list[0];
  if (!hub || !lead) return null;

  return (
    <div className="border border-rule/40 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/40 bg-primary px-6 py-3 text-primary-foreground">
        <p className="text-[11px] uppercase tracking-[0.22em]">
          Forecast first — {desk}
        </p>
        <p className="text-[11px] uppercase tracking-[0.18em] opacity-90">
          {hub.city} · {code} · ₹{notionalCr.toLocaleString("en-IN")} cr · {route}
          {rate ? ` · live ₹${rate.toFixed(3)}` : " · tape reconnecting"}
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
        <div className="border-b border-rule/40 p-6 lg:border-b-0 lg:border-r">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {lead.label}
          </p>
          <p className="font-display mt-2 text-3xl leading-snug lg:text-4xl">{lead.headline}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.16em]">
            <span className={`px-2 py-1 ${SEV[lead.severity]}`}>{lead.severity}</span>
            <span className="text-muted-foreground">
              p50 {fmt(lead.p50, lead.unit)} · p90 {fmt(lead.p90, lead.unit)}
            </span>
            <span className="text-muted-foreground">
              confidence {(lead.confidence * 100).toFixed(0)}%
            </span>
            <span className="text-muted-foreground">
              manual desk {fmt(lead.legacy, lead.unit)}
            </span>
          </div>

          <div className="mt-6 border-l-2 border-primary pl-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary">
              Recommended action
            </p>
            <p className="mt-1 text-lg leading-snug">{lead.action.do}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lead.action.why}</p>
            <p className="mt-2 text-sm leading-relaxed">{lead.action.then}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            {lead.drivers.map((d) => (
              <span key={d.k}>
                <span className="uppercase tracking-[0.16em]">{d.k}</span> {d.v}
              </span>
            ))}
          </div>
        </div>

        <div className="p-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Also forecast on this desk
          </p>
          <ul className="mt-3 divide-y divide-rule/30">
            {list.slice(1).map((f) => (
              <li key={f.id} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm leading-snug">{f.headline}</p>
                  <span className={`shrink-0 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${SEV[f.severity]}`}>
                    {f.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  p50 {fmt(f.p50, f.unit)} · p90 {fmt(f.p90, f.unit)} — {f.action.do}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-rule/40 pt-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Verdict
            </p>
            <p className="mt-1 text-sm leading-relaxed">{v.line}</p>
            <Link
              to="/intelligence"
              className="mt-3 inline-block border border-primary px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Open the prediction surface
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
