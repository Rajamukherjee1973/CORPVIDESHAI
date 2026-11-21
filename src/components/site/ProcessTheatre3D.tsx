import { useEffect, useMemo, useRef, useState } from "react";

export type Stage = {
  label: string;
  actor: string;
  detail: string;
  statute?: string | undefined;
  /** Seconds this stage takes on the rail. */
  secs: number;
};

/**
 * Reusable state-of-the-art process theatre: a perspective 3D rail of stage
 * nodes with a value packet travelling between them, a live FX-priced HUD and
 * a written explanation of the stage on screen. Every desk mounts this so the
 * process is shown, not just described.
 */
export function ProcessTheatre3D({
  title,
  caption,
  stages,
  hud,
  index,
  onIndex,
}: {
  title: string;
  caption: string;
  stages: Stage[];
  /** Live readouts rendered in the theatre HUD, e.g. the FX print. */
  hud?: { k: string; v: string }[];
  /** Controlled active stage. When supplied, the parent owns the index. */
  index?: number;
  onIndex?: (i: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [inner, setInner] = useState(0);
  const [playing, setPlaying] = useState(true);
  const controlled = typeof index === "number";
  const i = Math.min(stages.length - 1, Math.max(0, controlled ? index! : inner));
  const setI = (k: number) => {
    if (!controlled) setInner(k);
    onIndex?.(k);
  };
  const iRef = useRef(0);
  iRef.current = i;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setI((iRef.current + 1) % stages.length), 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, i, stages.length]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t0 = performance.now();

    const draw = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (cv.width !== w * dpr || cv.height !== h * dpr) {
        cv.width = w * dpr;
        cv.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const el = (now - t0) / 1000;

      const cs = getComputedStyle(cv);
      const ink = cs.color || "#111111";
      const hot = cs.getPropertyValue("--cv-accent").trim() || "#D81E05";

      // perspective floor grid
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.08;
      for (let g = 0; g <= 12; g++) {
        const f = g / 12;
        const yy = h * (0.62 + 0.36 * f * f);
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(w, yy);
        ctx.stroke();
      }
      for (let g = 0; g <= 16; g++) {
        const f = g / 16;
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + (f - 0.5) * w * 0.35, h * 0.62);
        ctx.lineTo(w * 0.5 + (f - 0.5) * w * 2.1, h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const n = stages.length;
      const node = (k: number) => {
        const f = n === 1 ? 0.5 : k / (n - 1);
        const depth = 0.55 + 0.45 * Math.sin(f * Math.PI);
        return {
          x: 60 + f * (w - 120),
          y: h * 0.55 - Math.sin(f * Math.PI) * h * 0.16 + Math.sin(el * 1.2 + k) * 2,
          r: 9 + depth * 9,
          depth,
        };
      };

      // rail
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const p = node(k);
        if (k === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // travelled portion
      const active = iRef.current;
      ctx.beginPath();
      for (let k = 0; k <= active; k++) {
        const p = node(k);
        if (k === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = hot;
      ctx.lineWidth = 3;
      ctx.stroke();

      // nodes
      for (let k = 0; k < n; k++) {
        const p = node(k);
        const done = k <= active;
        // cast shadow
        ctx.beginPath();
        ctx.ellipse(p.x, h * 0.9, p.r * 1.5, p.r * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.06;
        ctx.fill();
        ctx.globalAlpha = 1;

        const g = ctx.createRadialGradient(p.x - p.r * 0.4, p.y - p.r * 0.4, 1, p.x, p.y, p.r);
        g.addColorStop(0, done ? hot : ink);
        g.addColorStop(1, done ? "rgba(216,30,5,0.15)" : "rgba(120,120,120,0.10)");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        if (k === active) {
          const pr = p.r + 6 + Math.sin(el * 4) * 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
          ctx.strokeStyle = hot;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        ctx.fillStyle = ink;
        ctx.globalAlpha = k === active ? 0.95 : 0.5;
        ctx.font = "600 10px ui-monospace, monospace";
        ctx.textAlign = "center";
        const lbl = stages[k]!.label.toUpperCase();
        ctx.fillText(lbl.slice(0, 22), p.x, p.y - p.r - 10 + (k % 2 ? -12 : 0));
        ctx.globalAlpha = 1;
      }

      // value packet travelling into the active node
      if (n > 1) {
        const from = node(Math.max(0, active - 1));
        const to = node(active);
        const f = (el % 1.6) / 1.6;
        const px = from.x + (to.x - from.x) * f;
        const py = from.y + (to.y - from.y) * f - Math.sin(f * Math.PI) * 22;
        for (let tr = 0; tr < 6; tr++) {
          const tf = Math.max(0, f - tr * 0.045);
          const tx = from.x + (to.x - from.x) * tf;
          const ty = from.y + (to.y - from.y) * tf - Math.sin(tf * Math.PI) * 22;
          ctx.beginPath();
          ctx.arc(tx, ty, 4 - tr * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = hot;
          ctx.globalAlpha = 0.5 - tr * 0.07;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = hot;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [stages]);

  const elapsed = useMemo(
    () => stages.slice(0, i + 1).reduce((a, s) => a + s.secs, 0),
    [stages, i],
  );
  const total = useMemo(() => stages.reduce((a, s) => a + s.secs, 0), [stages]);
  const s = stages[i]!;

  return (
    <div className="border border-rule/20" style={{ ["--cv-accent" as string]: "#D81E05" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule/15 px-5 py-4">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">{title}</p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{caption}</p>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="font-mono-ui border border-rule/30 px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary"
        >
          {playing ? "Pause simulation" : "Play simulation"}
        </button>
      </div>

      <canvas ref={ref} className="block h-[280px] w-full bg-secondary/40 text-foreground" />

      {hud && hud.length > 0 && (
        <div className="grid gap-px border-t border-rule/15 bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
          {hud.map((x) => (
            <div key={x.k} className="bg-background px-4 py-3">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{x.k}</p>
              <p className="font-display tnum mt-1 text-xl text-primary">{x.v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-px border-t border-rule/15 bg-rule/15">
        {stages.map((st, k) => (
          <button
            key={st.label}
            type="button"
            onClick={() => {
              setI(k);
              setPlaying(false);
            }}
            className={`font-mono-ui flex-1 whitespace-nowrap px-3 py-2 text-[9px] uppercase tracking-[0.14em] ${
              k === i ? "bg-primary text-primary-foreground" : "bg-background hover:text-primary"
            }`}
          >
            {String(k + 1).padStart(2, "0")} {st.label}
          </button>
        ))}
      </div>

      <div className="grid gap-px border-t border-rule/15 bg-rule/15 md:grid-cols-3">
        <div className="bg-background p-5">
          <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Who acts</p>
          <p className="font-display mt-2 text-2xl leading-snug">{s.actor}</p>
          {s.statute && (
            <p className="font-mono-ui mt-3 text-[10px] uppercase tracking-[0.12em] text-primary">{s.statute}</p>
          )}
        </div>
        <div className="bg-background p-5 md:col-span-2">
          <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            What happens at this stage
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
          <p className="font-mono-ui tnum mt-4 text-[10px] uppercase tracking-[0.16em] text-primary">
            Elapsed {elapsed}s of {total}s on the rail · stage cost {s.secs}s
          </p>
        </div>
      </div>
    </div>
  );
}
