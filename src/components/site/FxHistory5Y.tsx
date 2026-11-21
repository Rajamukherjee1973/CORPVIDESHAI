import { useMemo, useState } from "react";
import { fiveYearSeries, fmtMonth, windowed, type FxPoint } from "@/lib/fx-history";

const W = 900;
const H = 300;
const PAD = { l: 56, r: 16, t: 18, b: 26 };

/** Interactive five-year rupee-price history for one hub currency. */
export function FxHistory5Y({ code, spot, label }: { code: string; spot: number; label: string }) {
  const [years, setYears] = useState<1 | 3 | 5>(5);
  const [hover, setHover] = useState<number | null>(null);

  const series = useMemo(() => fiveYearSeries(code, spot), [code, spot]);
  const pts = useMemo(() => windowed(series, years), [series, years]);

  const { min, max } = useMemo(() => {
    const vs = pts.map((p) => p.v);
    const lo = Math.min(...vs);
    const hi = Math.max(...vs);
    const pad = (hi - lo) * 0.12 || hi * 0.02;
    return { min: lo - pad, max: hi + pad };
  }, [pts]);

  const x = (i: number) => PAD.l + (i / Math.max(1, pts.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min || 1)) * (H - PAD.t - PAD.b);

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - PAD.b} L${PAD.l},${H - PAD.b} Z`;

  const winFirst = pts[0]!.v;
  const winChange = ((spot - winFirst) / winFirst) * 100;
  const active: FxPoint | null = hover === null ? null : (pts[hover] ?? null);

  return (
    <div className="border border-rule/20">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule/15 px-5 py-4">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            {code}/INR · {years}-year movement · live tail
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
        <div className="flex gap-px bg-rule/20">
          {([1, 3, 5] as const).map((yy) => (
            <button
              key={yy}
              type="button"
              onClick={() => setYears(yy)}
              className={`font-mono-ui px-4 py-2 text-[10px] uppercase tracking-[0.16em] ${
                years === yy ? "bg-primary text-primary-foreground" : "bg-background hover:text-primary"
              }`}
            >
              {yy}Y
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="img"
          aria-label={`${code} against the Indian Rupee over ${years} years`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (pts.length - 1));
            setHover(Math.min(pts.length - 1, Math.max(0, i)));
          }}
        >
          <defs>
            <linearGradient id={`fxg-${code}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const v = min + (max - min) * (1 - f);
            const yy = PAD.t + f * (H - PAD.t - PAD.b);
            return (
              <g key={f}>
                <line x1={PAD.l} x2={W - PAD.r} y1={yy} y2={yy} stroke="currentColor" strokeOpacity="0.12" />
                <text x={PAD.l - 8} y={yy + 3} textAnchor="end" className="tnum" fontSize="10" fill="currentColor" fillOpacity="0.55">
                  {v.toFixed(v > 50 ? 1 : 3)}
                </text>
              </g>
            );
          })}

          <path d={area} fill={`url(#fxg-${code})`} />
          <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2" />

          {pts.map((p, i) =>
            i % Math.ceil(pts.length / 6) === 0 || i === pts.length - 1 ? (
              <text key={p.t} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.5">
                {fmtMonth(p.t)}
              </text>
            ) : null,
          )}

          <circle cx={x(pts.length - 1)} cy={y(spot)} r="4" fill="var(--primary)" />
          <circle cx={x(pts.length - 1)} cy={y(spot)} r="9" fill="none" stroke="var(--primary)" strokeOpacity="0.4">
            <animate attributeName="r" values="5;13;5" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
          </circle>

          {active && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--primary)" strokeOpacity="0.45" strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(active.v)} r="3.5" fill="var(--primary)" />
            </g>
          )}
        </svg>
      </div>

      <div className="grid gap-px border-t border-rule/15 bg-rule/15 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Reading", active ? `₹${active.v.toFixed(3)}` : `₹${spot.toFixed(3)}`],
          ["At", active ? fmtMonth(active.t) : "Live print"],
          [`${years}Y move`, `${winChange >= 0 ? "+" : ""}${winChange.toFixed(1)}%`],
          ["5Y high", `₹${series.high.v.toFixed(2)}`],
          ["5Y low", `₹${series.low.v.toFixed(2)}`],
          ["Annualised vol", `${series.volPct.toFixed(1)}%`],
        ].map(([k, v]) => (
          <div key={k} className="bg-background px-4 py-3">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
            <p className="font-display tnum mt-1 text-xl">{v}</p>
          </div>
        ))}
      </div>

      <p className="border-t border-rule/15 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">In plain words —</span>{" "}
        the curve shows how many rupees one {code} has cost over the window. The pulsing dot on the
        right is the live streaming print; the treasury desk prices every action off that same print.
        History is a modelled prototype series anchored to the live spot, not a vendor tape.
      </p>
    </div>
  );
}
