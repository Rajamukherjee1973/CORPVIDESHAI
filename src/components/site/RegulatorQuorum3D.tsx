import { useEffect, useRef } from "react";
import type { LaneProgress } from "@/lib/quorum";

type Props = {
  lanes: LaneProgress[];
  running: boolean;
  /** Rail seconds elapsed since dispatch. */
  elapsed: number;
  /** Code of the lane the console currently has open, highlighted in the ring. */
  focus?: string | undefined;
  height?: number | undefined;
};

const RED = "#d81e05";
const INK = "#111111";

/**
 * Pure-canvas 3D quorum ring: the append-only ledger core sits at the centre
 * and the six regulator nodes orbit it. When a lane's queue is executing, work
 * packets travel out to that node and the signed result travels back — all six
 * lanes at once, which is the whole point of the parallel window.
 */
export function RegulatorQuorum3D({ lanes, running, elapsed, focus, height = 420 }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const live = useRef({ lanes, running, elapsed, focus });
  live.current = { lanes, running, elapsed, focus };

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let spin = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { lanes: ls, running: run, elapsed: el, focus: fc } = live.current;
      spin += dt * (run ? 0.5 : 0.16);

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (cv.width !== w * dpr || cv.height !== h * dpr) {
        cv.width = w * dpr;
        cv.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.52;
      const R = Math.min(w * 0.30, h * 0.34);
      const tilt = 0.55;

      // ledger plane
      for (let r = 1; r <= 5; r++) {
        ctx.strokeStyle = `rgba(17,17,17,${0.1 - r * 0.012})`;
        ctx.lineWidth = r === 4 ? 1.4 : 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, (R * r) / 4, (R * r * tilt) / 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // hash-chain blocks drifting on the ledger plane — the append-only record
      const blocks = 26;
      for (let i = 0; i < blocks; i++) {
        const a = -spin * 0.55 + (i / blocks) * Math.PI * 2;
        const rr = R * 1.16;
        const bx = cx + Math.cos(a) * rr;
        const by = cy + Math.sin(a) * rr * tilt;
        const dep = (Math.sin(a) + 1) / 2;
        const bs = 2.4 + dep * 2.6;
        ctx.globalAlpha = 0.12 + dep * 0.42;
        ctx.fillStyle = i % 4 === 0 ? RED : INK;
        ctx.fillRect(bx - bs / 2, by - bs / 2, bs, bs);
        ctx.globalAlpha = 1;
      }

      const n = Math.max(1, ls.length);
      const pos = ls.map((lp, i) => {
        const a = spin + (i / n) * Math.PI * 2;
        const x = cx + Math.cos(a) * R;
        const y = cy + Math.sin(a) * R * tilt;
        const depth = (Math.sin(a) + 1) / 2; // 0 back → 1 front
        return { lp, x, y, d: 0.72 + depth * 0.5, a };
      });
      pos.sort((p, q) => p.d - q.d);

      // spokes + packets
      for (const p of pos) {
        const done = p.lp.done;
        const act = p.lp.active;
        ctx.strokeStyle = done ? RED : act ? "rgba(216,30,5,0.45)" : "rgba(17,17,17,0.14)";
        ctx.lineWidth = done ? 2 : act ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        if (act || done) {
          const count = act ? 3 : 1;
          for (let k = 0; k < count; k++) {
            const f = ((spin * 0.9 + k / count) % 1);
            const t = done ? 1 - f : f;
            const px = cx + (p.x - cx) * t;
            const py = cy + (p.y - cy) * t;
            const s = 6 * p.d;
            ctx.globalAlpha = 0.35 + 0.65 * (1 - Math.abs(0.5 - t) * 2);
            ctx.fillStyle = RED;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(spin * 2 + k);
            ctx.fillRect(-s / 2, -s / 2, s, s);
            ctx.restore();
            ctx.globalAlpha = 1;
          }
        }
      }

      // ledger core
      const pulse = 1 + Math.sin(spin * 4) * (run ? 0.12 : 0.04);
      ctx.fillStyle = "rgba(216,30,5,0.10)";
      ctx.beginPath();
      ctx.arc(cx, cy, 34 * pulse, 0, Math.PI * 2);
      ctx.fill();
      const core = ctx.createRadialGradient(cx - 6, cy - 7, 2, cx, cy, 18);
      core.addColorStop(0, "#ff7a63");
      core.addColorStop(1, RED);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, 15 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(216,30,5,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 26 + Math.sin(spin * 3) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.textAlign = "center";

      // regulator nodes
      for (const p of pos) {
        const lp = p.lp;
        const isFocus = fc === lp.lane.code;
        const r = 15 * p.d * (isFocus ? 1.25 : 1);
        if (lp.active || isFocus) {
          ctx.fillStyle = "rgba(216,30,5,0.12)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        const sph = ctx.createRadialGradient(
          p.x - r * 0.38,
          p.y - r * 0.42,
          r * 0.12,
          p.x,
          p.y,
          r,
        );
        if (lp.done) {
          sph.addColorStop(0, "#ff6a52");
          sph.addColorStop(1, RED);
        } else {
          sph.addColorStop(0, "#ffffff");
          sph.addColorStop(1, lp.active ? "rgba(216,30,5,0.16)" : "rgba(17,17,17,0.05)");
        }
        ctx.fillStyle = sph;
        ctx.fill();
        ctx.strokeStyle = RED;
        ctx.lineWidth = isFocus ? 2.4 : 1.4;
        ctx.stroke();

        // queue arc
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lp.progress);
        ctx.strokeStyle = RED;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = lp.done ? "#ffffff" : RED;
        ctx.font = `600 ${Math.round(9 * p.d)}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.fillText(lp.lane.code.slice(0, 5), p.x, p.y + 3 * p.d);

        // labels pushed radially outward so they never sit over the core
        const ux = Math.cos(p.a);
        const uy = Math.sin(p.a);
        const lx = Math.max(70, Math.min(w - 70, p.x + ux * 46));
        const vertical = Math.abs(ux) <= 0.35;
        const ly = vertical ? p.y + (uy > 0 ? r + 34 : -(r + 30)) : p.y + uy * 26 * tilt;
        ctx.textAlign = ux > 0.35 ? "left" : ux < -0.35 ? "right" : "center";
        const tx = ux > 0.35 ? lx + 6 : ux < -0.35 ? lx - 6 : lx;
        ctx.fillStyle = INK;
        ctx.font = `600 ${Math.round(10 * p.d)}px ui-sans-serif, system-ui`;
        ctx.fillText(lp.lane.scope.slice(0, 30), tx, ly - r * 0.2);
        ctx.fillStyle = "rgba(17,17,17,0.55)";
        ctx.font = `${Math.round(9 * p.d)}px ui-monospace, monospace`;
        ctx.fillText(
          `${lp.cleared}/${lp.lane.items.length} · ${lp.done ? "signed" : lp.active ? "in queue" : "waiting"}`,
          tx,
          ly + 12,
        );
        ctx.textAlign = "center";
      }

      // HUD
      const signed = ls.filter((l) => l.done).length;
      ctx.textAlign = "left";
      ctx.fillStyle = RED;
      ctx.font = "600 11px ui-monospace, monospace";
      ctx.fillText(`QUORUM ${signed}/${ls.length}`, 14, 22);
      ctx.fillStyle = INK;
      ctx.fillText(`T+${el.toFixed(1)}s SINCE DISPATCH`, 14, 38);
      ctx.fillStyle = "rgba(17,17,17,0.55)";
      ctx.fillText("ONE APPEND-ONLY LEDGER · " + (run ? "PARALLEL WINDOW OPEN" : signed === ls.length ? "ALL DESKS SIGNED" : "HELD"), 14, 54);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      className="block w-full"
      style={{ height }}
      role="img"
      aria-label="Three-dimensional simulation of six Indian regulators reading one append-only ledger in parallel and signing their own queue"
    />
  );
}
