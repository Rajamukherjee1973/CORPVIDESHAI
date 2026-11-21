import { ForecastLede } from "@/components/site/ForecastLede";
import { useCallback, useEffect, useRef, useState } from "react";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { createFileRoute } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { useSession } from "@/lib/session";
import {
  deleteRun,
  exportRuns,
  importRuns,
  listRuns,
  saveRun,
  type SavedRun,
} from "@/lib/saved-runs";
import { ENGINE_META } from "@/lib/regulator";
import { setFxPageContext, useFxStream, recordCapture, readTape } from "@/lib/fx-stream";
import { HUBS } from "@/data/hubs";
import { COUNTRY_META } from "@/data/currencies";
import { readShareFromUrl, shareUrl, type SharedDataset } from "@/lib/share-state";
import {
  ONGC_AUTOMATIC,
  SCENARIOS,
  computeCase,
  timelineFor,
  type CaseInput,
  crore,
  digestFor,
  gapRows,
  inr,
  mmss,
  sequentialSeconds,
  type AuditActor,
} from "@/lib/casefile";

const CASE_TEMPLATE = ONGC_AUTOMATIC;

function hubMeta(country: string) {
  return COUNTRY_META[country] ?? { iso2: "UN", currency: "USD", currencyName: "US Dollar" };
}

const TITLE = "Regulator Audit Timeline and a Worked Money Case | CorpVidesh AI";
const DESC =
  "Replay one live outbound remittance: when each of six regulators picked the packet up, what each ran in parallel, every hand-off gap in seconds, and the full monetary computation from treasury input to the amount credited abroad.";

export const Route = createFileRoute("/casefile")({
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
  component: CaseFilePage,
});

function Plain({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 border-l-2 border-primary bg-primary/[0.04] px-4 py-3">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">In plain words</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

/** Second-resolution clock used to replay the audit timeline. */
function useSecondsClock(total: number, speed: number) {
  const [t, setT] = useState(0);
  const [on, setOn] = useState(false);
  const start = useRef(0);
  const base = useRef(0);

  useEffect(() => {
    if (!on) return;
    start.current = Date.now();
    base.current = t >= total ? 0 : t;
    const id = window.setInterval(() => {
      const next = base.current + ((Date.now() - start.current) / 1000) * speed;
      if (next >= total) {
        setT(total);
        setOn(false);
        return;
      }
      setT(next);
    }, 50);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, total, speed]);

  const run = useCallback(() => setOn((v) => !v), []);
  const reset = useCallback(() => {
    setOn(false);
    setT(0);
  }, []);
  return { t, on, run, reset, setT };
}

function CaseFilePage() {
  const { session } = useSession();
  const [custom, setCustom] = useState<CaseInput | null>(null);
  const [activeId, setActiveId] = useState<string>(SCENARIOS[0]!.id);
  const [shared, setShared] = useState<SharedDataset[]>([]);
  const [chartFocus, setChartFocus] = useState<string | null>(null);
  const [chartHidden, setChartHidden] = useState<string[]>([]);
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const refreshRuns = useCallback(() => setRuns(listRuns()), []);
  useEffect(() => {
    refreshRuns();
    const h = () => refreshRuns();
    window.addEventListener("cv:runs", h);
    return () => window.removeEventListener("cv:runs", h);
  }, [refreshRuns]);

  const savedOptions = runs.map((r) => ({
    id: `saved:${r.id}`,
    label: `${r.name} · ${crore(r.input.proposed)}`,
    blurb: r.note || `Saved ${new Date(r.savedAt).toLocaleString("en-IN")}`,
    input: r.input,
    builtIn: false,
  }));

  const options = custom
    ? [
        ...SCENARIOS,
        ...savedOptions,
        ...shared.map((s) => ({ ...s, builtIn: false })),
        {
          id: "custom",
          label: `My dataset · ${crore(custom.proposed)}`,
          blurb: "Your own monetary dataset, run through the identical statutory pipeline.",
          input: custom,
          builtIn: false,
        },
      ]
    : [...SCENARIOS, ...savedOptions, ...shared.map((s) => ({ ...s, builtIn: false }))];
  const active = options.find((o) => o.id === activeId) ?? options[0]!;
  const [baselineId, setBaselineId] = useState<string>(SCENARIOS[0]!.id);
  const baseline = options.find((o) => o.id === baselineId) ?? options[0]!;

  const tape = useFxStream();

  // Hub override: point this case at any of the 52 hubs and its settlement
  // currency and intake rate are pulled straight off the live hub tape. The
  // intake rate is pinned to a print (not the sub-second walk) so the case is
  // stable to read, and re-pins on every fresh anchor — so the file re-prices
  // whenever the tape moves.
  const [hubCity, setHubCity] = useState<string>("");
  const hub = HUBS.find((h) => h.city === hubCity);
  const hubCode = hub ? hubMeta(hub.country).currency : "";
  const [pin, setPin] = useState<{ code: string; rate: number; at: number } | null>(null);

  useEffect(() => {
    if (!hub || !hubCode) {
      setPin(null);
      return;
    }
    const r = readTape().inrPer[hubCode];
    if (r) setPin({ code: hubCode, rate: r, at: Date.now() });
  }, [hub, hubCode, tape.anchor]);

  const repin = () => {
    if (!hubCode) return;
    const r = readTape().inrPer[hubCode];
    if (r) setPin({ code: hubCode, rate: r, at: Date.now() });
  };

  const CASE_IN: CaseInput =
    hub && pin
      ? { ...active.input, targetHub: hub.city, targetCurrency: pin.code, fxRate: pin.rate }
      : active.input;

  const result = computeCase(CASE_IN);
  const liveRate = tape.inrPer[CASE_IN.targetCurrency];

  // Automated live-FX capture for this case: the desk declares its currency and
  // notional, and every dataset switch is stamped against the live print.
  useEffect(() => {
    setFxPageContext({
      desk: "Case file",
      code: CASE_IN.targetCurrency,
      crore: CASE_IN.proposed / 1_00_00_000,
    });
    recordCapture(
      "Case file",
      "action",
      `Dataset loaded — ${CASE_IN.company} ${CASE_IN.targetHub}`,
      CASE_IN.targetCurrency,
      CASE_IN.proposed / 1_00_00_000,
    );
  }, [CASE_IN.targetCurrency, CASE_IN.proposed, CASE_IN.company, CASE_IN.targetHub]);
  const { actors, dispatchS, totalS } = timelineFor(CASE_IN);
  const rows = gapRows(actors, dispatchS);
  const [speed, setSpeed] = useState(8);
  const clock = useSecondsClock(totalS, speed);
  const [open, setOpen] = useState<string | null>(actors[0]!.code);

  // Restore a shared view (dataset, baseline, clicked step) from the URL fragment.
  useEffect(() => {
    const s = readShareFromUrl();
    if (!s) return;
    if (s.datasets.length) setShared(s.datasets);
    setActiveId(s.active);
    setBaselineId(s.baseline);
    setChartFocus(s.step);
    setChartHidden(s.hidden);
    if (s.actor) setOpen(s.actor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const link = () =>
    shareUrl({
      active: activeId,
      baseline: baselineId,
      step: chartFocus,
      actor: open,
      hidden: chartHidden,
      datasets: options
        .filter((o) => !o.builtIn)
        .map((o) => ({ id: o.id, label: o.label, blurb: o.blurb, input: o.input })),
    });

  const t = clock.t;
  const seq = sequentialSeconds(actors, dispatchS);
  const saved = seq - totalS;
  const live = actors.filter(
    (a) => t >= dispatchS + a.pickupS && t < dispatchS + a.pickupS + a.durationS,
  );
  const cleared = actors.filter((a) => t >= dispatchS + a.pickupS + a.durationS);

  const stepsRevealed = Math.min(
    result.steps.length,
    Math.max(1, Math.ceil((t / totalS) * result.steps.length) || 1),
  );

  return (
    <Frame>
      <div className="mx-auto max-w-[1400px] px-6 py-14">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">
          Section 08 — Regulator audit timeline and worked case file
        </p>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
          One filing. Six regulators. Every second accounted for.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          A real-shaped case file — {CASE_IN.company}, {crore(CASE_IN.proposed)} to {CASE_IN.targetHub} — replayed on a
          clock. The timeline records exactly when each authority picked the packet up, what it processed in
          parallel, and the gap between hand-offs. Below it, the same case is carried through the money
          pipeline, from the three numbers the treasury enters to the amount credited abroad.
        </p>
        <Plain>
          Instead of a file sitting on six desks one after another, all six read their own copy at almost the
          same moment. This page shows the stopwatch on every desk, and then shows the arithmetic on the money
          itself so nothing is taken on trust.
        </Plain>

        {/* -------------------------------------------------- dataset lab */}
        <section className="mt-16">
          <Rule label="00 — Choose or build the dataset to run" />
          <div className="grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
            {options.map((o) => {
              const r = computeCase(o.input);
              const on = o.id === active.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setActiveId(o.id);
                    clock.reset();
                  }}
                  aria-pressed={on}
                  className={`bg-background p-4 text-left ${on ? "outline outline-2 -outline-offset-2 outline-primary" : ""}`}
                >
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
                    {r.route} route {o.builtIn ? "· built-in" : "· yours"}
                  </p>
                  <p className="mt-1.5 font-display text-lg leading-tight tracking-tight">{o.label}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{o.blurb}</p>
                </button>
              );
            })}
          </div>
          <CustomBuilder
            onRun={(input) => {
              setCustom(input);
              setActiveId("custom");
              clock.reset();
            }}
          />
          <RunShelf
            runs={runs}
            current={CASE_IN}
            currentLabel={active.label}
            onSave={(name, note) => {
              saveRun(name, note, CASE_IN);
              refreshRuns();
            }}
            onLoad={(r) => {
              setCustom(r.input);
              setActiveId(`saved:${r.id}`);
              clock.reset();
            }}
            onDelete={(r) => {
              deleteRun(r.id);
              if (activeId === `saved:${r.id}`) setActiveId(SCENARIOS[0]!.id);
              refreshRuns();
            }}
            onImported={refreshRuns}
          />
          <Plain>
            Put your own three numbers in — what the company is worth, what it has already committed abroad and
            what it wants to send now. The identical statutory engine runs on your figures, and the table at the
            bottom of this page puts your result side by side with the ONGC ₹475 crore automatic-route run and
            the ONGC ₹4,75,000 crore approval-route run.
          </Plain>
        </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="Case file" focus={["clearance", "cost", "drift"]} />
      </section>

        {/* -------------------------------------------------- case header */}
        <section className="mt-16">
          <Rule label="01 — The case file" />
          <div className="grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["Reference", CASE_IN.ref],
              ["Filing entity", CASE_IN.company],
              ["CIN", CASE_IN.cin],
              ["AD bank", CASE_IN.adBank],
              ["Corridor", `${CASE_IN.targetHub} · ${CASE_IN.targetCurrency}`],
              ["Purpose", CASE_IN.purpose],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                <p className="mt-1.5 text-sm leading-snug">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-px grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Audited net worth", crore(CASE_IN.netWorth)],
              ["Already committed abroad", crore(CASE_IN.existingCommitment)],
              ["Proposed now", crore(CASE_IN.proposed)],
              ["Route determined", `${result.route} · ${result.utilisationPct.toFixed(1)}% of ceiling`],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                <p className="mt-1.5 font-display text-2xl tracking-tight text-primary">{v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------- timeline */}
        <section className="mt-20">
          <Rule label="02 — Regulator pickup timeline, replayed live" />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={clock.run}
              className="font-mono-ui bg-primary px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
            >
              {clock.on ? "Pause replay" : t > 0 && t < totalS ? "Resume replay" : "Run the replay"}
            </button>
            <button
              onClick={clock.reset}
              className="font-mono-ui border border-rule/25 px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
            >
              Reset
            </button>
            <div className="flex items-center gap-2">
              {[1, 4, 8, 20].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  aria-pressed={speed === s}
                  className={`font-mono-ui border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${
                    speed === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-rule/25 text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
            <span className="font-mono-ui text-[11px] uppercase tracking-[0.16em] text-primary">
              T+{mmss(t)} / {mmss(totalS)} · {live.length} desk{live.length === 1 ? "" : "s"} working ·{" "}
              {cleared.length}/{actors.length} cleared
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={totalS}
            step={1}
            value={Math.round(t)}
            onChange={(e) => clock.setT(Number(e.target.value))}
            aria-label="Scrub the regulator audit timeline"
            className="mt-5 w-full accent-primary"
          />

          <div className="mt-6 border border-rule/20">
            <div className="hidden grid-cols-[1.5fr_3fr_0.9fr] gap-4 border-b border-rule/20 px-4 py-2 lg:grid">
              {["Authority and officer", "Pickup → hold → clearance", "Gap to pickup"].map((h) => (
                <p key={h} className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  {h}
                </p>
              ))}
            </div>

            {/* dispatch bar */}
            <div className="grid gap-2 border-b border-rule/20 px-4 py-3 lg:grid-cols-[1.5fr_3fr_0.9fr] lg:gap-4">
              <div>
                <p className="font-mono-ui text-[11px] uppercase tracking-[0.14em] text-primary">
                  Rail gateway
                </p>
                <p className="text-xs text-muted-foreground">Validation, fan-out, ledger commit</p>
              </div>
              <div className="h-3 w-full border border-rule/25">
                <div
                  className="h-full bg-primary/40"
                  style={{ width: `${Math.min(100, (Math.min(t, dispatchS) / totalS) * 100)}%` }}
                />
              </div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                dispatch at T+{mmss(dispatchS)}
              </p>
            </div>

            <ul className="divide-y divide-rule/12">
              {actors.map((a) => {
                const row = rows.find((r) => r.code === a.code)!;
                const started = t >= row.pickupAtS;
                const done = t >= row.finishAtS;
                const pct = Math.min(
                  100,
                  Math.max(0, ((t - row.pickupAtS) / a.durationS) * 100),
                );
                const left = (row.pickupAtS / totalS) * 100;
                const width = (a.durationS / totalS) * 100;
                const expanded = open === a.code;
                return (
                  <li key={a.code}>
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : a.code)}
                      aria-expanded={expanded}
                      className="grid w-full gap-2 px-4 py-3 text-left lg:grid-cols-[1.5fr_3fr_0.9fr] lg:items-center lg:gap-4"
                    >
                      <div>
                        <p className="font-mono-ui text-[11px] uppercase tracking-[0.14em] text-primary">
                          {a.code} {expanded ? "−" : "+"}
                        </p>
                        <p className="text-sm leading-snug">{a.officer}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.desk} · {a.mode === "manual" ? "human sign-off" : "machine cleared"}
                        </p>
                      </div>
                      <div className="relative h-6 w-full border border-rule/20 bg-rule/5">
                        <div
                          className="absolute inset-y-0 border border-primary/40"
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <div
                            className={`h-full ${done ? "bg-primary" : started ? "bg-primary/70" : "bg-transparent"}`}
                            style={{ width: `${started ? pct : 0}%` }}
                          />
                        </div>
                        <div
                          className="absolute inset-y-0 w-px bg-foreground/60"
                          style={{ left: `${Math.min(100, (t / totalS) * 100)}%` }}
                        />
                      </div>
                      <div>
                        <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">
                          +{row.waitS}s after dispatch
                        </p>
                        <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                          holds {row.durationS}s · overlaps {row.overlapS}s
                        </p>
                      </div>
                    </button>

                    {expanded ? <ActorDetail actor={a} t={t} pickupAtS={row.pickupAtS} /> : null}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-px grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Parallel wall-clock", mmss(totalS)],
              ["Same work, one desk at a time", mmss(seq)],
              ["Seconds saved by parallelism", `${saved}s`],
              ["Longest hand-off gap", `${Math.max(...rows.map((r) => r.staggerS))}s`],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                <p className="mt-1.5 font-display text-3xl tracking-tight text-primary">{v}</p>
              </div>
            ))}
          </div>
          <Plain>
            Every bar above starts before the one before it has finished. That overlap is the whole point: the
            six authorities are reading their own sealed copy at the same time, so the file clears in{" "}
            {mmss(totalS)} instead of {mmss(seq)} — and the exact wait before each desk opened the packet
            is on the record, in seconds, permanently.
          </Plain>
        </section>

        {/* -------------------------------------------------- gap matrix */}
        <section className="mt-20">
          <Rule label="03 — Hand-off gap ledger" />
          <div className="overflow-x-auto border border-rule/20">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-rule/20">
                  {["Authority", "Picked up at", "Wait after dispatch", "Gap from previous pickup", "Held for", "Cleared at", "Overlapped"].map(
                    (h) => (
                      <th
                        key={h}
                        className="font-mono-ui px-4 py-2 text-left text-[9px] uppercase tracking-[0.16em] text-muted-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code} className="border-b border-rule/12">
                    <td className="font-mono-ui px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-primary">
                      {r.code}
                    </td>
                    <td className="px-4 py-2.5 text-sm">T+{mmss(r.pickupAtS)}</td>
                    <td className="px-4 py-2.5 text-sm">{r.waitS}s</td>
                    <td className="px-4 py-2.5 text-sm">{r.staggerS ? `${r.staggerS}s` : "first desk"}</td>
                    <td className="px-4 py-2.5 text-sm">{r.durationS}s</td>
                    <td className="px-4 py-2.5 text-sm">T+{mmss(r.finishAtS)}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{r.overlapS}s with another desk</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Plain>
            A gap is not a delay to hide — it is evidence. If an authority ever sat on a packet longer than its
            band, this table is where it shows up, and the same rows are what an auditor or a court would read
            years later.
          </Plain>
        </section>

        {/* -------------------------------------------------- money pipeline */}
        <section className="mt-20">
          <Rule label="04 — The money, computed step by step" />
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The same case carried through the arithmetic. Each step names what went in, the formula applied, the
            statute behind it and what came out. Steps unlock as the replay above advances — or read them all
            straight away.
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-4 border border-rule/20 p-5">
            <label className="font-mono-ui block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Destination hub — pulls currency and rate from the live tape
              <select
                value={hubCity}
                onChange={(e) => {
                  setHubCity(e.target.value);
                  const h = HUBS.find((x) => x.city === e.target.value);
                  if (h)
                    recordCapture(
                      "Case file",
                      "action",
                      `Hub switched — ${h.city}`,
                      hubMeta(h.country).currency,
                      CASE_IN.proposed / 1_00_00_000,
                    );
                }}
                className="mt-2 block w-80 max-w-full border border-rule/25 bg-transparent px-3 py-2.5 text-sm tracking-normal outline-none focus:border-primary"
              >
                <option value="">Use the hub on the dataset ({active.input.targetHub})</option>
                {HUBS.map((h) => (
                  <option key={h.city} value={h.city}>
                    {h.city} — {h.country} ({hubMeta(h.country).currency})
                  </option>
                ))}
              </select>
            </label>
            <div>
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Intake rate in force
              </p>
              <p className="font-display tnum mt-1 text-2xl text-primary">
                ₹{CASE_IN.fxRate.toFixed(4)} / {CASE_IN.targetCurrency}
              </p>
              <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                {pin
                  ? `pinned off the live tape at ${new Date(pin.at).toLocaleTimeString("en-IN")} · re-pins on every anchor`
                  : "stamped on the dataset at intake"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                repin();
                recordCapture(
                  "Case file",
                  "action",
                  `Case re-priced on live tape — ${CASE_IN.ref}`,
                  CASE_IN.targetCurrency,
                  CASE_IN.proposed / 1_00_00_000,
                );
              }}
              disabled={!hubCity}
              className="font-mono-ui border border-primary bg-primary px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-40"
            >
              Re-price on the current print
            </button>
          </div>
          <Plain>
            Point the case at any of the fifty-two hubs and it settles in that hub's currency at the rate that
            is live right now — the withholding, the bank charges and the amount credited abroad all recompute
            underneath. Every switch and re-pricing is written to the rate log at the foot of the page.
          </Plain>



          <div className="mt-6 grid gap-px border border-rule/20 bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-background p-4">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Live tape · {CASE_IN.targetCurrency}/INR
              </p>
              <p className="font-display tnum mt-1 text-2xl text-primary">
                {liveRate ? `₹${liveRate.toFixed(4)}` : "—"}
              </p>
              <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                print #{tape.seq} · {tape.status}
              </p>
            </div>
            <div className="bg-background p-4">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Rate on this case file
              </p>
              <p className="font-display tnum mt-1 text-2xl">₹{CASE_IN.fxRate.toFixed(4)}</p>
              <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                stamped at intake
              </p>
            </div>
            <div className="bg-background p-4">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Drift since intake
              </p>
              <p className="font-display tnum mt-1 text-2xl text-primary">
                {liveRate ? `${(((liveRate - CASE_IN.fxRate) / CASE_IN.fxRate) * 100).toFixed(2)}%` : "—"}
              </p>
              <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                re-priced every print
              </p>
            </div>
            <div className="bg-background p-4">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Credited abroad at live rate
              </p>
              <p className="font-display tnum mt-1 text-2xl">
                {liveRate
                  ? `${CASE_IN.targetCurrency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format((result.debitToAccount / liveRate))}`
                  : "—"}
              </p>
              <button
                type="button"
                onClick={() =>
                  recordCapture(
                    "Case file",
                    "action",
                    `Money pipeline re-priced — ${CASE_IN.ref}`,
                    CASE_IN.targetCurrency,
                    CASE_IN.proposed / 1_00_00_000,
                  )
                }
                className="font-mono-ui mt-2 border border-rule/30 px-3 py-1 text-[9px] uppercase tracking-[0.14em] transition-colors hover:border-primary hover:text-primary"
              >
                Capture this print
              </button>
            </div>
          </div>
          <Plain>
            The case was priced at the rate that was live when the treasury committed it. The rail keeps
            watching the tape, so any drift between that stamped print and the market right now is visible to
            the regulator on the same record — and every capture is written to the automated FX log at the foot
            of the page.
          </Plain>

          <ol className="mt-8 border border-rule/20">
            {result.steps.map((s, i) => {
              const revealed = i < stepsRevealed;
              return (
                <li
                  key={s.id}
                  className={`border-b border-rule/12 px-4 py-5 last:border-b-0 ${revealed ? "" : "opacity-45"}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="font-display text-xl tracking-tight">{s.title}</p>
                    <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
                      {ENGINE_META[s.engine].label}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1.4fr_1fr]">
                    <div>
                      <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                        Inputs
                      </p>
                      <ul className="mt-2 grid gap-1">
                        {s.inputs.map((x) => (
                          <li key={x.label} className="text-xs leading-relaxed">
                            <span className="text-muted-foreground">{x.label} — </span>
                            {x.value}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                        Computation
                      </p>
                      <p className="font-mono-ui mt-2 border-l-2 border-primary pl-3 text-xs leading-relaxed">
                        {s.formula}
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{s.note}</p>
                    </div>
                    <div>
                      <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                        Output
                      </p>
                      <p className="mt-2 font-display text-2xl tracking-tight text-primary">
                        {s.output.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.output.label}</p>
                      <p className="font-mono-ui mt-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                        digest {digestFor(s.id, "calc")}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
                    In plain words: {s.plain}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="mt-px grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Debited in India", inr(result.debitToAccount)],
              ["Tax withheld u/s 195", inr(result.tds)],
              ["Rate dealt", `₹ ${result.dealtRate.toFixed(2)} / ${CASE_IN.targetCurrency}`],
              [
                `Credited in ${CASE_IN.targetHub}`,
                `${CASE_IN.targetCurrency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(result.netCredited)}`,
              ],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                <p className="mt-1.5 font-display text-2xl tracking-tight text-primary">{v}</p>
              </div>
            ))}
          </div>
          <Plain>
            Start: three numbers from the balance sheet. Finish: an exact figure in a Singapore account, with
            the ceiling, the tax reasoning, the exchange rate and every fee sealed into the same block the
            regulators hold. Anyone can re-run this arithmetic and land on the same number.
          </Plain>
        </section>

        {/* -------------------------------------------------- comparison */}
        <section className="mt-20">
          <Rule label="05 — Your dataset against the built-in simulations" />
          <div className="mb-px flex flex-wrap items-center gap-3 border border-rule/20 p-4">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
              Compare against baseline
            </p>
            <select
              value={baselineId}
              onChange={(e) => setBaselineId(e.target.value)}
              className="font-mono-ui border border-rule/30 bg-background px-3 py-1.5 text-[11px] uppercase tracking-[0.12em]"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="mr-1 inline-block h-2 w-2 translate-y-[1px] bg-primary" /> changed against baseline
              <span className="ml-4 mr-1 inline-block h-2 w-2 translate-y-[1px] border border-rule/40" /> identical
            </span>
          </div>
          <div className="overflow-x-auto border border-rule/20">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-rule/20">
                  <th className="font-mono-ui px-4 py-2 text-left text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    Measure
                  </th>
                  {options.map((o) => (
                    <th
                      key={o.id}
                      className={`font-mono-ui px-4 py-2 text-left text-[9px] uppercase tracking-[0.16em] ${o.id === active.id ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {o.label}
                      {o.id === baselineId ? (
                        <span className="ml-2 border border-rule/40 px-1 py-px text-[8px] tracking-[0.1em]">
                          baseline
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([label, pick]) => {
                  const baseVal = pick(baseline.input);
                  const changedCount = options.filter(
                    (o) => o.id !== baselineId && pick(o.input) !== baseVal,
                  ).length;
                  return (
                    <tr
                      key={label}
                      className={`border-b border-rule/12 ${changedCount ? "bg-primary/[0.03]" : ""}`}
                    >
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">
                        {label}
                        {changedCount ? (
                          <span className="font-mono-ui ml-2 text-[9px] uppercase tracking-[0.12em] text-primary">
                            {changedCount} differ
                          </span>
                        ) : null}
                      </td>
                      {options.map((o) => {
                        const v = pick(o.input);
                        const isBase = o.id === baselineId;
                        const changed = !isBase && v !== baseVal;
                        return (
                          <td
                            key={o.id}
                            className={`px-4 py-2.5 text-sm ${
                              changed
                                ? "border-l-2 border-primary bg-primary/[0.07] font-semibold text-primary"
                                : isBase
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                            }`}
                            title={changed ? `baseline: ${baseVal}` : "same as baseline"}
                          >
                            {v}
                            {changed ? (
                              <span className="font-mono-ui ml-2 block text-[9px] uppercase tracking-[0.12em] text-muted-foreground line-through">
                                {baseVal}
                              </span>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <StepTimelineChart
            baseline={baseline}
            options={options}
            focus={chartFocus}
            onFocus={setChartFocus}
            hidden={chartHidden}
            onHidden={setChartHidden}
          />

          <StepDiff baseline={baseline} options={options} />

          <Plain>
            Same engine, same statute, three different sets of numbers. At ₹475 crore ONGC stays under the 400%
            ceiling and clears automatically in minutes. At ₹4,75,000 crore the same company breaches the
            ceiling, so the file is forced onto the approval route — every desk switches to human sign-off, extra
            work is added, and the clock stretches. Your own dataset lands wherever the arithmetic puts it. Every
            cell marked in red is a value that moved away from the baseline column you picked — the old figure is
            struck through underneath it, so you can see at a glance which route, which ceiling and which
            approval-step clock times actually changed.
          </Plain>

          <ShareLink build={link} />
        </section>

        <div className="mt-20">
          <div className="mb-10">
            <DeskProcess3D desk="regulator" />
          </div>
          <EngineRail desk="regulator" session={session} />
        </div>
      </div>
    </Frame>
  );
}

type CompareOption = { id: string; label: string; input: CaseInput };

/** Absolute clock stamp for an actor event, measured from treasury submission. */
function stampsFor(input: CaseInput) {
  const { actors, dispatchS } = timelineFor(input);
  const map = new Map<
    string,
    { authority: string; pickup: number; done: number; mode: string; duration: number }
  >();
  for (const a of actors) {
    map.set(a.code, {
      authority: a.authority,
      pickup: dispatchS + a.pickupS,
      done: dispatchS + a.pickupS + a.durationS,
      mode: a.mode,
      duration: a.durationS,
    });
  }
  return map;
}

function delta(now: number, base: number) {
  const d = now - base;
  if (d === 0) return null;
  return `${d > 0 ? "+" : "−"}${mmss(Math.abs(d))}`;
}

/** Approval-step timestamp diff: which desk moved, by how many seconds, and which desks appeared. */
function StepDiff({ baseline, options }: { baseline: CompareOption; options: CompareOption[] }) {
  const baseStamps = stampsFor(baseline.input);
  const stamps = options.map((o) => ({ o, m: stampsFor(o.input) }));
  const codes: string[] = [];
  for (const s of stamps) for (const c of s.m.keys()) if (!codes.includes(c)) codes.push(c);

  return (
    <div className="mt-px overflow-x-auto border border-rule/20">
      <table className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr className="border-b border-rule/20">
            <th className="font-mono-ui px-4 py-2 text-left text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Approval step · pick-up → cleared (clock from submission)
            </th>
            {stamps.map(({ o }) => (
              <th
                key={o.id}
                className="font-mono-ui px-4 py-2 text-left text-[9px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                {o.label}
                {o.id === baseline.id ? (
                  <span className="ml-2 border border-rule/40 px-1 py-px text-[8px] tracking-[0.1em]">
                    baseline
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {codes.map((code) => {
            const b = baseStamps.get(code);
            const moved = stamps.some(({ o, m }) => {
              if (o.id === baseline.id) return false;
              const s = m.get(code);
              if (!s || !b) return true;
              return s.pickup !== b.pickup || s.done !== b.done || s.mode !== b.mode;
            });
            return (
              <tr key={code} className={`border-b border-rule/12 ${moved ? "bg-primary/[0.03]" : ""}`}>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">
                  <span className="font-mono-ui text-[11px] tracking-[0.1em] text-foreground">{code}</span>
                  {!b ? (
                    <span className="font-mono-ui ml-2 text-[9px] uppercase tracking-[0.12em] text-primary">
                      step added by this route
                    </span>
                  ) : null}
                </td>
                {stamps.map(({ o, m }) => {
                  const s = m.get(code);
                  const isBase = o.id === baseline.id;
                  if (!s)
                    return (
                      <td
                        key={o.id}
                        className="border-l-2 border-primary bg-primary/[0.07] px-4 py-2.5 font-mono-ui text-[11px] uppercase tracking-[0.12em] text-primary"
                      >
                        not on this route
                      </td>
                    );
                  const changed =
                    !isBase && (!b || s.pickup !== b.pickup || s.done !== b.done || s.mode !== b.mode);
                  const dp = b && !isBase ? delta(s.pickup, b.pickup) : null;
                  const dd = b && !isBase ? delta(s.done, b.done) : null;
                  return (
                    <td
                      key={o.id}
                      className={`px-4 py-2.5 text-sm ${
                        changed ? "border-l-2 border-primary bg-primary/[0.07]" : ""
                      }`}
                    >
                      <span
                        className={`font-mono-ui text-[12px] ${changed ? "font-semibold text-primary" : "text-foreground"}`}
                      >
                        {mmss(s.pickup)} → {mmss(s.done)}
                      </span>
                      <span className="font-mono-ui mt-1 block text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                        {s.mode === "manual" ? "human sign-off" : "machine cleared"}
                        {b && s.mode !== b.mode ? " · mode changed" : ""}
                      </span>
                      {dp || dd ? (
                        <span className="font-mono-ui mt-1 block text-[9px] uppercase tracking-[0.12em] text-primary">
                          pick-up {dp ?? "same"} · cleared {dd ?? "same"}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const COMPARISON: [string, (c: CaseInput) => string][] = [
  ["Filing entity", (c) => c.company],
  ["Amount proposed", (c) => crore(c.proposed)],
  ["Rule 7 ceiling (400% of net worth)", (c) => crore(computeCase(c).ceiling)],
  ["Commitment after this deal", (c) => crore(computeCase(c).afterThisDeal)],
  ["Ceiling utilisation", (c) => `${computeCase(c).utilisationPct.toFixed(1)}%`],
  ["Headroom left", (c) => crore(computeCase(c).headroom)],
  ["Route determined", (c) => computeCase(c).route],
  ["Clearance mode", (c) => (computeCase(c).route === "Automatic" ? "Machine cleared, post-facto report" : "Prior approval, human sign-off at every desk")],
  ["Total debited in India", (c) => inr(computeCase(c).debitToAccount)],
  ["Credited abroad", (c) => fxOut(c)],
  ["Parallel wall-clock", (c) => mmss(timelineFor(c).totalS)],
  ["Same work one desk at a time", (c) => mmss(sequentialSeconds(timelineFor(c).actors, timelineFor(c).dispatchS))],
  [
    "Seconds saved by parallel rail",
    (c) => {
      const tl = timelineFor(c);
      return `${sequentialSeconds(tl.actors, tl.dispatchS) - tl.totalS}s`;
    },
  ],
];

function fxOut(c: CaseInput) {
  const r = computeCase(c);
  return `${c.targetCurrency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(r.netCredited)}`;
}

/** Name, save, reload, export and import simulation runs. */
function RunShelf({
  runs,
  current,
  currentLabel,
  onSave,
  onLoad,
  onDelete,
  onImported,
}: {
  runs: SavedRun[];
  current: CaseInput;
  currentLabel: string;
  onSave: (name: string, note: string) => void;
  onLoad: (r: SavedRun) => void;
  onDelete: (r: SavedRun) => void;
  onImported: () => void;
}) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div className="mt-px border border-rule/20 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Saved simulation runs — {runs.length} on the shelf
        </p>
        <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          currently loaded · {currentLabel}
        </p>
      </div>

      <form
        className="mt-4 grid gap-4 md:grid-cols-[1fr_1.6fr_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(name, note);
          setMsg(`Saved "${name.trim() || "Run"}" · ${crore(current.proposed)}`);
          setName("");
          setNote("");
        }}
      >
        <label className="block">
          <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Name this run
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Q3 Singapore stress case"
            className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Note for the board pack
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tests the ceiling breach at 4.8× net worth"
            className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="font-mono-ui bg-primary px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
        >
          Save current run
        </button>
      </form>

      {runs.length ? (
        <ul className="mt-5 border border-rule/15">
          {runs.map((r) => {
            const res = computeCase(r.input);
            return (
              <li
                key={r.id}
                className="grid gap-3 border-b border-rule/12 px-4 py-3 last:border-b-0 lg:grid-cols-[1.4fr_1.4fr_auto] lg:items-center"
              >
                <div>
                  <p className="text-sm leading-snug">{r.name}</p>
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    {r.input.company} · saved {new Date(r.savedAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">
                    {crore(r.input.proposed)} · {res.route} route · {res.utilisationPct.toFixed(1)}% of ceiling
                  </p>
                  {r.note ? <p className="text-xs leading-relaxed text-muted-foreground">{r.note}</p> : null}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onLoad(r)}
                    className="font-mono-ui border border-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-primary"
                  >
                    Reload
                  </button>
                  <button
                    onClick={() => onDelete(r)}
                    className="font-mono-ui border border-rule/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          Nothing saved yet. Run a dataset above, give it a name, and it will sit here for reload — on this
          browser, with no server copy.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            const blob = new Blob([exportRuns()], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "corpvidesh-saved-runs.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="font-mono-ui border border-rule/25 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
        >
          Export shelf (JSON)
        </button>
        <label className="font-mono-ui cursor-pointer border border-rule/25 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary">
          Import shelf
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const n = importRuns(await file.text());
                onImported();
                setMsg(`Imported ${n} run${n === 1 ? "" : "s"}`);
              } catch {
                setMsg("That file could not be read as a saved-run shelf");
              }
              e.target.value = "";
            }}
          />
        </label>
        {msg ? (
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">{msg}</span>
        ) : null}
      </div>
    </div>
  );
}

/** Build a dataset of your own and run it through the same pipeline. */
function CustomBuilder({ onRun }: { onRun: (input: CaseInput) => void }) {
  const tape = useFxStream();
  const [f, setF] = useState({
    company: "My Corporation Limited",
    netWorth: "25000",
    existingCommitment: "4000",
    proposed: "475",
    targetHub: "Singapore",
    targetCurrency: "SGD",
    fxRate: "63.42",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  const cr = (v: string) => Math.max(0, Number(v) || 0) * 1_00_00_000;
  const live = tape.inrPer[(f.targetCurrency || "SGD").toUpperCase()];

  // Keep the builder priced off the live tape: when the currency resolves on the
  // stream, the rupee rate follows the market print automatically.
  useEffect(() => {
    if (live) setF((v) => ({ ...v, fxRate: live.toFixed(4) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.targetCurrency, tape.anchor]);

  return (
    <form
      className="mt-px border border-rule/20 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onRun({
          ...CASE_TEMPLATE,
          ref: `CV-ODI-2026-USER-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          company: f.company.trim() || "My Corporation Limited",
          netWorth: cr(f.netWorth),
          existingCommitment: cr(f.existingCommitment),
          proposed: cr(f.proposed),
          targetHub: f.targetHub.trim() || "Singapore",
          targetCurrency: (f.targetCurrency.trim() || "SGD").toUpperCase(),
          fxRate: Math.max(0.01, Number(f.fxRate) || 63.42),
        });
      }}
    >
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
        Run my own monetary dataset
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        {([
          ["company", "Entity name", "text"],
          ["netWorth", "Net worth (₹ cr)", "number"],
          ["existingCommitment", "Already committed (₹ cr)", "number"],
          ["proposed", "Proposed now (₹ cr)", "number"],
          ["targetHub", "Target hub", "text"],
          ["targetCurrency", "Currency", "text"],
          ["fxRate", "₹ per unit", "number"],
        ] as const).map(([k, label, type]) => (
          <label key={k} className="block">
            <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </span>
            <input
              type={type}
              step="any"
              value={f[k]}
              onChange={set(k)}
              className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
        ))}
      </div>
      <button
        type="submit"
        className="font-mono-ui mt-4 bg-primary px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
      >
        Run this dataset
      </button>
      <span className="font-mono-ui ml-4 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        {live
          ? `Priced on the live tape · ${(f.targetCurrency || "SGD").toUpperCase()}/INR ₹${live.toFixed(4)} · print #${tape.seq}`
          : "Awaiting a live print for this currency — edit the rate manually"}
      </span>
    </form>
  );
}

/** Expanded view: what this authority ran in parallel, with per-task timing. */
function ActorDetail({ actor, t, pickupAtS }: { actor: AuditActor; t: number; pickupAtS: number }) {
  const local = t - pickupAtS;
  return (
    <div className="border-t border-rule/12 bg-rule/[0.03] px-4 py-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_2.2fr]">
        <div>
          <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Mandate</p>
          <p className="mt-1.5 text-sm leading-relaxed">{actor.authority}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{actor.mandate}</p>
          <p className="mt-3 border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">
            In plain words: {actor.plain}
          </p>
        </div>
        <div>
          <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Processed in parallel inside this desk
          </p>
          <ul className="mt-2 divide-y divide-rule/12 border border-rule/15">
            {actor.tasks.map((task) => {
              const started = local >= task.atS;
              const done = local >= task.atS + task.durationS;
              const pct = Math.min(100, Math.max(0, ((local - task.atS) / task.durationS) * 100));
              return (
                <li key={task.label} className="grid gap-2 px-3 py-2.5 xl:grid-cols-[1.4fr_1fr_1.2fr] xl:items-center xl:gap-4">
                  <p className="text-xs leading-snug">{task.label}</p>
                  <div className="h-2 w-full border border-rule/25">
                    <div className="h-full bg-primary" style={{ width: `${started ? pct : 0}%` }} />
                  </div>
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    +{task.atS}s → +{task.atS + task.durationS}s · {ENGINE_META[task.engine].label} ·{" "}
                    <span className={done ? "text-primary" : ""}>{done ? task.result : "running"}</span>
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {actor.outcome} — evidence digest{" "}
            <span className="font-mono-ui text-primary">{digestFor(actor.code, "clear")}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Interactive Gantt of the approval clock: one lane per dataset per step,
 *  bars drawn on a shared scale, baseline shadow behind every moved bar. */
function StepTimelineChart({
  baseline,
  options,
  focus,
  onFocus,
  hidden,
  onHidden,
}: {
  baseline: CompareOption;
  options: CompareOption[];
  focus: string | null;
  onFocus: (v: string | null) => void;
  hidden: string[];
  onHidden: (v: string[]) => void;
}) {
  const setFocus = onFocus;

  const shown = options.filter((o) => !hidden.includes(o.id));
  const series = shown.map((o) => ({ o, m: stampsFor(o.input) }));
  const baseStamps = stampsFor(baseline.input);

  const codes: string[] = [];
  for (const s of series) for (const c of s.m.keys()) if (!codes.includes(c)) codes.push(c);
  for (const c of baseStamps.keys()) if (!codes.includes(c)) codes.push(c);

  const max = Math.max(
    1,
    ...options.map((o) => timelineFor(o.input).totalS),
    ...[...baseStamps.values()].map((s) => s.done),
  );
  const pct = (n: number) => `${(n / max) * 100}%`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max));

  const focused = focus
    ? series
        .map(({ o, m }) => ({ o, s: m.get(focus), b: baseStamps.get(focus) }))
        .filter((r) => r.s || r.b)
    : [];

  return (
    <div className="mt-px border border-rule/20">
      <div className="flex flex-wrap items-center gap-3 border-b border-rule/15 bg-primary/[0.03] px-4 py-3">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Approval clock chart · click a bar to inspect a step
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          {options.map((o) => {
            const on = !hidden.includes(o.id);
            return (
              <button
                key={o.id}
                onClick={() => onHidden(on ? [...hidden, o.id] : hidden.filter((x) => x !== o.id))}
                aria-pressed={on}
                className={`font-mono-ui border px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] ${
                  on ? "border-primary bg-primary/10 text-primary" : "border-rule/30 text-muted-foreground"
                }`}
              >
                {o.label}
                {o.id === baseline.id ? " · baseline" : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto px-4 py-5">
        <div className="min-w-[820px]">
          <div className="relative ml-[150px] h-5 border-b border-rule/20">
            {ticks.map((t) => (
              <span
                key={t}
                className="font-mono-ui absolute top-0 -translate-x-1/2 text-[9px] tracking-[0.08em] text-muted-foreground"
                style={{ left: pct(t) }}
              >
                {mmss(t)}
              </span>
            ))}
          </div>

          {codes.map((code) => {
            const b = baseStamps.get(code);
            const isFocus = focus === code;
            return (
              <div
                key={code}
                className={`grid grid-cols-[150px_1fr] gap-3 border-b border-rule/12 py-2.5 ${isFocus ? "bg-primary/[0.05]" : ""}`}
              >
                <button
                  onClick={() => setFocus(isFocus ? null : code)}
                  className="font-mono-ui text-left text-[11px] tracking-[0.1em] hover:text-primary"
                >
                  {code}
                </button>
                <div className="grid gap-1">
                  {series.map(({ o, m }) => {
                    const s = m.get(code);
                    const isBase = o.id === baseline.id;
                    const changed = !isBase && !!s && !!b && (s.pickup !== b.pickup || s.done !== b.done);
                    if (!s)
                      return (
                        <div key={o.id} className="relative h-4">
                          <span className="font-mono-ui absolute left-0 top-0 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                            not on this route
                          </span>
                        </div>
                      );
                    return (
                      <button
                        key={o.id}
                        onClick={() => setFocus(isFocus ? null : code)}
                        title={`${o.label} · ${code} · ${mmss(s.pickup)} → ${mmss(s.done)} · ${s.mode === "manual" ? "human sign-off" : "machine cleared"}`}
                        className="relative block h-4 w-full"
                      >
                        {b && changed ? (
                          <span
                            className="absolute top-1 block h-2 border border-dashed border-rule/50"
                            style={{ left: pct(b.pickup), width: pct(Math.max(b.done - b.pickup, max * 0.004)) }}
                            aria-hidden
                          />
                        ) : null}
                        <span
                          className={`absolute top-0 block h-4 ${
                            isBase
                              ? "border border-rule/50 bg-rule/15"
                              : changed
                                ? "bg-primary"
                                : "bg-primary/40"
                          } ${s.mode === "manual" ? "" : "opacity-90"}`}
                          style={{ left: pct(s.pickup), width: pct(Math.max(s.done - s.pickup, max * 0.004)) }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="font-mono-ui mt-3 flex flex-wrap gap-4 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            <span>
              <span className="mr-1 inline-block h-2 w-4 translate-y-[1px] border border-rule/50 bg-rule/15" />
              baseline
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-4 translate-y-[1px] bg-primary" /> moved against baseline
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-4 translate-y-[1px] bg-primary/40" /> unchanged
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-4 translate-y-[1px] border border-dashed border-rule/50" />
              where the baseline sat
            </span>
          </div>
        </div>
      </div>

      {focus ? (
        <div className="border-t border-rule/15 bg-primary/[0.02] px-4 py-4">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            {focus} · {focused[0]?.s?.authority ?? focused[0]?.b?.authority ?? ""}
          </p>
          <div className="mt-3 grid gap-px bg-rule/15 md:grid-cols-2 xl:grid-cols-3">
            {focused.map(({ o, s, b }) => (
              <div key={o.id} className="bg-background p-3">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  {o.label}
                  {o.id === baseline.id ? " · baseline" : ""}
                </p>
                {s ? (
                  <>
                    <p className="font-mono-ui mt-1 text-[13px] text-foreground">
                      {mmss(s.pickup)} → {mmss(s.done)}
                    </p>
                    <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                      held {mmss(s.duration)} · {s.mode === "manual" ? "human sign-off" : "machine cleared"}
                    </p>
                    {b && o.id !== baseline.id ? (
                      <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.12em] text-primary">
                        pick-up {delta(s.pickup, b.pickup) ?? "same"} · cleared {delta(s.done, b.done) ?? "same"}
                        {s.mode !== b.mode ? " · mode changed" : ""}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="font-mono-ui mt-1 text-[11px] uppercase tracking-[0.12em] text-primary">
                    step not on this route
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** One-click shareable link that carries the exact dataset, baseline and clicked step. */
function ShareLink({ build }: { build: () => string }) {
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");

  const make = async () => {
    const u = build();
    setUrl(u);
    try {
      await navigator.clipboard.writeText(u);
      setMsg("Link copied — it reopens this page with the same dataset, baseline and step selected.");
    } catch {
      setMsg("Copy the link below — it reopens this page with the same dataset, baseline and step selected.");
    }
  };

  return (
    <div className="mt-px border border-rule/20 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Present this exact comparison
        </p>
        <button
          type="button"
          onClick={make}
          className="font-mono-ui bg-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-primary-foreground"
        >
          Copy shareable link
        </button>
      </div>
      {url ? (
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="font-mono-ui mt-3 w-full border border-rule/30 bg-background px-3 py-2 text-[11px]"
        />
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {msg ||
          "The link carries your selected dataset, the baseline you are comparing against, the hidden lanes and the step you clicked — including your own saved figures, so a regulator opening it sees precisely what is on your screen."}
      </p>
    </div>
  );
}
