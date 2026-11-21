import { useEffect, useRef } from "react";

export type FlowNode = { key: string; label: string; sub: string };

type Props = {
  /** 0 → 1 across the whole settlement. */
  progress: number;
  running: boolean;
  nodes: FlowNode[];
  amountLabel: string;
  creditLabel: string;
  /** Index of the leg currently executing. */
  legIndex: number;
};

type V3 = { x: number; y: number; z: number };

const RED = "#d81e05";
const INK = "#111111";

/**
 * Pure-canvas 3D corridor: the money leaves the Indian party, is carried by the
 * AD Category-I bank through the statutory rail and lands in the overseas bank.
 * Nodes sit on a 3D arc; the camera orbits; value packets travel leg by leg.
 */
export function MoneyFlow3D({ progress, running, nodes, amountLabel, creditLabel, legIndex }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const state = useRef({ progress, running, legIndex });
  state.current = { progress, running, legIndex };

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let spin = 0;
    let last = performance.now();

    const count = nodes.length;
    const pts: V3[] = nodes.map((_, i) => {
      const u = count === 1 ? 0 : i / (count - 1);
      return {
        x: (u - 0.5) * 1.5,
        y: Math.sin(u * Math.PI) * -0.42,
        z: Math.cos(u * Math.PI * 1.15) * 0.55,
      };
    });

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      spin += dt * (state.current.running ? 0.22 : 0.06);

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (cv.width !== w * dpr || cv.height !== h * dpr) {
        cv.width = w * dpr;
        cv.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      const yaw = Math.sin(spin * 0.5) * 0.42;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const scale = Math.min(w * 0.42, h * 0.85);
      const project = (p: V3) => {
        const x = p.x * cos - p.z * sin;
        const z = p.x * sin + p.z * cos;
        const d = 3.4 / (3.4 + z);
        return { X: w / 2 + x * scale * d, Y: h * 0.46 + (p.y + 0.06) * scale * d, d };
      };

      // ground grid
      ctx.strokeStyle = "rgba(17,17,17,0.07)";
      ctx.lineWidth = 1;
      for (let g = -6; g <= 6; g++) {
        const a = project({ x: g / 4, y: 0.42, z: -1.3 });
        const b = project({ x: g / 4, y: 0.42, z: 1.3 });
        ctx.beginPath();
        ctx.moveTo(a.X, a.Y);
        ctx.lineTo(b.X, b.Y);
        ctx.stroke();
        const c = project({ x: -1.5, y: 0.42, z: g / 4.6 });
        const e = project({ x: 1.5, y: 0.42, z: g / 4.6 });
        ctx.beginPath();
        ctx.moveTo(c.X, c.Y);
        ctx.lineTo(e.X, e.Y);
        ctx.stroke();
      }

      const proj = pts.map(project);

      // cast shadows on the settlement plane
      pts.forEach((pt, i) => {
        const foot = project({ x: pt.x, y: 0.42, z: pt.z });
        const rr = 13 * foot.d * (state.current.legIndex >= i ? 1.15 : 0.9);
        ctx.fillStyle = "rgba(17,17,17,0.07)";
        ctx.beginPath();
        ctx.ellipse(foot.X, foot.Y, rr, rr * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // corridor rails
      for (let i = 0; i < proj.length - 1; i++) {
        const a = proj[i]!;
        const b = proj[i + 1]!;
        const done = state.current.legIndex > i;
        ctx.strokeStyle = done ? RED : "rgba(17,17,17,0.18)";
        ctx.lineWidth = done ? 2.4 : 1.2;
        ctx.beginPath();
        ctx.moveTo(a.X, a.Y);
        ctx.lineTo(b.X, b.Y);
        ctx.stroke();
        // pillar to the grid plane
        const foot = project({ x: pts[i]!.x, y: 0.42, z: pts[i]!.z });
        ctx.strokeStyle = "rgba(17,17,17,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.X, a.Y);
        ctx.lineTo(foot.X, foot.Y);
        ctx.stroke();
      }

      // nodes
      proj.forEach((p, i) => {
        const active = i === state.current.legIndex || i === state.current.legIndex + 1;
        const r = 9 * p.d * (active ? 1.35 : 1);
        if (active) {
          ctx.fillStyle = "rgba(216,30,5,0.12)";
          ctx.beginPath();
          ctx.arc(p.X, p.Y, r * 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        const sph = ctx.createRadialGradient(p.X - r * 0.4, p.Y - r * 0.45, r * 0.1, p.X, p.Y, r);
        if (state.current.legIndex >= i) {
          sph.addColorStop(0, "#ff6a52");
          sph.addColorStop(1, RED);
        } else {
          sph.addColorStop(0, "#ffffff");
          sph.addColorStop(1, "rgba(216,30,5,0.10)");
        }
        ctx.fillStyle = sph;
        ctx.strokeStyle = RED;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(p.X, p.Y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = INK;
        ctx.font = `600 ${Math.round(11 * p.d)}px ui-sans-serif, system-ui`;
        ctx.textAlign = "center";
        const off = i % 2 === 0 ? 0 : 16 * p.d;
        ctx.fillText(nodes[i]!.label, p.X, p.Y - r - 14 * p.d - off);
        ctx.fillStyle = "rgba(17,17,17,0.55)";
        ctx.font = `${Math.round(9.5 * p.d)}px ui-monospace, monospace`;
        ctx.fillText(nodes[i]!.sub, p.X, p.Y + r + 16 * p.d + off);
      });

      // value packets travelling the corridor
      const legs = Math.max(1, count - 1);
      const head = Math.min(0.9999, Math.max(0, state.current.progress)) * legs;
      for (let k = 0; k < 5; k++) {
        const t = head - k * 0.07;
        if (t < 0) continue;
        const li = Math.min(legs - 1, Math.floor(t));
        const f = t - li;
        const a = pts[li]!;
        const b = pts[li + 1]!;
        const p = project({
          x: a.x + (b.x - a.x) * f,
          y: a.y + (b.y - a.y) * f - Math.sin(f * Math.PI) * 0.12,
          z: a.z + (b.z - a.z) * f,
        });
        const s = 7 * p.d * (1 - k * 0.13);
        const glow = ctx.createRadialGradient(p.X, p.Y, 0, p.X, p.Y, s * 3.2);
        glow.addColorStop(0, "rgba(216,30,5,0.30)");
        glow.addColorStop(1, "rgba(216,30,5,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.X, p.Y, s * 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1 - k * 0.18;
        ctx.fillStyle = RED;
        ctx.save();
        ctx.translate(p.X, p.Y);
        ctx.rotate(spin * 1.6 + k);
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // HUD
      ctx.textAlign = "left";
      ctx.fillStyle = RED;
      ctx.font = "600 11px ui-monospace, monospace";
      ctx.fillText(`DEBIT  ${amountLabel}`, 14, 22);
      ctx.fillStyle = INK;
      ctx.fillText(`CREDIT ${creditLabel}`, 14, 38);
      ctx.fillStyle = "rgba(17,17,17,0.55)";
      ctx.fillText(
        `${state.current.running ? "SETTLING" : "HELD"} · LEG ${Math.min(legs, state.current.legIndex + 1)}/${legs} · ${(state.current.progress * 100).toFixed(0)}%`,
        14,
        54,
      );

      // settlement bar
      const bw = Math.min(220, w - 28);
      ctx.fillStyle = "rgba(17,17,17,0.08)";
      ctx.fillRect(14, 64, bw, 4);
      ctx.fillStyle = RED;
      ctx.fillRect(14, 64, bw * Math.min(1, Math.max(0, state.current.progress)), 4);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [nodes, amountLabel, creditLabel]);

  return (
    <canvas
      ref={ref}
      className="block h-[420px] w-full"
      role="img"
      aria-label="Three-dimensional simulation of the outbound remittance travelling from the Indian party through the AD Category-I bank to the overseas bank"
    />
  );
}
