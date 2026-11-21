import { ForecastLede } from "@/components/site/ForecastLede";
import { createFileRoute } from "@tanstack/react-router";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { useEffect, useMemo, useRef, useState } from "react";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { ProofVerifier, RegulatorStrip } from "@/components/site/Proof";
import { CASE, ONGC_APPROVAL, ONGC_AUTOMATIC, computeCase, crore, fx, inr, timelineFor, type CaseInput } from "@/lib/casefile";
import { ENGINE_META } from "@/lib/regulator";
import { buildLedger, clock, verifyChain, type LedgerEntry } from "@/lib/supervisor-sim";

const TITLE = "Supervisor View — CorpVidesh AI";
const DESC =
  "A simulated read-only ledger: run a treasury dataset and watch six Indian regulators at GIFT City read the same append-only record while the transaction is still forming.";

export const Route = createFileRoute("/supervisor")({
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
  component: Supervisor,
});

const PRESETS: { id: string; label: string; input: CaseInput }[] = [
  { id: "bil", label: "Bharat Industrials · ₹475 cr", input: CASE },
  { id: "ongc-a", label: "ONGC · ₹475 cr · Automatic", input: ONGC_AUTOMATIC },
  { id: "ongc-b", label: "ONGC · ₹4,75,000 cr · Approval", input: ONGC_APPROVAL },
];

const HUBS: { hub: string; ccy: string; rate: number }[] = [
  { hub: "Singapore", ccy: "SGD", rate: 63.42 },
  { hub: "Dubai (DIFC)", ccy: "AED", rate: 23.11 },
  { hub: "London", ccy: "GBP", rate: 108.4 },
  { hub: "New York", ccy: "USD", rate: 84.9 },
  { hub: "Zurich", ccy: "CHF", rate: 96.2 },
  { hub: "Mauritius", ccy: "MUR", rate: 1.86 },
];

const CR = 1_00_00_000;

const KIND_TONE: Record<string, string> = {
  seal: "Treasury write",
  proof: "Statutory proof",
  screen: "Screening",
  filing: "Filing",
  dispatch: "Fan-out",
  read: "Regulator attach",
  task: "Parallel check",
  attest: "Attestation",
  anchor: "Block anchor",
};

function Supervisor() {
  const [presetId, setPresetId] = useState(PRESETS[0]!.id);
  const preset = PRESETS.find((p) => p.id === presetId)!.input;

  const [netWorthCr, setNetWorthCr] = useState(preset.netWorth / CR);
  const [existingCr, setExistingCr] = useState(preset.existingCommitment / CR);
  const [proposedCr, setProposedCr] = useState(preset.proposed / CR);
  const [hubIdx, setHubIdx] = useState(0);

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id)!.input;
    setPresetId(id);
    setNetWorthCr(p.netWorth / CR);
    setExistingCr(p.existingCommitment / CR);
    setProposedCr(p.proposed / CR);
  }

  const hub = HUBS[hubIdx]!;
  const input: CaseInput = useMemo(
    () => ({
      ...preset,
      ref: `${preset.ref}-${hub.ccy}`,
      netWorth: netWorthCr * CR,
      existingCommitment: existingCr * CR,
      proposed: proposedCr * CR,
      targetHub: hub.hub,
      targetCurrency: hub.ccy,
      fxRate: hub.rate,
    }),
    [preset, netWorthCr, existingCr, proposedCr, hub],
  );

  const result = useMemo(() => computeCase(input), [input]);
  const timeline = useMemo(() => timelineFor(input), [input]);
  const ledger = useMemo(() => buildLedger(input), [input]);
  const totalS = ledger[ledger.length - 1]!.atS;

  /* ---------------- live clock ---------------- */
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(8);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    setT(0);
    setRunning(true);
  }, [input]);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const tick = (now: number) => {
      const d = (now - last) / 1000;
      last = now;
      setT((v) => {
        const next = v + d * speed;
        if (next >= totalS) {
          setRunning(false);
          return totalS;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [running, speed, totalS]);

  /* ---------------- line-by-line replay ---------------- */
  const [stepMode, setStepMode] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [stepSpeed, setStepSpeed] = useState(1);

  useEffect(() => setStepIdx(0), [input]);

  const stepTo = (i: number) => {
    const clamped = Math.max(0, Math.min(ledger.length - 1, i));
    setStepIdx(clamped);
    setT(ledger[clamped]!.atS);
  };

  function enterStepMode() {
    setRunning(false);
    setStepMode(true);
    const at = ledger.findIndex((e) => e.atS > t);
    const idx = at === -1 ? ledger.length - 1 : Math.max(0, at - 1);
    setStepIdx(idx);
    setT(ledger[idx]!.atS);
  }

  // Auto-advance the replay at 0.25x / 1x / 2x (1x = one ledger line per 1.6s).
  useEffect(() => {
    if (!stepMode || !autoPlay) return;
    if (stepIdx >= ledger.length - 1) {
      setAutoPlay(false);
      return;
    }
    const id = window.setTimeout(() => stepTo(stepIdx + 1), 1600 / stepSpeed);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepMode, autoPlay, stepSpeed, stepIdx, ledger]);

  useEffect(() => {
    if (!stepMode) setAutoPlay(false);
  }, [stepMode]);

  /* ---------------- per-line reviewer annotations ---------------- */
  const noteKey = `cv-supervisor-notes:${input.ref}`;
  const [notes, setNotes] = useState<Record<number, { text: string; by: string; at: string }>>({});
  const [draft, setDraft] = useState("");
  const [reviewer, setReviewer] = useState("Supervisor desk");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(noteKey);
      setNotes(raw ? JSON.parse(raw) : {});
    } catch {
      setNotes({});
    }
  }, [noteKey]);

  useEffect(() => {
    setDraft(focusNoteText());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, stepMode, notes]);

  function focusNoteText() {
    const seq = stepMode ? ledger[stepIdx]?.seq : undefined;
    return seq != null ? (notes[seq]?.text ?? "") : "";
  }

  function persistNotes(next: Record<number, { text: string; by: string; at: string }>) {
    setNotes(next);
    try {
      window.localStorage.setItem(noteKey, JSON.stringify(next));
    } catch {
      /* storage unavailable — annotations stay in memory for this session */
    }
  }

  function saveNote(seq: number) {
    const next = { ...notes };
    if (!draft.trim()) delete next[seq];
    else
      next[seq] = {
        text: draft.trim(),
        by: reviewer.trim() || "Supervisor desk",
        at: new Date().toISOString(),
      };
    persistNotes(next);
  }

  function exportNotes() {
    const rows = [
      ["seq", "clock", "node", "entry", "reviewer", "note", "annotated_at", "digest"],
      ...ledger
        .filter((e) => notes[e.seq])
        .map((e) => [
          String(e.seq),
          clock(e.atS),
          e.who,
          e.what,
          notes[e.seq]!.by,
          notes[e.seq]!.text,
          notes[e.seq]!.at,
          e.digest,
        ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${input.ref}-ledger-annotations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!stepMode) return;
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (ev.key === "ArrowRight" || ev.key === "ArrowDown") {
        ev.preventDefault();
        stepTo(stepIdx + 1);
      } else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") {
        ev.preventDefault();
        stepTo(stepIdx - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepMode, stepIdx, ledger]);

  const focus = stepMode ? ledger[stepIdx] : undefined;
  const visible = stepMode
    ? ledger.slice(0, stepIdx + 1)
    : ledger.filter((e) => e.atS <= t);

  /* ---------------- tamper demo ---------------- */
  const [tampered, setTampered] = useState(false);
  const chain: LedgerEntry[] = useMemo(() => {
    if (!tampered || ledger.length < 4) return ledger;
    const i = Math.floor(ledger.length / 2);
    const copy = ledger.slice();
    copy[i] = { ...copy[i]!, what: `${copy[i]!.what} (amount edited off-record)` };
    return copy;
  }, [ledger, tampered]);
  const breakAt = useMemo(() => verifyChain(chain), [chain]);

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-12 pt-14">
        <Rule label="Supervisor view — read-only ledger participant" />
        <h1 className="font-display max-w-4xl text-5xl lg:text-7xl">
          The regulator does not receive a report. It sits on the record.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Six Indian regulators operating across GIFT City, Gujarat, read the same append-only
          ledger the treasury writes to — while the transaction is still forming, not months after
          it settled. Enter a dataset below and watch that record being written, line by line.
        </p>

        <div className="mt-12 grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [`${timeline.actors.length}`, "Regulator nodes attached to this record"],
            [clock(totalS), "Wall-clock from treasury submit to block anchor"],
            [result.route, "Route elected by the dataset you entered"],
            [`${visible.length}/${ledger.length}`, "Ledger lines written so far"],
          ].map(([k, v]) => (
            <div key={v} className="bg-background p-6">
              <p className="font-display text-4xl text-primary lg:text-5xl">{k}</p>
              <p className="mt-2 text-sm text-muted-foreground">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="Supervisor ledger" focus={["clearance", "rework"]} />
      </section>

      {/* ---------------- dataset inputs ---------------- */}
      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="01 — Dataset inputs the record is built from" />
        <div className="grid gap-px bg-rule/15 lg:grid-cols-[1fr_1fr]">
          <div className="bg-background p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Filer">
                <select
                  value={presetId}
                  onChange={(e) => applyPreset(e.target.value)}
                  className="w-full border border-rule/30 bg-background px-3 py-2 text-sm"
                >
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Destination hub">
                <select
                  value={hubIdx}
                  onChange={(e) => setHubIdx(Number(e.target.value))}
                  className="w-full border border-rule/30 bg-background px-3 py-2 text-sm"
                >
                  {HUBS.map((h, i) => (
                    <option key={h.hub} value={i}>
                      {h.hub} · {h.ccy}
                    </option>
                  ))}
                </select>
              </Field>
              <Num label="Audited net worth (₹ cr)" value={netWorthCr} onChange={setNetWorthCr} />
              <Num label="Existing commitment (₹ cr)" value={existingCr} onChange={setExistingCr} />
              <Num label="Amount proposed now (₹ cr)" value={proposedCr} onChange={setProposedCr} />
              <Field label="Live FX reference">
                <p className="tnum font-mono-ui py-2 text-sm">
                  ₹ {hub.rate.toFixed(2)} / {hub.ccy}
                </p>
              </Field>
            </div>
            <p className="mt-5 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
              <span className="font-mono-ui mr-2 text-[10px] uppercase tracking-[0.16em] text-primary">
                In plain words
              </span>
              Three numbers and a destination are all the treasury types. Everything the regulator
              later reads is derived from them — nobody re-keys anything.
            </p>
          </div>

          <div className="bg-background p-6">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              What the dataset produces
            </p>
            <div className="mt-4 grid gap-px bg-rule/15 sm:grid-cols-2">
              {[
                ["Rule 7 ceiling (400%)", crore(result.ceiling)],
                ["Utilisation after deal", `${result.utilisationPct.toFixed(1)}%`],
                ["Headroom", crore(result.headroom)],
                ["Route", result.route],
                ["Section 195 withheld", inr(result.tds)],
                ["Total debited in India", inr(result.debitToAccount)],
                [`Credited in ${hub.hub}`, fx(result.netCredited, hub.ccy)],
                ["Sequential equivalent", `${Math.round(totalS * 2.4 / 60)} min manual`],
              ].map(([k, v]) => (
                <div key={k} className="bg-background p-4">
                  <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {k}
                  </p>
                  <p className="tnum mt-1 text-base text-primary">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- live ledger ---------------- */}
      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="02 — The record being created, live" />
        <div className="flex flex-wrap items-center gap-3 border border-rule/20 p-4">
          <button
            onClick={() => {
              setStepMode(false);
              if (t >= totalS) setT(0);
              setRunning((v) => !v);
            }}
            className="font-mono-ui bg-primary px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
          >
            {running ? "Pause" : t >= totalS ? "Replay" : "Run simulation"}
          </button>
          <button
            onClick={() => {
              setT(0);
              setStepIdx(0);
              setRunning(false);
            }}
            className="font-mono-ui border border-rule/30 px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
          >
            Reset
          </button>
          {[1, 4, 8, 20].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`font-mono-ui border px-3 py-2 text-[11px] uppercase tracking-[0.16em] ${
                speed === s ? "border-primary text-primary" : "border-rule/30 text-muted-foreground"
              }`}
            >
              {s}×
            </button>
          ))}
          <span className="tnum font-mono-ui ml-auto text-sm text-primary">
            T + {clock(t)} / {clock(totalS)}
          </span>
        </div>
        <div className="mt-3 h-1 w-full bg-rule/15">
          <div className="h-full bg-primary" style={{ width: `${(t / totalS) * 100}%` }} />
        </div>

        {/* line-by-line replay */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border border-rule/20 p-4">
          <button
            onClick={() => (stepMode ? setStepMode(false) : enterStepMode())}
            aria-pressed={stepMode}
            className={`font-mono-ui border px-4 py-2 text-[11px] uppercase tracking-[0.16em] ${
              stepMode ? "border-primary bg-primary text-primary-foreground" : "border-rule/30"
            }`}
          >
            {stepMode ? "Exit replay mode" : "Replay line by line"}
          </button>
          {stepMode && (
            <>
              <button
                onClick={() => stepTo(0)}
                className="font-mono-ui border border-rule/30 px-3 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                ⏮ First
              </button>
              <button
                onClick={() => stepTo(stepIdx - 1)}
                disabled={stepIdx === 0}
                className="font-mono-ui border border-rule/30 px-3 py-2 text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
              >
                ◀ Previous line
              </button>
              <button
                onClick={() => stepTo(stepIdx + 1)}
                disabled={stepIdx >= ledger.length - 1}
                className="font-mono-ui border border-primary px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-primary disabled:opacity-40"
              >
                Next line ▶
              </button>
              <button
                onClick={() => stepTo(ledger.length - 1)}
                className="font-mono-ui border border-rule/30 px-3 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                Last ⏭
              </button>
              <input
                type="range"
                min={0}
                max={ledger.length - 1}
                value={stepIdx}
                onChange={(e) => stepTo(Number(e.target.value))}
                aria-label="Ledger line"
                className="min-w-[160px] flex-1 accent-[hsl(var(--primary))]"
              />
              <span className="tnum font-mono-ui text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                line {stepIdx + 1} of {ledger.length} · ← → to step
              </span>
              <div className="flex w-full flex-wrap items-center gap-2 border-t border-rule/15 pt-3">
                <button
                  onClick={() => setAutoPlay((v) => !v)}
                  disabled={stepIdx >= ledger.length - 1 && !autoPlay}
                  className={`font-mono-ui border px-3 py-2 text-[11px] uppercase tracking-[0.16em] disabled:opacity-40 ${
                    autoPlay ? "border-primary bg-primary text-primary-foreground" : "border-rule/30"
                  }`}
                >
                  {autoPlay ? "❚❚ Pause auto-advance" : "▶ Auto-advance"}
                </button>
                <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  playback speed
                </span>
                {[0.25, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStepSpeed(s)}
                    aria-pressed={stepSpeed === s}
                    className={`font-mono-ui border px-3 py-2 text-[11px] uppercase tracking-[0.16em] ${
                      stepSpeed === s ? "border-primary text-primary" : "border-rule/30 text-muted-foreground"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
                <span className="tnum font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  one line every {(1.6 / stepSpeed).toFixed(2)}s
                </span>
                {Object.keys(notes).length > 0 && (
                  <button
                    onClick={exportNotes}
                    className="font-mono-ui ml-auto border border-rule/30 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-primary"
                  >
                    Export {Object.keys(notes).length} annotation(s) · CSV
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {focus && (
          <div className="mt-3 border border-primary/60 p-5">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Line #{String(focus.seq).padStart(3, "0")} · T + {clock(focus.atS)}
              </span>
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">
                {focus.who} · {KIND_TONE[focus.kind]}
              </span>
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {ENGINE_META[focus.engine].label}
              </span>
            </div>
            <p className="font-display mt-3 text-2xl leading-tight lg:text-3xl">{focus.what}</p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {focus.plain}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {ENGINE_META[focus.engine].note}
            </p>
            <div className="mt-4 grid gap-px bg-rule/15 sm:grid-cols-3">
              {[
                ["Value committed", focus.value ?? "—"],
                ["Previous digest", focus.prev],
                ["This digest", focus.digest],
              ].map(([k, v]) => (
                <div key={k} className="bg-background p-3">
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    {k}
                  </p>
                  <p className="tnum font-mono-ui mt-1 text-[12px] text-primary">{v}</p>
                </div>
              ))}
            </div>
            <p className="font-mono-ui mt-4 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Lane state at this instant
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {timeline.actors.map((a) => {
                const pick = timeline.dispatchS + a.pickupS;
                const done = focus.atS >= pick + a.durationS;
                const reading = focus.atS >= pick && !done;
                return (
                  <span
                    key={a.code}
                    className={`font-mono-ui border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${
                      done
                        ? "border-primary text-primary"
                        : reading
                          ? "border-primary/50 text-foreground"
                          : "border-rule/25 text-muted-foreground"
                    }`}
                  >
                    {a.code} · {done ? "attested" : reading ? "reading" : "waiting"}
                  </span>
                );
              })}
            </div>

            {/* lane-by-lane attestation comparison for this line */}
            <p className="font-mono-ui mt-6 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Lane-by-lane attestation status at line #{String(focus.seq).padStart(3, "0")}
            </p>
            <div className="mt-2 overflow-x-auto border border-rule/20">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr className="font-mono-ui border-b border-rule/20 bg-rule/[0.04] text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="px-3 py-2 font-normal">Regulator lane</th>
                    <th className="px-3 py-2 font-normal">Status now</th>
                    <th className="px-3 py-2 font-normal">Attached at</th>
                    <th className="px-3 py-2 font-normal">Gap to this line</th>
                    <th className="px-3 py-2 font-normal">Elapsed in lane</th>
                    <th className="px-3 py-2 font-normal">Checks cleared</th>
                    <th className="px-3 py-2 font-normal">Attests at</th>
                    <th className="px-3 py-2 font-normal">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.actors.map((a) => {
                    const pick = timeline.dispatchS + a.pickupS;
                    const end = pick + a.durationS;
                    const done = focus.atS >= end;
                    const reading = focus.atS >= pick && !done;
                    const elapsed = Math.max(0, Math.min(a.durationS, focus.atS - pick));
                    const cleared = a.tasks.filter((k) => focus.atS >= pick + k.atS + k.durationS).length;
                    const gap = focus.atS - pick;
                    return (
                      <tr key={a.code} className="border-b border-rule/12 last:border-b-0 align-top">
                        <td className="px-3 py-2">
                          <p className="font-mono-ui text-[11px] uppercase tracking-[0.14em] text-primary">
                            {a.code}
                          </p>
                          <p className="text-xs text-muted-foreground">{a.desk} · {a.officer}</p>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`font-mono-ui border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${
                              done
                                ? "border-primary text-primary"
                                : reading
                                  ? "border-primary/50 text-foreground"
                                  : "border-rule/25 text-muted-foreground"
                            }`}
                          >
                            {done ? "attested" : reading ? "reading" : "waiting"}
                          </span>
                        </td>
                        <td className="tnum font-mono-ui px-3 py-2 text-[11px]">{clock(pick)}</td>
                        <td className="tnum font-mono-ui px-3 py-2 text-[11px] text-primary">
                          {gap >= 0 ? `+${clock(gap)} in lane` : `−${clock(-gap)} to attach`}
                        </td>
                        <td className="tnum font-mono-ui px-3 py-2 text-[11px]">
                          {elapsed.toFixed(0)}s / {a.durationS}s
                        </td>
                        <td className="tnum font-mono-ui px-3 py-2 text-[11px]">
                          {cleared} of {a.tasks.length}
                        </td>
                        <td className="tnum font-mono-ui px-3 py-2 text-[11px]">{clock(end)}</td>
                        <td className="font-mono-ui px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {a.mode}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
              <span className="font-mono-ui mr-2 text-[10px] uppercase tracking-[0.16em] text-primary">
                In plain words
              </span>
              At the exact moment this line was written, this is where every regulator stood: who had
              picked the file up, how long they had held it, how many of their own checks were already
              finished, and when they will sign.
            </p>

            {/* reviewer annotation for this line */}
            <div className="mt-6 border border-rule/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  Reviewer annotation on line #{String(focus.seq).padStart(3, "0")}
                </p>
                <input
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  aria-label="Reviewer name"
                  className="w-56 border border-rule/30 bg-background px-3 py-1.5 text-xs"
                />
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="Attach a comment to this append-only entry — queries, observations, follow-ups."
                className="mt-3 w-full border border-rule/30 bg-background px-3 py-2 text-sm"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => saveNote(focus.seq)}
                  className="font-mono-ui bg-primary px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
                >
                  Save annotation
                </button>
                {notes[focus.seq] && (
                  <>
                    <button
                      onClick={() => {
                        setDraft("");
                        const next = { ...notes };
                        delete next[focus.seq];
                        persistNotes(next);
                      }}
                      className="font-mono-ui border border-rule/30 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Remove
                    </button>
                    <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {notes[focus.seq]!.by} · {new Date(notes[focus.seq]!.at).toLocaleString()}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Annotations sit alongside the record — the ledger line itself stays untouched, so the
                hash chain is unaffected.
              </p>
            </div>
          </div>
        )}

        {/* regulator lanes */}
        <div className="mt-8 grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-3">
          {timeline.actors.map((a) => {
            const pick = timeline.dispatchS + a.pickupS;
            const done = t >= pick + a.durationS;
            const reading = t >= pick && !done;
            const pct = Math.max(0, Math.min(1, (t - pick) / a.durationS));
            return (
              <div key={a.code} className="bg-background p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono-ui text-[11px] uppercase tracking-[0.14em] text-primary">
                    {a.code}
                  </p>
                  <span className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    {done ? "attested" : reading ? "reading record" : "waiting"}
                  </span>
                </div>
                <p className="mt-1 text-sm">{a.authority}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.desk} · {a.officer}</p>
                <div className="mt-3 h-1 w-full bg-rule/15">
                  <div
                    className={`h-full ${done ? "bg-primary" : "bg-primary/50"}`}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
                <p className="tnum font-mono-ui mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  attach {clock(pick)} · {a.durationS}s · {a.mode} · {a.tasks.length} parallel checks
                </p>
              </div>
            );
          })}
        </div>

        {/* ledger stream */}
        <div className="mt-8 border border-rule/20">
          <div className="font-mono-ui grid grid-cols-[54px_64px_78px_1fr] gap-4 border-b border-rule/20 bg-rule/[0.04] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>Seq</span>
            <span>Clock</span>
            <span>Node</span>
            <span>Entry written to the append-only record</span>
          </div>
          {visible.length === 0 && (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              Press “Run simulation” — the record writes itself from the dataset above.
            </p>
          )}
          {visible
            .slice()
            .reverse()
            .map((e) => (
              <div
                key={e.seq}
                className={`border-b border-rule/12 px-4 py-3 last:border-b-0 ${
                  focus && focus.seq === e.seq ? "bg-primary/[0.06] ring-1 ring-inset ring-primary/40" : ""
                }`}
              >
                <div className="grid grid-cols-[54px_64px_78px_1fr] items-start gap-4">
                  <span className="tnum font-mono-ui text-[11px] text-muted-foreground">
                    #{String(e.seq).padStart(3, "0")}
                  </span>
                  <span className="tnum font-mono-ui text-[11px] text-muted-foreground">
                    {clock(e.atS)}
                  </span>
                  <span className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-primary">
                    {e.who}
                  </span>
                  <div>
                    <p className="text-sm">{e.what}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{e.plain}</p>
                    <p className="font-mono-ui mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                      <span className="border border-rule/25 px-2 py-0.5">{KIND_TONE[e.kind]}</span>
                      <span>{ENGINE_META[e.engine].label}</span>
                      {e.value && <span className="text-primary">{e.value}</span>}
                      <span className="tnum">prev {e.prev} → {e.digest}</span>
                    </p>
                    {notes[e.seq] && (
                      <p className="mt-2 border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">
                        <span className="font-mono-ui mr-2 text-[9px] uppercase tracking-[0.16em] text-primary">
                          Note · {notes[e.seq]!.by}
                        </span>
                        {notes[e.seq]!.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
        <p className="mt-4 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Entries are append-only. Each line carries the digest of the line before it, so nothing
          above can be edited or removed after anchoring.
        </p>
      </section>

      {/* ---------------- chain integrity ---------------- */}
      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="03 — Prove the record has not been touched" />
        <div className="grid gap-px bg-rule/15 lg:grid-cols-[1fr_1fr]">
          <div className="bg-background p-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every regulator can re-walk the chain from the first line. If a single character of a
              single entry changes, every digest after it stops matching — and the supervisor sees
              exactly which line broke.
            </p>
            <button
              onClick={() => setTampered((v) => !v)}
              className="font-mono-ui mt-5 border border-primary px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-primary"
            >
              {tampered ? "Restore the original record" : "Simulate an off-record edit"}
            </button>
          </div>
          <div className="bg-background p-6">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Chain verification
            </p>
            {breakAt === null ? (
              <>
                <p className="font-display mt-2 text-4xl text-primary">CHAIN INTACT</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {chain.length} entries re-hashed from genesis; every digest matches.
                </p>
              </>
            ) : (
              <>
                <p className="font-display mt-2 text-4xl text-primary">BREAK AT #{String(breakAt).padStart(3, "0")}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Line {breakAt} no longer hashes to the digest the next line committed. The
                  supervisory nodes reject the edited copy and keep the anchored original.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Who sees what, and when" />
        <RegulatorStrip />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Verify a ceiling proof" />
        <ProofVerifier />
      </section>
      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Continue on the rail" />
        <div className="mb-10">
          <DeskProcess3D desk="supervisor" />
        </div>
        <EngineRail desk="supervisor" />
      </section>
    </Frame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono-ui block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="tnum w-full border border-rule/30 bg-background px-3 py-2 text-sm"
      />
    </Field>
  );
}
