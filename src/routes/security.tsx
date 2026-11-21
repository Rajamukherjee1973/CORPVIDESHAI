import { SecurityAssuranceHeader, SecurityControlMap } from "@/components/site/SecurityAssurance";
import { ForecastLede } from "@/components/site/ForecastLede";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { createFileRoute } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { useSession } from "@/lib/session";
import { ENGINE_META } from "@/lib/regulator";
import { ThreatMesh3D, type MeshParams } from "@/components/site/ThreatMesh3D";
import {
  DEFAULT_PARAMS,
  DEFAULT_THRESHOLDS,
  REG_LANES,
  buildTelemetry,
  containmentHolds,
  downloadFile,
  evaluateAlerts,
  laneLatencyMs,
  liveNodes,
  loadPresets,
  loadThresholds,
  quorumNeeded,
  savePresets,
  saveThresholds,
  summarise,
  telemetryToCsv,
  timeToQuorumMs,
  type Alert,
  type AlertThresholds,
  type BreachParams,
  type Preset,
  type RunRecord,
} from "@/lib/breach-metrics";
import {
  FED_NODES,
  RAIL_TOTAL_MS,
  THREATS,
  THREAT_TOTAL_MS,
  digestFor,
  phaseOf,
  pickupGapMs,
  statusAt,
  type Threat,
} from "@/lib/security";

const TITLE = "Live Security Theatre — Federated Rail and Breach Response | CorpVidesh AI";
const DESC =
  "Watch a treasury filing fan out to six regulators in parallel on a federated hash-chained ledger, then run a live unauthorised-access, ledger-tamper, exfiltration or payment-hijack simulation and see exactly how the rail detects, contains and recovers.";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecurityPage,
});

const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const ms = (v: number) => `${v} ms`;

function Plain({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 border-l-2 border-primary bg-primary/[0.04] px-4 py-3">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">In plain words</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

/**
 * Millisecond clock with pause / resume / manual step and a speed multiplier,
 * so the breach theatre can be paced by hand during a demo.
 */
function useClock(total: number) {
  const [t, setT] = useState(0);
  const [on, setOn] = useState(false);
  const speed = useRef(1);
  const tRef = useRef(0);
  tRef.current = t;

  useEffect(() => {
    if (!on) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const dt = (now - last) * speed.current;
      last = now;
      const next = tRef.current + dt;
      if (next >= total) {
        tRef.current = total;
        setT(total);
        setOn(false);
        return;
      }
      tRef.current = next;
      setT(next);
    }, 40);
    return () => window.clearInterval(id);
  }, [on, total]);

  const run = useCallback(() => {
    tRef.current = 0;
    setT(0);
    setOn(true);
  }, []);
  const pause = useCallback(() => setOn(false), []);
  const resume = useCallback(() => {
    if (tRef.current < total) setOn(true);
  }, [total]);
  const step = useCallback(
    (delta: number) => {
      setOn(false);
      const next = Math.max(0, Math.min(total, tRef.current + delta));
      tRef.current = next;
      setT(next);
    },
    [total],
  );
  const reset = useCallback(() => {
    setOn(false);
    tRef.current = 0;
    setT(0);
  }, []);
  const setSpeed = useCallback((v: number) => {
    speed.current = v;
  }, []);
  return { t, on, run, pause, resume, step, reset, setT, setSpeed };
}

function SecurityPage() {
  const { session } = useSession();
  const rail = useClock(RAIL_TOTAL_MS);
  const inc = useClock(THREAT_TOTAL_MS);
  const [threat, setThreat] = useState<Threat | null>(null);
  const [auto, setAuto] = useState(false);
  const [autoIdx, setAutoIdx] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [paused, setPaused] = useState(false);
  const [intensity, setIntensity] = useState(1);
  const [density, setDensity] = useState(8);
  const [quorumPct, setQuorumPct] = useState(75);
  /** Wall-clock seconds the whole THREAT_TOTAL_MS response is stretched over. */
  const [windowSec, setWindowSec] = useState(THREAT_TOTAL_MS / 1000);
  const [holdSec, setHoldSec] = useState(1.6);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsOn, setAlertsOn] = useState(true);
  const recorded = useRef(false);

  const params: BreachParams = { intensity, density, quorumPct, windowSec, holdSec };

  useEffect(() => {
    setPresets(loadPresets());
    setThresholds(loadThresholds());
  }, []);

  const patchThreshold = (patch: Partial<AlertThresholds>) => {
    const next = { ...thresholds, ...patch };
    setThresholds(next);
    saveThresholds(next);
  };

  const applyParams = (p: BreachParams) => {
    setIntensity(p.intensity);
    setDensity(p.density);
    setQuorumPct(p.quorumPct);
    setWindowSec(p.windowSec);
    setHoldSec(p.holdSec);
  };
  const storePreset = () => {
    const name = presetName.trim() || `Preset ${presets.length + 1}`;
    const next = [...presets.filter((p) => p.name !== name), { name, params, savedAt: Date.now() }];
    setPresets(next);
    savePresets(next);
    setPresetName("");
  };
  const dropPreset = (name: string) => {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    savePresets(next);
  };

  /* --- live telemetry for the current run ------------------------- */
  const ttq = timeToQuorumMs(threat, params);
  const need = quorumNeeded(params);
  const live = liveNodes(threat, params);
  const holds = containmentHolds(threat, params);
  const laneRows = REG_LANES.map((n, i) => {
    const start = Math.round((i * 90) / Math.max(0.2, intensity));
    const latency = laneLatencyMs(i, params);
    const el = Math.max(0, Math.min(latency, inc.t - start));
    return {
      id: n.id,
      label: n.label,
      engine: n.engine,
      start,
      latency,
      elapsed: el,
      done: threat ? inc.t >= start + latency : false,
      active: threat ? inc.t >= start && inc.t < start + latency : false,
    };
  });
  const avgLatency = Math.round(laneRows.reduce((a, r) => a + r.latency, 0) / laneRows.length);
  const lanesDone = laneRows.filter((r) => r.done).length;
  const stats = summarise(runs);
  const runKey = threat ? `${threat.id}-${cycles}-${runs.length}` : "";

  /* --- threshold deviation alerts --------------------------------- */
  useEffect(() => {
    if (!alertsOn || !threat) return;
    const fresh = evaluateAlerts({
      runKey,
      clockMs: inc.t,
      threatLabel: threat.label,
      lanes: laneRows.map((r) => ({ id: r.id, label: r.label, latency: r.latency, done: r.done })),
      ttqMs: ttq,
      ttqReached: inc.t >= ttq,
      contained: holds,
      successRatePct: stats.rate,
      completedRuns: stats.n,
      thresholds,
    });
    if (fresh.length === 0) return;
    setAlerts((prev) => {
      const seen = new Set(prev.map((a) => a.id));
      const add = fresh.filter((a) => !seen.has(a.id));
      return add.length ? [...add.reverse(), ...prev].slice(0, 40) : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inc.t, threat, alertsOn, thresholds, runKey]);

  const laneObs = laneRows.map((r) => ({ id: r.id, label: r.label, latency: r.latency, done: r.done }));
  const exportTelemetry = (fmt: "csv" | "json") => {
    const payload = buildTelemetry({ thresholds, params, runs, lanes: laneObs, alerts });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (fmt === "json") {
      downloadFile(`corpvidesh-breach-telemetry-${stamp}.json`, "application/json", JSON.stringify(payload, null, 2));
    } else {
      downloadFile(`corpvidesh-breach-telemetry-${stamp}.csv`, "text/csv", telemetryToCsv(payload));
    }
  };

  // Record one telemetry row per completed run.
  useEffect(() => {
    if (!threat) return;
    if (inc.t < THREAT_TOTAL_MS) {
      recorded.current = false;
      return;
    }
    if (recorded.current) return;
    recorded.current = true;
    setRuns((prev) =>
      [
        ...prev,
        {
          id: `${threat.id}-${Date.now()}`,
          threatId: threat.id,
          threatLabel: threat.label,
          at: Date.now(),
          ttqMs: ttq,
          avgLatencyMs: avgLatency,
          contained: holds,
          params,
        },
      ].slice(-24),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inc.t, threat]);

  const meshParams: MeshParams = { intensity, density, quorumPct };

  // Speed multiplier derives from the chosen time window.
  useEffect(() => {
    inc.setSpeed(THREAT_TOTAL_MS / 1000 / windowSec);
  }, [windowSec, inc]);

  const launch = (th: Threat) => {
    setAuto(false);
    setPaused(false);
    setThreat(th);
    inc.run();
  };

  // Autopilot: inject the attack for the current index.
  useEffect(() => {
    if (!auto || paused) return;
    const th = THREATS[autoIdx % THREATS.length];
    if (!th) return;
    setThreat(th);
    inc.run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, autoIdx]);

  // Advance to the next attack once the current one has fully played out,
  // after a short hold on the restored state. Paused runs never advance.
  useEffect(() => {
    if (!auto || paused || inc.on || inc.t < THREAT_TOTAL_MS) return;
    const id = window.setTimeout(() => {
      setAutoIdx((n) => {
        const next = n + 1;
        if (next % THREATS.length === 0) setCycles((c) => c + 1);
        return next;
      });
    }, Math.max(200, holdSec * 1000));
    return () => window.clearTimeout(id);
  }, [auto, paused, inc.on, inc.t, holdSec]);

  const startAuto = () => {
    setAutoIdx(0);
    setCycles(0);
    setPaused(false);
    setAuto(true);
  };
  const stopAuto = () => {
    setAuto(false);
    setPaused(false);
    inc.reset();
  };
  const pauseAuto = () => {
    setPaused(true);
    inc.pause();
  };
  const resumeAuto = () => {
    setPaused(false);
    inc.resume();
  };
  const stepFrame = (delta: number) => {
    setPaused(true);
    inc.step(delta);
  };
  const stepAttack = () => {
    setPaused(false);
    setAuto(true);
    setAutoIdx((n) => {
      const next = n + 1;
      if (next % THREATS.length === 0) setCycles((c) => c + 1);
      return next;
    });
  };

  const status = statusAt(threat, inc.t);

  return (
    <Frame>
      <div className="mx-auto max-w-[1400px] px-6 py-14">
        <SecurityAssuranceHeader />
        <Plain>
          Money leaving India passes many desks. This page shows those desks working at the same time
          instead of one after another, and then shows what happens the moment somebody tries to break in
          or change a number they should not.
        </Plain>

        {/* ---------------------------------------------------------- */}
        <section id="rail" className="mt-20 scroll-mt-24">
          <Rule label="01 — Federated routing, treasury to six regulators" />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={rail.run}
              className="font-mono-ui bg-primary px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
            >
              {rail.on ? "Routing…" : "Run the routing"}
            </button>
            <button
              onClick={rail.reset}
              className="font-mono-ui border border-rule/25 px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
            >
              Reset
            </button>
            <span className="font-mono-ui text-[11px] uppercase tracking-[0.16em] text-primary">
              T+{secs(rail.t)} / {secs(RAIL_TOTAL_MS)}
            </span>
          </div>

          <div className="mt-8 border border-rule/20">
            {FED_NODES.map((n) => {
              const ph = phaseOf(n, rail.t);
              const left = (n.startMs / RAIL_TOTAL_MS) * 100;
              const width = (n.durationMs / RAIL_TOTAL_MS) * 100;
              const prog =
                ph === "done" ? 100 : ph === "idle" ? 0 : ((rail.t - n.startMs) / n.durationMs) * 100;
              return (
                <div
                  key={n.id}
                  className="grid gap-4 border-b border-rule/15 px-5 py-4 last:border-b-0 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`block h-2 w-2 ${
                          ph === "active" ? "animate-pulse bg-primary" : ph === "done" ? "bg-primary" : "bg-rule/40"
                        }`}
                        aria-hidden
                      />
                      <p className="font-mono-ui text-[11px] uppercase tracking-[0.14em]">{n.label}</p>
                    </div>
                    <p className="mt-1 pl-4 text-xs text-muted-foreground">{n.role}</p>
                    <p className="font-mono-ui mt-1 pl-4 text-[10px] uppercase tracking-[0.12em] text-primary">
                      {ENGINE_META[n.engine].label}
                      {n.kind === "regulator" ? ` · gap +${secs(pickupGapMs(n))}` : ""}
                    </p>
                  </div>
                  <div>
                    <div className="relative h-7 bg-rule/10">
                      <div
                        className="absolute top-0 h-7 border border-primary/40 bg-primary/10"
                        style={{ left: `${left}%`, width: `${width}%` }}
                      >
                        <div
                          className="h-full bg-primary/70"
                          style={{ width: `${Math.max(0, Math.min(100, prog))}%` }}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.what}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
                      <span className="font-mono-ui uppercase tracking-[0.12em] text-primary">Plain: </span>
                      {n.plain}
                    </p>
                    <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Starts T+{secs(n.startMs)} · holds {secs(n.durationMs)} · ends T+
                      {secs(n.startMs + n.durationMs)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <Plain>
            Each bar is one desk. Because the bars overlap, six regulators and the bank are reading the same
            sealed file at the same time. The old paper process runs these one after another, which is why it
            takes weeks instead of minutes.
          </Plain>
        </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="Security desk" focus={["clearance", "rework"]} />
      </section>

        {/* ---------------------------------------------------------- */}
        <section id="breach" className="mt-24 scroll-mt-24">
          <Rule label="02 — Live breach simulation" />
          <div className="mb-8 border border-rule/20">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule/15 px-5 py-4">
              <div>
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                  Local cyber-response simulation · interactive 3D
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Replay credential abuse, checkpoint tampering, bulk extraction and beneficiary substitution.
                  Watch the attack cross a trust boundary, then see detection, isolation and recovery.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={auto ? stopAuto : startAuto}
                  className="font-mono-ui bg-primary px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
                >
                  {auto ? "Stop autopilot" : "Start autopilot · all 4"}
                </Button>
                <button
                  onClick={paused ? resumeAuto : pauseAuto}
                  disabled={!threat}
                  className="font-mono-ui border border-rule/25 px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary disabled:opacity-30"
                >
                  {paused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={() => stepFrame(-120)}
                  disabled={!threat}
                  className="font-mono-ui border border-rule/25 px-3 py-2.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary disabled:opacity-30"
                >
                  ◀ 120 ms
                </button>
                <button
                  onClick={() => stepFrame(120)}
                  disabled={!threat}
                  className="font-mono-ui border border-rule/25 px-3 py-2.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary disabled:opacity-30"
                >
                  120 ms ▶
                </button>
                <button
                  onClick={stepAttack}
                  className="font-mono-ui border border-rule/25 px-3 py-2.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
                >
                  Next attack ⏭
                </button>
                <span className="font-mono-ui text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {auto
                    ? `Attack ${(autoIdx % THREATS.length) + 1}/4 · cycle ${cycles + 1}${paused ? " · paused" : ""}`
                    : paused
                      ? "Paused"
                      : "Autopilot idle"}
                </span>
              </div>
            </div>

            <ThreatMesh3D threat={threat} t={inc.t} running={inc.on} params={meshParams} />
            <div className="border-y border-border px-5 py-4">
              <label className="font-mono-ui text-xs text-primary" htmlFor="breach-replay">Response replay · T+{Math.round(inc.t)} ms (model time)</label>
              <input id="breach-replay" aria-label="Response replay time" type="range" min={0} max={THREAT_TOTAL_MS} step={20} value={Math.round(inc.t)} onChange={e => { setPaused(true); inc.pause(); inc.setT(Number(e.target.value)); }} className="mt-3 w-full accent-primary" />
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {(threat?.steps ?? []).map((s, i) => <Button key={s.atMs} variant={inc.t >= s.atMs ? "secondary" : "outline"} className="h-auto justify-start whitespace-normal px-3 py-2 text-left" onClick={() => { setPaused(true); inc.pause(); inc.setT(s.atMs); }}><span className="text-xs">{String(i + 1).padStart(2, '0')} · {s.kind} · {s.layer}</span></Button>)}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Synthetic outcomes and response times; no real attacks, live payment holds or regulator alerts are executed.</p>
            </div>
            {/* --- run parameters ------------------------------------- */}
            <div className="border-b border-rule/15 px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                  Run parameters · reproduce an exact outcome
                </p>
                <button
                  onClick={() => {
                    setIntensity(1);
                    setDensity(8);
                    setQuorumPct(75);
                    setWindowSec(THREAT_TOTAL_MS / 1000);
                    setHoldSec(1.6);
                  }}
                  className="font-mono-ui border border-rule/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
                >
                  Reset to defaults
                </button>
              </div>
              <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                {[
                  {
                    id: "intensity",
                    label: "Attack intensity",
                    value: intensity,
                    min: 0.4,
                    max: 2.5,
                    step: 0.1,
                    fmt: `${intensity.toFixed(1)}x`,
                    set: setIntensity,
                    hint: "Pressure of the hostile vector: consensus pulse weight, halo strength and spin rate.",
                  },
                  {
                    id: "density",
                    label: "Node density",
                    value: density,
                    min: 6,
                    max: 20,
                    step: 1,
                    fmt: `${density} nodes`,
                    set: setDensity,
                    hint: "How many sealed ledger copies are drawn in the federated mesh.",
                  },
                  {
                    id: "quorum",
                    label: "Quorum threshold",
                    value: quorumPct,
                    min: 50,
                    max: 100,
                    step: 5,
                    fmt: `${quorumPct}% · need ${Math.ceil((quorumPct / 100) * density)}/${density}`,
                    set: setQuorumPct,
                    hint: "Share of nodes that must agree before the record commits.",
                  },
                  {
                    id: "window",
                    label: "Time window",
                    value: windowSec,
                    min: 2,
                    max: 30,
                    step: 0.5,
                    fmt: `${windowSec.toFixed(1)}s`,
                    set: setWindowSec,
                    hint: `The ${Math.round(THREAT_TOTAL_MS)} ms response stretched over this many seconds of wall clock.`,
                  },
                  {
                    id: "hold",
                    label: "Hold between attacks",
                    value: holdSec,
                    min: 0.2,
                    max: 8,
                    step: 0.2,
                    fmt: `${holdSec.toFixed(1)}s`,
                    set: setHoldSec,
                    hint: "Pause on the restored state before autopilot injects the next breach.",
                  },
                ].map((c) => (
                  <div key={c.id}>
                    <label
                      htmlFor={`p-${c.id}`}
                      className="font-mono-ui flex items-baseline justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      <span>{c.label}</span>
                      <span className="text-primary">{c.fmt}</span>
                    </label>
                    <input
                      id={`p-${c.id}`}
                      type="range"
                      min={c.min}
                      max={c.max}
                      step={c.step}
                      value={c.value}
                      onChange={(e) => c.set(Number(e.target.value))}
                      className="mt-2 w-full accent-primary"
                    />
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80">{c.hint}</p>
                  </div>
                ))}
              </div>
              <p className="font-mono-ui mt-4 break-all border-t border-rule/15 pt-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Run signature · int={intensity.toFixed(1)} · nodes={density} · quorum={quorumPct}% · window=
                {windowSec.toFixed(1)}s · hold={holdSec.toFixed(1)}s
              </p>

              {/* --- presets ---------------------------------------- */}
              <div className="mt-4 border-t border-rule/15 pt-4">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                  Parameter presets · reproduce a run exactly
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Name this configuration"
                    aria-label="Preset name"
                    className="font-mono-ui w-56 border border-rule/25 bg-background px-3 py-2 text-[11px] uppercase tracking-[0.12em] outline-none focus:border-primary"
                  />
                  <button
                    onClick={storePreset}
                    className="font-mono-ui bg-primary px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-primary-foreground"
                  >
                    Save preset
                  </button>
                  <button
                    onClick={() => applyParams(DEFAULT_PARAMS)}
                    className="font-mono-ui border border-rule/25 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
                  >
                    Load defaults
                  </button>
                </div>
                {presets.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No presets saved yet. Set the sliders, name the configuration and save it — it is stored
                    on this browser and reloads the exact same run.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-px bg-rule/15 md:grid-cols-2 xl:grid-cols-3">
                    {presets.map((p) => (
                      <div key={p.name} className="flex items-start justify-between gap-3 bg-background px-4 py-3">
                        <div>
                          <p className="font-mono-ui text-[11px] uppercase tracking-[0.14em]">{p.name}</p>
                          <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            int {p.params.intensity.toFixed(1)}x · {p.params.density} nodes · quorum{" "}
                            {p.params.quorumPct}% · window {p.params.windowSec.toFixed(1)}s · hold{" "}
                            {p.params.holdSec.toFixed(1)}s
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            onClick={() => applyParams(p.params)}
                            className="font-mono-ui border border-rule/25 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-primary"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => dropPreset(p.name)}
                            className="font-mono-ui px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-primary"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pt-4">
              <div className="h-1 w-full bg-rule/15">
                <div
                  className="h-1 bg-primary"
                  style={{ width: `${Math.min(100, (inc.t / THREAT_TOTAL_MS) * 100)}%` }}
                />
              </div>
            </div>
            <div className="grid gap-px border-t border-rule/15 bg-rule/15 md:grid-cols-4">
              {THREATS.map((th, i) => {
                const active = threat?.id === th.id;
                const done = auto ? i < autoIdx % THREATS.length || autoIdx >= THREATS.length : false;
                return (
                  <Button key={th.id} variant="ghost" onClick={() => launch(th)} className="h-auto flex-col items-start whitespace-normal bg-background px-4 py-3 text-left">
                    <p
                      className={`font-mono-ui text-[10px] uppercase tracking-[0.14em] ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")} ·{" "}
                      {active ? inc.on ? "running" : "selected" : done ? "replayed" : "queued"}
                    </p>
                    <p className="mt-1 text-sm leading-snug">{th.label}</p>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* --- live performance metrics ---------------------------- */}
          <div className="mt-8 border border-rule/20">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule/15 px-5 py-4">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                Live performance metrics · this run
              </p>
              <span className="font-mono-ui text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                T+{ms(Math.round(inc.t))} · lanes {lanesDone}/{laneRows.length}
              </span>
            </div>
            <div className="grid gap-px bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  k: "Time to quorum",
                  v: threat ? (inc.t >= ttq ? ms(ttq) : "pending") : "—",
                  s: threat
                    ? `${need} of ${Math.round(density)} nodes must agree · ${live} honest copies live`
                    : "Run an attack to measure",
                },
                {
                  k: "Avg lane latency",
                  v: threat ? ms(avgLatency) : "—",
                  s: "Mean processing time across the six regulator lanes at this intensity",
                },
                {
                  k: "Containment",
                  v: threat ? (holds ? "Holds" : "Quorum short") : "—",
                  s: holds
                    ? "Enough honest nodes remain to commit the containment decision"
                    : "Threshold set above the surviving node count — the rail would stall, by design",
                },
                {
                  k: "Success rate over time",
                  v: stats.n ? `${stats.rate.toFixed(0)}%` : "—",
                  s: stats.n
                    ? `${stats.n} completed runs · mean quorum ${ms(stats.ttq)} · mean latency ${ms(stats.latency)}`
                    : "Completed runs accumulate here",
                },
              ].map((c) => (
                <div key={c.k} className="bg-background px-5 py-4">
                  <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {c.k}
                  </p>
                  <p className="mt-2 font-display text-3xl leading-none text-primary">{c.v}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.s}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-rule/15">
              {laneRows.map((r) => {
                const pct = r.latency ? (r.elapsed / r.latency) * 100 : 0;
                return (
                  <div
                    key={r.id}
                    className="grid gap-3 border-b border-rule/10 px-5 py-3 last:border-b-0 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)_minmax(0,150px)]"
                  >
                    <p className="font-mono-ui text-[11px] uppercase tracking-[0.14em]">
                      {r.label}
                      <span className="ml-2 text-primary">{ENGINE_META[r.engine].label}</span>
                    </p>
                    <div className="h-4 bg-rule/10">
                      <div
                        className={`h-4 ${r.done ? "bg-primary" : "bg-primary/50"}`}
                        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                      />
                    </div>
                    <p className="font-mono-ui text-right text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {r.done ? "cleared" : r.active ? "processing" : "waiting"} · {ms(r.elapsed)} /{" "}
                      {ms(r.latency)}
                    </p>
                  </div>
                );
              })}
            </div>

            {runs.length > 0 ? (
              <div className="border-t border-rule/15 px-5 py-4">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
                  Containment history · newest first
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <thead>
                      <tr className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        <th className="border-b border-rule/20 py-2 pr-4">Attack</th>
                        <th className="border-b border-rule/20 py-2 pr-4">Quorum</th>
                        <th className="border-b border-rule/20 py-2 pr-4">Avg lane</th>
                        <th className="border-b border-rule/20 py-2 pr-4">Parameters</th>
                        <th className="border-b border-rule/20 py-2">Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...runs].reverse().map((r) => (
                        <tr key={r.id} className="font-mono-ui text-[11px]">
                          <td className="border-b border-rule/10 py-2 pr-4">{r.threatLabel}</td>
                          <td className="border-b border-rule/10 py-2 pr-4">{ms(r.ttqMs)}</td>
                          <td className="border-b border-rule/10 py-2 pr-4">{ms(r.avgLatencyMs)}</td>
                          <td className="border-b border-rule/10 py-2 pr-4 text-muted-foreground">
                            {r.params.intensity.toFixed(1)}x · {r.params.density}n · {r.params.quorumPct}%
                          </td>
                          <td
                            className={`border-b border-rule/10 py-2 ${
                              r.contained ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {r.contained ? "Contained" : "Quorum short"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() => setRuns([])}
                  className="font-mono-ui mt-3 border border-rule/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
                >
                  Clear history
                </button>
              </div>
            ) : null}
          </div>

          {/* --- alerts + telemetry export --------------------------- */}
          <div className="mt-8 border border-rule/20">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule/15 px-5 py-4">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                Deviation alerts and telemetry archive
              </p>
              <button
                onClick={() => setAlertsOn((v) => !v)}
                className={`font-mono-ui border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${
                  alertsOn ? "border-primary text-primary" : "border-rule/25 text-muted-foreground"
                }`}
              >
                {alertsOn ? "Alerts armed" : "Alerts muted"}
              </button>
            </div>

            <div className="grid gap-px bg-rule/15 md:grid-cols-3">
              {(
                [
                  {
                    k: "Lane latency ceiling",
                    v: thresholds.laneLatencyMs,
                    min: 100,
                    max: 1500,
                    step: 20,
                    unit: "ms",
                    set: (n: number) => patchThreshold({ laneLatencyMs: n }),
                    s: "Any regulator lane that clears slower than this raises an alert.",
                  },
                  {
                    k: "Time-to-quorum ceiling",
                    v: thresholds.ttqMs,
                    min: 200,
                    max: 6000,
                    step: 100,
                    unit: "ms",
                    set: (n: number) => patchThreshold({ ttqMs: n }),
                    s: "Alerts when the mesh takes too long to agree on containment.",
                  },
                  {
                    k: "Success-rate floor",
                    v: thresholds.successRatePct,
                    min: 10,
                    max: 100,
                    step: 5,
                    unit: "%",
                    set: (n: number) => patchThreshold({ successRatePct: n }),
                    s: "Alerts when containment across completed runs falls under this share.",
                  },
                ] as const
              ).map((c) => (
                <div key={c.k} className="bg-background px-5 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {c.k}
                    </p>
                    <span className="font-mono-ui text-[11px] text-primary">
                      {c.v} {c.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={c.v}
                    aria-label={c.k}
                    onChange={(e) => c.set(Number(e.target.value))}
                    className="mt-3 w-full accent-primary"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.s}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-rule/15 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
                  Alert feed · newest first ({alerts.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => exportTelemetry("csv")}
                    className="font-mono-ui border border-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-primary hover:bg-primary/[0.06]"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => exportTelemetry("json")}
                    className="font-mono-ui border border-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-primary hover:bg-primary/[0.06]"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={() => setAlerts([])}
                    className="font-mono-ui border border-rule/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
                  >
                    Clear alerts
                  </button>
                </div>
              </div>

              {alerts.length === 0 ? (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Nothing has crossed a threshold yet. Raise the intensity, widen the quorum requirement or
                  lower a ceiling above and run an attack to see the feed fire.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-rule/10">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                      <span
                        className={`font-mono-ui border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                          a.severity === "critical"
                            ? "border-primary bg-primary/[0.08] text-primary"
                            : "border-rule/30 text-muted-foreground"
                        }`}
                      >
                        {a.severity}
                      </span>
                      <span className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        T+{ms(a.atMs)} · {a.kind}
                      </span>
                      <span className="text-sm leading-relaxed">{a.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <Plain>
            You set the limits: how slow a regulator lane may be, how long agreement may take, and how often
            containment must succeed. Cross any of those and a line appears here as it happens. The two export
            buttons save everything — the limits, the run history, the lane times and every alert — as a
            spreadsheet file or a machine-readable file you can archive.
          </Plain>

          <Plain>
            Press one button and the rail attacks itself four times in a row while you watch. The rotating
            picture is the actual network of eight sealed copies: red lines are live agreement between them,
            the outside dot is the attacker, and you can see the moment the line to it is cut.
          </Plain>

          <div className="grid gap-px bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
            {THREATS.map((th) => (
              <button
                key={th.id}
                onClick={() => launch(th)}
                className={`bg-background p-5 text-left transition-colors hover:bg-primary/[0.04] ${
                  threat?.id === th.id ? "outline outline-2 -outline-offset-2 outline-primary" : ""
                }`}
              >
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
                  {th.severity}
                </p>
                <p className="mt-2 font-display text-xl leading-tight">{th.label}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{th.vector}</p>
                <p className="font-mono-ui mt-3 text-[10px] uppercase tracking-[0.14em] text-primary">
                  Run this attack →
                </p>
              </button>
            ))}
          </div>

          <div className="mt-8 border border-rule/20">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule/15 px-5 py-4">
              <div className="flex items-center gap-3">
                <span
                  className={`block h-3 w-3 ${
                    status === "secure"
                      ? "bg-rule/40"
                      : status === "restored"
                        ? "bg-primary"
                        : "animate-pulse bg-primary"
                  }`}
                  aria-hidden
                />
                <p className="font-mono-ui text-[11px] uppercase tracking-[0.18em] text-primary">
                  Rail status ·{" "}
                  {status === "secure"
                    ? "Secure — no incident"
                    : status === "detecting"
                      ? "Intrusion detected"
                      : status === "contained"
                        ? "Contained — attacker isolated"
                        : "Recovered — rail nominal"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono-ui text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  T+{ms(Math.round(inc.t))}
                </span>
                {threat ? (
                  <button
                    onClick={() => launch(threat)}
                    className="font-mono-ui border border-rule/25 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
                  >
                    Replay
                  </button>
                ) : null}
              </div>
            </div>

            {!threat ? (
              <p className="px-5 py-10 text-sm text-muted-foreground">
                Pick an attack above. The response below runs on a real clock, in milliseconds, exactly as the
                rail would behave.
              </p>
            ) : (
              <div className="grid gap-px bg-rule/15 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                <div className="bg-background p-5">
                  <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
                    Attack scenario
                  </p>
                  <p className="mt-2 font-display text-2xl leading-tight">{threat.label}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{threat.story}</p>
                  <Plain>{threat.plain}</Plain>
                  <div className="mt-5 border-t border-rule/15 pt-4">
                    <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
                      What the attacker gets
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{threat.outcome}</p>
                  </div>
                </div>

                <div className="bg-background">
                  {threat.steps.map((s, i) => {
                    const fired = inc.t >= s.atMs;
                    return (
                      <div
                        key={i}
                        className={`border-b border-rule/15 px-5 py-4 transition-opacity last:border-b-0 ${
                          fired ? "opacity-100" : "opacity-30"
                        }`}
                      >
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                          <span className="font-mono-ui text-[11px] uppercase tracking-[0.16em] text-primary">
                            T+{ms(s.atMs)}
                          </span>
                          <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            {s.kind}
                          </span>
                          <span className="font-mono-ui text-[11px] uppercase tracking-[0.12em]">{s.layer}</span>
                          <span className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-primary">
                            {ENGINE_META[s.engine].label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed">{s.action}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          <span className="font-mono-ui uppercase tracking-[0.12em] text-primary">Plain: </span>
                          {s.plain}
                        </p>
                        <p className="font-mono-ui mt-2 break-all text-[10px] tracking-wide text-muted-foreground/70">
                          evidence digest · {fired ? digestFor(threat.id, s.atMs) : "—".repeat(8)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <Plain>
            Nothing here is a screenshot. The timings, the containment order and the evidence fingerprints are
            produced live each time you press the button — and every one of those events is written into the
            same shared ledger the regulators read, so an incident can never be quietly deleted.
          </Plain>
        </section>

        <section id="design" className="mt-24 scroll-mt-24">
          <Rule label="03 — Why a federated design survives this" />
          <div className="grid gap-px bg-rule/15 md:grid-cols-3">
            {[
              {
                h: "No single copy to attack",
                b: "Eight nodes hold the same hash-chained record. A change is only real when a quorum agrees, so breaking one machine changes nothing.",
                p: "Everyone holds an identical sealed copy, so one bad copy is simply outvoted.",
              },
              {
                h: "Least-sight by statute",
                b: "Each regulator node receives only the fields its own statute entitles it to read. There is no all-seeing account to steal.",
                p: "No single login can see everything, so no single stolen password is worth much.",
              },
              {
                h: "Value never moves on trust",
                b: "The release instruction is checked against the beneficiary hash sealed at clearance. A changed account halts the payment before value leaves India.",
                p: "Money can only go to the account that was approved — nothing else.",
              },
            ].map((c) => (
              <div key={c.h} className="bg-background p-6">
                <p className="font-display text-2xl leading-tight">{c.h}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.b}</p>
                <p className="mt-3 border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">
                  {c.p}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="controls" className="mt-24 scroll-mt-24">
          <Rule label="04 — Control assurance map" />
          <SecurityControlMap />
        </section>

        <div className="mt-24">
          <div className="mb-10">
            <DeskProcess3D desk="security" />
          </div>
          <EngineRail desk="security" session={session} />
        </div>
      </div>
    </Frame>
  );
}
