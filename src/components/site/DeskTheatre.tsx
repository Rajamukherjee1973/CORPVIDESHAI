import { useEffect, useRef, useState } from "react";
import { MoneyFlow3D, type FlowNode } from "@/components/site/MoneyFlow3D";
import { RegulatorConsole } from "@/components/site/RegulatorConsole";
import { quorumWindow } from "@/lib/quorum";
import type { RouteKey } from "@/lib/routes-detail";

/** Rail seconds per real second in the desk-access demonstration. */
const SPEED = 6;

function useRailClock(total: number, autostart = true) {
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(autostart);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const tick = (now: number) => {
      const d = ((now - last) / 1000) * SPEED;
      last = now;
      setT((v) => (v + d >= total ? total : v + d));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [running, total]);

  useEffect(() => {
    if (t >= total) setRunning(false);
  }, [t, total]);

  return { t, running, setRunning, reset: () => { setT(0); setRunning(true); } };
}

const TREASURY_NODES: FlowNode[] = [
  { key: "desk", label: "Treasury desk", sub: "Intake keyed and signed" },
  { key: "engine", label: "Reasoning engine", sub: "Rule 7 · route test" },
  { key: "ad", label: "AD Category-I bank", sub: "Form A2 · 15CA/15CB" },
  { key: "gift", label: "GIFT IFSC ledger", sub: "Six regulators read" },
  { key: "obank", label: "Overseas bank", sub: "Credited and confirmed" },
];

const CLICK_STAGES = [
  {
    t: "Field validation as you type",
    d: "Entity, hub, amount and AD bank are bound to the audited net-worth record before the button is even live. Nothing incomplete can be submitted.",
  },
  {
    t: "Route decided in the same second",
    d: "The commitment is tested against the Rule 7 ceiling and the sector conditions. The engine returns Automatic or Approval with the rule quoted, not a queue ticket.",
  },
  {
    t: "Annexures hashed and bound",
    d: "Every attachment is digested and the digests are bound to the reference, so no page can be swapped after filing.",
  },
  {
    t: "One write to the ledger",
    d: "The packet is written once to the append-only ledger. There is no second copy for the bank and a third for the regulator.",
  },
  {
    t: "Six desks attach in parallel",
    d: "All six authorities read the same line while the transaction is still forming, each running its own queue at once.",
  },
];

/** Self-driving corporate-treasury demonstration for the desk-access page. */
export function TreasuryTheatre() {
  const total = 60;
  const { t, running, setRunning, reset } = useRailClock(total);
  const progress = t / total;
  const legIndex = Math.min(TREASURY_NODES.length - 2, Math.floor(progress * (TREASURY_NODES.length - 1)));
  const stage = Math.min(CLICK_STAGES.length - 1, Math.floor(progress * CLICK_STAGES.length));

  return (
    <div className="grid gap-px bg-rule/15 xl:grid-cols-[1.35fr_1fr]">
      <div className="bg-background">
        <MoneyFlow3D
          progress={progress}
          running={running}
          nodes={TREASURY_NODES}
          legIndex={legIndex}
          amountLabel="₹475 cr · demonstration file"
          creditLabel="USD equivalent · Singapore"
        />
        <div className="flex flex-wrap gap-px border-t border-rule/12 bg-rule/12">
          <button
            type="button"
            onClick={() => setRunning(!running)}
            className="font-mono-ui flex-1 bg-primary px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-primary-foreground"
          >
            {running ? "Hold the rail" : "Run the treasury file"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="font-mono-ui flex-1 bg-background px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-primary"
          >
            Replay from the click
          </button>
        </div>
      </div>
      <div className="bg-background p-6">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          The moment the treasury clicks
        </p>
        <ol className="mt-4 divide-y divide-rule/12">
          {CLICK_STAGES.map((s, i) => (
            <li key={s.t} className="py-3">
              <div className="flex items-start gap-3">
                <span className="font-mono-ui tnum mt-0.5 w-6 shrink-0 text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{s.t}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
                </div>
                <span
                  className={`font-mono-ui mt-0.5 shrink-0 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${
                    stage > i
                      ? "bg-primary text-primary-foreground"
                      : stage === i
                        ? "border border-primary text-primary"
                        : "border border-rule/25 text-muted-foreground"
                  }`}
                >
                  {stage > i ? "cleared" : stage === i ? "running" : "queued"}
                </span>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
          In plain words: one click starts everything. The company keys the file once, and the bank and
          the regulators are looking at that same file within seconds.
        </p>
      </div>
    </div>
  );
}

/** Self-driving regulator-quorum demonstration for the desk-access page. */
export function RegulatorTheatre({ route = "Approval" as RouteKey }: { route?: RouteKey }) {
  const win = quorumWindow(route);
  const total = win.close + 4;
  const { t, running, setRunning, reset } = useRailClock(total);
  const [focus, setFocus] = useState("ALL");

  return (
    <div>
      <div className="mb-px flex flex-wrap gap-px bg-rule/12">
        <button
          type="button"
          onClick={() => setRunning(!running)}
          className="font-mono-ui flex-1 bg-primary px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-primary-foreground"
        >
          {running ? "Hold the quorum" : "Run the approval quorum"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="font-mono-ui flex-1 bg-background px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-primary"
        >
          Replay the parallel window
        </button>
      </div>
      <RegulatorConsole route={route} elapsed={t} running={running} focus={focus} onFocus={setFocus} height={380} />
    </div>
  );
}
