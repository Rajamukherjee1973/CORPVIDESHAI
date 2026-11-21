import { useMemo, useState } from "react";
import { RegulatorQuorum3D } from "@/components/site/RegulatorQuorum3D";
import {
  fmtEta,
  laneEta,
  quorumEtas,
  quorumFor,
  quorumTotals,
  quorumWindow,
  type ItemState,
} from "@/lib/quorum";
import type { RouteKey } from "@/lib/routes-detail";

const STATE_CLS: Record<ItemState, string> = {
  cleared: "bg-primary text-primary-foreground",
  running: "border border-primary text-primary",
  queued: "border border-rule/25 text-muted-foreground",
};

const STATE_WORD: Record<ItemState, string> = {
  cleared: "signed",
  running: "executing",
  queued: "queued",
};

type Props = {
  route: RouteKey;
  /** Rail seconds elapsed since the treasury pressed execute. */
  elapsed: number;
  running: boolean;
  /** Selected regulator code, or "ALL" for the whole ring. */
  focus: string;
  onFocus: (code: string) => void;
  height?: number | undefined;
};

/**
 * Regulator approval console: one dropdown per authority, the statutory
 * requirement behind each queue item, its live status, and the approval ETA
 * this desk carries — seconds on the rail against days off it.
 */
export function RegulatorConsole({ route, elapsed, running, focus, onFocus, height }: Props) {
  const lanes = useMemo(() => quorumFor(route, elapsed), [route, elapsed]);
  const totals = useMemo(() => quorumTotals(route), [route]);
  const win = useMemo(() => quorumWindow(route), [route]);
  const etas = useMemo(() => quorumEtas(route), [route]);
  const [itemId, setItemId] = useState("ALL");
  const selected = lanes.find((l) => l.lane.code === focus) ?? null;
  const signed = lanes.filter((l) => l.done).length;
  const eta = selected ? laneEta(selected.lane, route) : null;
  const remaining = selected ? Math.max(0, (eta?.etaSec ?? 0) - elapsed) : 0;
  const openItem = selected
    ? selected.lane.items.findIndex((i) => i.id === itemId)
    : -1;

  return (
    <div className="grid gap-px bg-rule/15 xl:grid-cols-[1.35fr_1fr]">
      <div className="bg-background">
        <RegulatorQuorum3D
          lanes={lanes}
          running={running}
          elapsed={elapsed}
          focus={focus === "ALL" ? undefined : focus}
          height={height}
        />
        <div className="grid gap-px border-t border-rule/12 bg-rule/12 sm:grid-cols-3">
          {[
            ["Desks signed", `${signed} / ${lanes.length}`],
            ["Checks automated", `${totals.autoShare}% of ${totals.checks}`],
            ["Quorum ETA", fmtEta(win.close)],
          ].map(([k, v]) => (
            <div key={k} className="bg-background p-4">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
              <p className="font-display tnum mt-1 text-2xl text-primary">{v}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-rule/12 p-5">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Approval ETA, desk by desk — seconds on the rail against the legacy queue
          </p>
          <div className="mt-3 space-y-px bg-rule/12">
            {etas.map((e) => {
              const lp = lanes.find((l) => l.lane.code === e.code)!;
              return (
                <button
                  key={e.code}
                  type="button"
                  onClick={() => {
                    onFocus(e.code);
                    setItemId("ALL");
                  }}
                  className="flex w-full items-center gap-3 bg-background px-3 py-2.5 text-left transition-colors hover:bg-secondary/50"
                >
                  <span className="font-display w-20 shrink-0 text-lg text-primary">{e.code}</span>
                  <span className="relative h-2 min-w-0 flex-1 bg-secondary">
                    <span
                      className="absolute inset-y-0 left-0 bg-primary/25"
                      style={{ width: `${Math.min(100, (e.etaSec / win.close) * 100)}%` }}
                    />
                    <span
                      className="absolute inset-y-0 left-0 bg-primary"
                      style={{ width: `${Math.min(100, (e.etaSec / win.close) * lp.progress * 100)}%` }}
                    />
                  </span>
                  <span className="font-mono-ui tnum w-16 shrink-0 text-right text-[11px] text-primary">
                    {e.label}
                  </span>
                  <span className="font-mono-ui tnum hidden w-32 shrink-0 text-right text-[9px] uppercase tracking-[0.12em] text-muted-foreground sm:block">
                    was {e.legacyLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-rule/12 p-5">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Why manual intervention is small
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Of the {totals.checks} statutory checks the six authorities owe on this filing,{" "}
            {totals.automated} are pure rule tests — a ceiling, a list, a rate, a form pair — and the engine
            can complete them the second the packet lands. Only {totals.manual} carry discretion, and those
            are the ones a named officer signs. Run one after another the queue would take{" "}
            {win.serial}s; read in parallel off the same ledger line it closes in{" "}
            {win.close - win.open}s, a saving of {win.parallelSaving}s on this filing alone.
          </p>
        </div>
      </div>

      <div className="bg-background p-6">
        <label className="block">
          <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Regulator desk
          </span>
          <select
            value={focus}
            onChange={(e) => {
              onFocus(e.target.value);
              setItemId("ALL");
            }}
            className="mt-1.5 w-full border border-rule/25 bg-transparent px-3 py-2.5 text-lg outline-none focus-visible:border-primary"
          >
            <option value="ALL">All six desks — parallel window</option>
            {lanes.map((l) => (
              <option key={l.lane.code} value={l.lane.code}>
                {l.lane.code} — {l.lane.scope} · ETA {laneEta(l.lane, route).label}
              </option>
            ))}
          </select>
        </label>

        {!selected ? (
          <div className="mt-5 space-y-px bg-rule/12">
            {lanes.map((l) => {
              const e = laneEta(l.lane, route);
              return (
                <button
                  key={l.lane.code}
                  type="button"
                  onClick={() => onFocus(l.lane.code)}
                  className="flex w-full items-start gap-3 bg-background p-4 text-left transition-colors hover:bg-secondary/50"
                >
                  <span className="font-display w-20 shrink-0 text-xl text-primary">{l.lane.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug">{l.lane.scope}</span>
                    <span className="font-mono-ui mt-1 block text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                      {l.lane.officer} · attaches T+{l.start}s · ETA {e.label} ({e.unit}) · {e.speedup}× faster
                    </span>
                    <span className="mt-2 block h-1.5 w-full bg-secondary">
                      <span className="block h-1.5 bg-primary" style={{ width: `${l.progress * 100}%` }} />
                    </span>
                  </span>
                  <span
                    className={`font-mono-ui shrink-0 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${l.done ? STATE_CLS.cleared : l.active ? STATE_CLS.running : STATE_CLS.queued}`}
                  >
                    {l.cleared}/{l.lane.items.length}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-5">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
              {selected.lane.authority}
            </p>
            <h3 className="font-display mt-2 text-3xl leading-tight">{selected.lane.scope}</h3>

            <div className="mt-4 grid gap-px bg-rule/12 sm:grid-cols-3">
              {[
                ["Status", selected.done ? "Signed" : selected.active ? "Executing" : "Waiting"],
                ["Approval ETA", `${eta!.label} · ${eta!.unit}`],
                [
                  running && !selected.done ? "Signs in" : "Legacy queue",
                  running && !selected.done ? fmtEta(remaining) : eta!.legacyLabel,
                ],
              ].map(([k, v]) => (
                <div key={k} className="bg-background p-3">
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                  <p className="font-display tnum mt-1 text-xl text-primary">{v}</p>
                </div>
              ))}
            </div>

            <dl className="mt-4 divide-y divide-rule/12">
              {[
                ["Signing officer", selected.lane.officer],
                ["Ledger seat", selected.lane.seat],
                ["Engine", selected.lane.engine],
                ["Queue window", `T+${selected.start}s → T+${selected.end}s`],
                ["Automation", `${selected.autoCount} automated · ${selected.manualCount} human-signed`],
                ["Against legacy", `${eta!.legacyLabel} today · ${eta!.speedup}× faster on the rail`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-2 text-sm">
                  <dt className="shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>

            <label className="mt-6 block">
              <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Requirement this desk must approve
              </span>
              <select
                value={itemId}
                onChange={(ev) => setItemId(ev.target.value)}
                className="mt-1.5 w-full border border-rule/25 bg-transparent px-3 py-2.5 text-sm outline-none focus-visible:border-primary"
              >
                <option value="ALL">Whole work queue ({selected.lane.items.length} requirements)</option>
                {selected.lane.items.map((it, i) => (
                  <option key={it.id} value={it.id}>
                    {String(i + 1).padStart(2, "0")} · {it.title} — {STATE_WORD[selected.states[i]!]}
                  </option>
                ))}
              </select>
            </label>

            <ol className="mt-3 divide-y divide-rule/12">
              {selected.lane.items.map((it, i) => {
                if (openItem >= 0 && openItem !== i) return null;
                const st = selected.states[i]!;
                return (
                  <li key={it.id} className="py-3">
                    <div className="flex items-start gap-3">
                      <span className="font-mono-ui tnum mt-0.5 w-6 shrink-0 text-[10px] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{it.title}</p>
                        <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.14em] text-primary">
                          {it.basis} · {it.sec[route]}s ·{" "}
                          {it.mode === "manual" ? "officer signs" : "engine clears"}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{it.plain}</p>
                      </div>
                      <span
                        className={`font-mono-ui mt-0.5 shrink-0 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${STATE_CLS[st]}`}
                      >
                        {st}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              onClick={() => {
                onFocus("ALL");
                setItemId("ALL");
              }}
              className="font-mono-ui mt-5 border border-primary px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-primary"
            >
              Back to all six desks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
