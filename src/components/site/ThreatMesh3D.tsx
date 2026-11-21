import { useEffect, useRef, useState } from 'react';
import type { Threat } from '@/lib/security';
import { breachFrame, BREACH_PLAYBOOKS } from '@/lib/breach-playbook';
import { Button } from '@/components/ui/button';
import { RotateCcw, ShieldCheck } from 'lucide-react';
export type MeshParams = { intensity: number; density: number; quorumPct: number };
export function ThreatMesh3D({ threat, t, running, params = { intensity: 1, density: 8, quorumPct: 75 } }: { threat: Threat | null; t: number; running: boolean; params?: MeshParams }) {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef({ threat, t, running, params });
  state.current = { threat, t, running, params };
  const view = useRef({ angle: 0.35, tilt: 0.7 });
  const [failure, setFailure] = useState(false);
  const [ready, setReady] = useState(false);
  const frame = breachFrame(threat, t);
  const book = BREACH_PLAYBOOKS[threat?.id ?? 'credential'];
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    void import('three').then(T => {
      const host = mount.current;
      if (!host || disposed) return;
      try {
        const token = (name: string) => {
          const span = document.createElement('span'); span.style.color = `var(--${name})`; host.append(span);
          const value = getComputedStyle(span).color; span.remove();
          // Let the browser convert OKLCH tokens into the sRGB colour space.
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
          const ctx = canvas.getContext('2d'); if (!ctx) return new T.Color();
          ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1); const p = ctx.getImageData(0, 0, 1, 1).data;
          return new T.Color(`rgb(${p[0]},${p[1]},${p[2]})`);
        };
        const ink = token('foreground'), red = token('primary'), safe = token('chart-2'), pale = token('secondary'), bg = token('background');
        const renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearColor(bg); host.append(renderer.domElement);
        renderer.domElement.setAttribute('aria-label', '3D attack path across identity gate, filing vault, review nodes and release gate');
        const scene = new T.Scene(); const camera = new T.PerspectiveCamera(38, 1, 0.1, 100);
        scene.add(new T.HemisphereLight(bg, ink, 2.3)); const light = new T.DirectionalLight(bg, 3); light.position.set(2, 8, 6); scene.add(light);
        const mat = (color: typeof ink, metalness = 0.3) => new T.MeshStandardMaterial({ color, metalness, roughness: 0.45 });
        const solid = mat(ink), white = mat(pale), danger = mat(red), valid = mat(safe);
        const mesh = (geo: import('three').BufferGeometry<import('three').NormalBufferAttributes>, material: InstanceType<typeof T.Material>, x: number, y: number, z = 0) => {
          const m = new T.Mesh(geo, material); m.position.set(x, y, z); scene.add(m); return m;
        };
        const grid = new T.GridHelper(18, 36, ink, pale); grid.position.y = -0.05; scene.add(grid);
        // Abstract security boundaries, not stand-ins for real-world hardware.
        const gates = [-3.6, 4.2].map(x => { const g = mesh(new T.TorusGeometry(1.05, 0.09, 8, 40), valid, x, 1.1); g.rotation.y = Math.PI / 2; return g; });
        const core = new T.Group(); core.position.set(-0.5, 0.7, 0); scene.add(core);
        for (let i = 0; i < 5; i++) { const layer = new T.Mesh(new T.BoxGeometry(1.3, 0.16, 1.2), i % 2 ? solid : white); layer.position.y = i * 0.24; core.add(layer); }
        const nodes = Array.from({ length: 20 }, (_, i) => {
          const a = i * Math.PI * 2 / 8;
          return mesh(new T.OctahedronGeometry(0.18), valid, 1.8 + Math.cos(a) * 0.95, 0.7 + Math.floor(i / 8) * 0.5, Math.sin(a) * 1.25);
        });
        const wire = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-6, 1, 0), new T.Vector3(5, 1, 0)]), new T.LineDashedMaterial({ color: ink, dashSize: 0.13, gapSize: 0.14 })); wire.computeLineDistances(); scene.add(wire);
        const packets = Array.from({ length: 20 }, () => mesh(new T.TetrahedronGeometry(0.11), danger, -6, 1));
        const fragment = mesh(new T.BoxGeometry(0.65, 0.16, 1.2), danger, -0.5, 1.9); fragment.visible = false;
        const quarantine = mesh(new T.IcosahedronGeometry(0.6, 1), new T.MeshBasicMaterial({ color: red, wireframe: true }), -4.8, 1.2, 1.6);
        const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(1,h); camera.updateProjectionMatrix(); };
        const ro = new ResizeObserver(resize); ro.observe(host); resize();
        let raf = 0, first = true, drag = false, px = 0;
        const down = (e: PointerEvent) => { drag = true; px = e.clientX; renderer.domElement.setPointerCapture(e.pointerId); };
        const move = (e: PointerEvent) => { if (drag) { view.current.angle += (e.clientX - px) * 0.006; px = e.clientX; } };
        const up = () => { drag = false; };
        renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointermove', move); renderer.domElement.addEventListener('pointerup', up);
        const draw = () => {
          if (disposed) return;
          const s = state.current, f = breachFrame(s.threat, s.t), id = s.threat?.id;
          const a = view.current.angle, fit = Math.max(1, 1.8 / camera.aspect); camera.position.set(Math.sin(a) * 10 * fit, 8 * fit, Math.cos(a) * 12 * fit); camera.lookAt(0, 0.8, 0);
          gates.forEach(g => { g.material = f.blocked ? valid : s.threat ? danger : valid; });
          nodes.forEach((n,i) => { n.visible = i < s.params.density; n.material = id === 'tamper' && i === 0 && !f.restored ? danger : valid; });
          const progress = (s.t % 850) / 850;
          packets.forEach((p,i) => {
            p.visible = Boolean(s.threat) && i < Math.round(8 * s.params.intensity) && !f.restored;
            const wave = (progress + i / 20) % 1;
            const stop = id === 'credential' ? -3.6 : id === 'payment' ? 4.2 : -0.5;
            p.position.set(f.blocked ? -4.8 + Math.sin(i * 2) * 0.3 : -6 + (stop + 6) * wave, 1.1 + Math.sin(i) * 0.2, f.blocked ? 1.6 + Math.cos(i) * 0.3 : Math.cos(i) * 0.2);
            if (id === 'exfil' && !f.blocked) p.position.x = -0.5 - wave * 4.8;
            p.rotation.set(s.t / 600 + i, i, s.t / 800);
          });
          fragment.visible = id === 'tamper' && !f.restored; fragment.position.z = f.blocked ? 1.8 : 0;
          quarantine.visible = f.blocked && !f.restored;
          renderer.render(scene,camera);
          if (first) { first = false; host.dataset['sceneReady'] = '1'; setReady(true); }
          raf = requestAnimationFrame(draw);
        }; draw();
        cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', move); renderer.domElement.removeEventListener('pointerup', up); scene.traverse(o => { if (o instanceof T.Mesh || o instanceof T.Line) { o.geometry.dispose(); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.forEach(m => m.dispose()); } }); renderer.dispose(); renderer.domElement.remove(); };
      } catch { setFailure(true); }
    }).catch(() => { if (!disposed) setFailure(true); });
    return () => { disposed = true; cleanup(); };
  }, []);
  return <div className="border-t border-border">
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-secondary">
      <div><p className="font-mono-ui text-xs uppercase text-primary">Attack / containment digital twin</p><p className="text-sm">{threat?.label ?? 'Four threat scenarios · ready'} · <span className="text-primary">{frame.phase.toUpperCase()}</span></p></div>
      <Button variant="outline" size="icon" title="Reset 3D view" aria-label="Reset 3D view" onClick={() => { view.current.angle = 0.35; }}><RotateCcw /></Button>
    </div>
    <div ref={mount} className="relative h-[300px] w-full overflow-hidden md:h-[420px] [&_canvas]:block [&_canvas]:touch-pan-y" role="img" aria-label="Interactive 3D security simulation">
      {!ready && <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">{failure ? '3D unavailable — the response timeline remains usable below.' : 'Preparing 3D scene…'}</p>}
    </div>
    <div className="grid grid-cols-2 border-y border-border md:grid-cols-4">{['01 Identity gate', '02 Filing vault', '03 Review copies', '04 Release gate'].map(label => <p key={label} className="px-4 py-3 font-mono-ui text-[11px] text-muted-foreground">{label}</p>)}</div>
    <div className="grid gap-5 px-5 py-5 md:grid-cols-3">
      <div><p className="text-xs uppercase text-primary">Attack path</p><p className="mt-2 text-sm">{book?.entry} → {book?.target}</p></div>
      <div><p className="flex items-center gap-2 text-xs uppercase text-primary"><ShieldCheck size={14} /> Defence methodology</p><p className="mt-2 text-sm leading-relaxed">{book?.method}</p></div>
      <div><p className="text-xs uppercase text-primary">Simulated evidence</p><p className="mt-2 text-sm">{frame.current?.layer ?? 'Awaiting scenario'}</p><p className="mt-1 text-xs text-muted-foreground">{frame.current?.plain ?? book?.evidence}</p></div>
    </div>
    <p className="border-t border-border px-5 py-3 text-xs leading-relaxed text-muted-foreground">Local scripted simulation, not a penetration test or proof of deployed cyber resilience. Timings, regulator notifications and consensus are illustrative. {book?.residual}</p>
  </div>;
}
