import { useEffect, useRef, useState } from 'react';
import type { DemoEvent } from '@/lib/treasury-workflow';

/** 3D view of the timed clearance demo: treasury → AD bank → six regulator lanes → handoff → GIFT IBU. */
export function Clearance3D({ chain, elapsed }: { chain: DemoEvent[]; elapsed: number }) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef({ chain, elapsed });
  live.current = { chain, elapsed };
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    void import('three').then((T) => {
      const el = host.current;
      if (!el || disposed) return;
      try {
        const token = (name: string) => {
          const span = document.createElement('span'); span.style.color = `var(--${name})`; el.append(span);
          const v = getComputedStyle(span).color; span.remove();
          const cv = document.createElement('canvas'); cv.width = cv.height = 1; const ctx = cv.getContext('2d');
          if (!ctx) return new T.Color(); ctx.fillStyle = v; ctx.fillRect(0, 0, 1, 1); const p = ctx.getImageData(0, 0, 1, 1).data;
          return new T.Color(`rgb(${p[0]},${p[1]},${p[2]})`);
        };
        const ink = token('foreground'), red = token('primary'), pale = token('muted'), bg = token('background');
        const renderer = new T.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearColor(bg); el.append(renderer.domElement);
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
        const scene = new T.Scene(); const camera = new T.PerspectiveCamera(30, 1, 0.1, 100);
        scene.add(new T.HemisphereLight(bg, ink, 1.8));
        const dl = new T.DirectionalLight(bg, 2.4); dl.position.set(-6, 12, 8); dl.castShadow = true; dl.shadow.mapSize.set(1024, 1024);
        Object.assign(dl.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8 }); scene.add(dl);
        // Swiss ground: white slab, hairline 1-unit grid, red baseline rule.
        const floor = new T.Mesh(new T.PlaneGeometry(22, 12), new T.MeshStandardMaterial({ color: bg, roughness: 0.9 }));
        floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
        const grid = new T.GridHelper(22, 22, pale, pale); grid.position.y = 0.002; scene.add(grid);
        const rule = new T.Mesh(new T.BoxGeometry(18.4, 0.02, 0.08), new T.MeshBasicMaterial({ color: red })); rule.position.set(0, 0.01, 3.4); scene.add(rule);
        const idle = new T.MeshStandardMaterial({ color: bg, roughness: 0.55 });
        const done = new T.MeshStandardMaterial({ color: red, roughness: 0.4, metalness: 0.1 });
        const base = new T.MeshStandardMaterial({ color: ink, roughness: 0.7 });
        const edgeMat = new T.LineBasicMaterial({ color: ink });
        const label = (text: string, sub: string) => {
          const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const x = cv.getContext('2d')!;
          x.fillStyle = `#${ink.getHexString()}`; x.font = '700 64px Helvetica, Arial, sans-serif'; x.fillText(text.toUpperCase(), 8, 70);
          x.fillStyle = `#${red.getHexString()}`; x.fillRect(8, 92, 60, 8);
          x.fillStyle = `#${ink.getHexString()}`; x.globalAlpha = 0.6; x.font = '500 34px ui-monospace, monospace'; x.fillText(sub, 8, 145);
          const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
          const m = new T.Mesh(new T.PlaneGeometry(2.4, 0.75), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
          m.rotation.x = -Math.PI / 2; return m;
        };
        // Strict columns: 01 Treasury · 02 AD bank · 03–08 six authorities (3×2 grid) · 09 handoff · 10 GIFT IBU.
        const pos: [number, number][] = [[-8, 0], [-5, 0], [-2, -2], [0, -2], [2, -2], [-2, 1.2], [0, 1.2], [2, 1.2], [5, 0], [8, 0]];
        const names = ['Treasury', 'AD bank', 'RBI', 'IFSCA', 'MoF', 'FIU-IND', 'DPIIT', 'CBDT', 'Handoff', 'GIFT IBU'];
        const heights = [1.4, 1.2, 1, 1, 1, 1, 1, 1, 1.2, 1.6];
        const nodes = pos.map(([x, z], i) => {
          const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
          const plinth = new T.Mesh(new T.BoxGeometry(1.5, 0.08, 1.5), base); plinth.position.y = 0.04; plinth.receiveShadow = true; g.add(plinth);
          const geo = new T.BoxGeometry(0.9, 1, 0.9);
          const m = new T.Mesh(geo, idle); m.castShadow = true; g.add(m);
          const edges = new T.LineSegments(new T.EdgesGeometry(geo), edgeMat); m.add(edges);
          const l = label(names[i]!, String(i + 1).padStart(2, '0')); l.position.set(0.3, 0.1, 1.2); g.add(l);
          return { g, m, h: heights[i]!, cur: 0.15 };
        });
        const pts = pos.map(([x, z]) => new T.Vector3(x, 0.1, z));
        // Orthogonal (Manhattan) routing between columns — no diagonals.
        const route = (a: number, b: number) => { const A = pts[a]!, B = pts[b]!, mx = (A.x + B.x) / 2; return [A, new T.Vector3(mx, 0.1, A.z), new T.Vector3(mx, 0.1, B.z), B]; };
        const links: [number, number][] = [[0, 1], ...[2, 5].map((r) => [1, r] as [number, number]), [2, 3], [3, 4], [5, 6], [6, 7], ...[4, 7].map((r) => [r, 8] as [number, number]), [8, 9]];
        const paths = links.map(([a, b]) => { const p = route(a, b); const l = new T.Line(new T.BufferGeometry().setFromPoints(p), new T.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.35 })); scene.add(l); return new T.CurvePath<import('three').Vector3>(); }).map((cp, i) => { const p = route(links[i]![0], links[i]![1]); for (let k = 0; k < p.length - 1; k++) cp.add(new T.LineCurve3(p[k]!, p[k + 1]!)); return cp; });
        const pulses = links.map(() => { const s = new T.Mesh(new T.BoxGeometry(0.22, 0.22, 0.22), done); s.visible = false; scene.add(s); return s; });
        const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
        const ro = new ResizeObserver(resize); ro.observe(el); resize();
        let angle = 0, drag = false, px = 0, raf = 0;
        const down = (e: PointerEvent) => { drag = true; px = e.clientX; };
        const move = (e: PointerEvent) => { if (drag) { angle = Math.max(-0.6, Math.min(0.6, angle + (e.clientX - px) * 0.004)); px = e.clientX; } };
        const up = () => { drag = false; };
        renderer.domElement.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const draw = (t: number) => {
          if (disposed) return;
          const { chain: c, elapsed: e } = live.current;
          const fit = Math.max(1, 2.2 / camera.aspect);
          const sway = drag || reduce ? 0 : Math.sin(t / 6000) * 0.08;
          const a = angle + sway;
          camera.position.set(Math.sin(a) * 14 * fit, 11 * fit, Math.cos(a) * 15 * fit); camera.lookAt(0, 0, 0.4);
          const at = (i: number) => c[i] ? e >= c[i]!.atSecond : false;
          nodes.forEach((n, i) => {
            const on = at(i); const target = on ? n.h : 0.35;
            n.cur += (target - n.cur) * 0.08; n.m.scale.y = n.cur; n.m.position.y = 0.08 + n.cur / 2;
            n.m.material = on ? done : idle;
          });
          links.forEach(([a2, b], i) => {
            const p = pulses[i]!; const active = at(a2) && !at(b) && e >= 0;
            p.visible = active; if (active) p.position.copy(paths[i]!.getPointAt((t / 1400 + i * 0.17) % 1)).setY(0.2);
          });
          renderer.render(scene, camera); raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); renderer.dispose(); renderer.domElement.remove(); };
      } catch { setFailed(true); }
    }).catch(() => setFailed(true));
    return () => { disposed = true; cleanup(); };
  }, []);
  const labels = ['Treasury', 'AD bank', 'RBI', 'IFSCA', 'MoF', 'FIU-IND', 'DPIIT', 'CBDT', 'Route handoff', 'GIFT IBU'];
  return (
    <figure className="mt-5 border border-border">
      <div ref={host} role="img" aria-label="3D model of the filing travelling from treasury through the AD bank and six regulator lanes to the GIFT IBU" className="h-72 w-full cursor-grab touch-pan-y sm:h-80" />
      {failed && <p className="p-3 text-xs text-muted-foreground">3D view unavailable on this device; the timeline below shows the same steps.</p>}
      <figcaption className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border p-3 font-mono-ui text-[10px]">
        {labels.map((l, i) => { const on = chain[i] ? elapsed >= chain[i]!.atSecond : false; return <span key={l} className={on ? 'text-primary' : 'text-muted-foreground'}>{on ? '■' : '□'} {l}</span>; })}
        <span className="text-muted-foreground">· drag to rotate · simulation only</span>
      </figcaption>
    </figure>
  );
}
