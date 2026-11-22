import type { RatePoint } from "@/lib/fx-risk";

/** Weekly INR-per-unit line; optional live dot at the right edge. */
export function FxSpark({ points, live, w = 120, h = 32, axis = false, label }: { points: RatePoint[]; live?: number | null; w?: number; h?: number; axis?: boolean; label: string }) {
  if (points.length < 2) return <span className="text-xs text-muted-foreground">—</span>;
  const vals = points.map((p) => p.inrPer).concat(live ? [live] : []);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = axis ? { l: 56, r: 14, t: 12, b: 26 } : { l: 2, r: 4, t: 3, b: 3 };
  const X = (i: number) => pad.l + (i / (points.length - 1)) * (w - pad.l - pad.r);
  const Y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (h - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.inrPer).toFixed(1)}`).join("");
  const up = points[points.length - 1]!.inrPer >= points[0]!.inrPer;
  const fmt = (v: number) => (v < 1 ? v.toFixed(4) : v < 10 ? v.toFixed(3) : v.toFixed(2));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={axis ? "100%" : w} height={axis ? undefined : h} role="img" aria-label={label} className={axis ? "w-full" : ""}>
      {axis && [lo, (lo + hi) / 2, hi].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={Y(v)} y2={Y(v)} className="stroke-border" strokeWidth={0.6} />
          <text x={pad.l - 6} y={Y(v) + 3} textAnchor="end" fontSize="10" className="fill-muted-foreground font-mono-ui">₹{fmt(v)}</text>
        </g>
      ))}
      {axis && [0, Math.floor((points.length - 1) / 2), points.length - 1].map((i) => (
        <text key={i} x={X(i)} y={h - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="10" className="fill-muted-foreground font-mono-ui">{points[i]!.date}</text>
      ))}
      <path d={d} fill="none" strokeWidth={axis ? 1.8 : 1.3} className={up ? "stroke-primary" : "stroke-destructive"} />
      {live ? <circle cx={w - pad.r} cy={Y(live)} r={axis ? 4 : 2.4} className="fill-foreground" /> : null}
    </svg>
  );
}
