import { useState } from "react";
import type { Hub } from "@/data/hubs";
import { SCENARIO_HUBS as HUBS, isAfricanBlocHub } from "@/data/hub-catalog";

const W = 1000;
const H = 500;
const project = (lat: number, lng: number) => ({
  x: ((lng + 180) / 360) * W,
  y: ((90 - lat) / 180) * H,
});

const ORIGIN = project(23.16, 72.68); // GIFT City

function arc(hub: Hub) {
  const p = project(hub.lat, hub.lng);
  const mx = (ORIGIN.x + p.x) / 2;
  const my = (ORIGIN.y + p.y) / 2 - Math.abs(p.x - ORIGIN.x) * 0.18 - 12;
  return `M ${ORIGIN.x} ${ORIGIN.y} Q ${mx} ${my} ${p.x} ${p.y}`;
}

export function HubMap() {
  const [active, setActive] = useState<Hub>(HUBS[0]!);

  return (
    <div className="grid gap-px bg-rule/15 lg:grid-cols-[1.65fr_1fr]">
      <div className="bg-background p-4">
        <svg viewBox={`0 ${H * 0.1} ${W} ${H * 0.78}`} className="w-full" role="img" aria-label="Routing map of 52 global and 10 African finance hubs from GIFT City">
          <g stroke="currentColor" className="text-rule/12" strokeWidth={0.5}>
            {Array.from({ length: 11 }, (_, i) => (
              <line key={`h${i}`} x1={0} x2={W} y1={(i * H) / 10} y2={(i * H) / 10} />
            ))}
            {Array.from({ length: 19 }, (_, i) => (
              <line key={`v${i}`} y1={0} y2={H} x1={(i * W) / 18} x2={(i * W) / 18} />
            ))}
          </g>
          {HUBS.map((h) => (
            <path
              key={`a-${h.city}`}
              d={arc(h)}
              fill="none"
              className={
                active.city === h.city ? "stroke-primary" : "stroke-rule/20"
              }
              strokeWidth={active.city === h.city ? 1.6 : 0.5}
            />
          ))}
          {HUBS.map((h) => {
            const p = project(h.lat, h.lng);
            const on = active.city === h.city;
            return (
              <g
                key={h.city}
                onMouseEnter={() => setActive(h)}
                onClick={() => setActive(h)}
                className="cursor-pointer"
              >
                <circle cx={p.x} cy={p.y} r={9} fill="transparent" />
                <rect
                  x={p.x - (on ? 4 : 2.4)}
                  y={p.y - (on ? 4 : 2.4)}
                  width={on ? 8 : 4.8}
                  height={on ? 8 : 4.8}
                  transform={isAfricanBlocHub(h.city) ? `rotate(45 ${p.x} ${p.y})` : undefined}
                  className={on ? "fill-primary" : isAfricanBlocHub(h.city) ? "fill-primary/60" : "fill-rule/45"}
                />
                {on && (
                  <text
                    x={p.x + 9}
                    y={p.y + 3.5}
                    className="fill-foreground font-mono-ui"
                    fontSize={11}
                  >
                    {h.city}
                  </text>
                )}
              </g>
            );
          })}
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r={5} className="fill-primary" />
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r={11} className="fill-none stroke-primary" strokeWidth={0.8} />
        </svg>
      </div>

      <div className="bg-background p-6">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">
          {isAfricanBlocHub(active.city)
            ? `African hub ${String(HUBS.indexOf(active) - 51).padStart(2, "0")} / 10 · SADC/COMESA`
            : `Corridor ${String(HUBS.indexOf(active) + 1).padStart(2, "0")} / 52`}
        </p>
        <h3 className="font-display mt-2 text-4xl">{active.city}</h3>
        <p className="text-sm text-muted-foreground">{active.country}</p>

        <dl className="mt-6 divide-y divide-rule/15 border-y border-rule/15">
          {[
            ["Applicable route", active.route],
            ["Treaty position", active.treaty],
            ["Withholding — s.195 view", active.wht],
            ["Typical clearance today", `${active.days} days`],
            ["On CorpVidesh rail", "9 minutes"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {k}
              </dt>
              <dd className="tnum text-sm font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-5 border-l-2 border-primary pl-3 text-sm leading-relaxed text-muted-foreground">
          {active.note}
        </p>

        <p className="mt-6 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Hover or tap any node · squares: 52 global · diamonds: 10 African. Prototype data — indicative, not advice.
        </p>
      </div>
    </div>
  );
}