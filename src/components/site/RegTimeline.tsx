// Visual regulator action timeline. Each checkpoint expands into the manual
// and automated approval steps behind it, with the evidence digest committed
// at every node.
import { useState } from "react";
import {
  CLEARERS,
  PORTAL_STAGES,
  hash,
  progressFor,
  stageProgress,
  type PortalApplication,
} from "@/lib/portal";
import { ENGINE_META, REG_TASKS, bankFor, type Engine } from "@/lib/regulator";

const clock = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

type Node = {
  mode: "manual" | "automated";
  actor: string;
  role: string;
  action: string;
  engine: Engine;
  digest: string;
};

function nodesFor(app: PortalApplication, index: number): Node[] {
  const stage = PORTAL_STAGES[index]!;
  const d = (tag: string) => hash(app.ref + stage.key + tag).slice(0, 12);
  const bank = bankFor(app);

  if (stage.key === "parallel") {
    return REG_TASKS.map((t) => ({
      mode: t.mode,
      actor: `${t.code} · ${t.officer}`,
      role: t.scope,
      action:
        app.route === "Automatic" && t.mode === "manual"
          ? `${t.test} Automatic route — noted on the record, no prior permission required.`
          : t.test,
      engine: t.engine,
      digest: d(t.code),
    }));
  }

  const clearer = CLEARERS[stage.key]!;
  const machine = /engine|ai|verifier|registry|consensus|window/i.test(clearer.officer);
  const engine: Engine =
    stage.key === "reason" ? "qwen" : stage.key === "docs" ? "langchain" : stage.key === "kyc" ? "alicloud" : machine ? "fabric" : "manual";

  const out: Node[] = [
    {
      mode: machine ? "automated" : "manual",
      actor: clearer.officer,
      role: `${clearer.designation} · ${clearer.node}`,
      action: stage.detail,
      engine,
      digest: d("primary"),
    },
    {
      mode: "automated",
      actor: "Federated ledger",
      role: "Hash-chain commit across six member nodes",
      action: `${stage.evidence} hashed and appended; every member node acknowledges the block.`,
      engine: "fabric",
      digest: d("ledger"),
    },
  ];

  if (!machine) {
    out.splice(1, 0, {
      mode: "manual",
      actor: bank,
      role: "AD Category-I counter-signature",
      action: "Bank desk counter-signs the checkpoint before it is written to the record.",
      engine: "manual",
      digest: d("bank"),
    });
  }
  return out;
}

export function RegTimeline({
  app,
  now,
  desk,
}: {
  app: PortalApplication;
  now: number;
  desk: "corporate" | "regulator";
}) {
  const [open, setOpen] = useState<number | null>(null);
  const p = progressFor(app, now);

  let cumulative = 0;
  const times = PORTAL_STAGES.map((s) => {
    cumulative += s.seconds;
    return app.createdAt + cumulative * 1000;
  });

  return (
    <div className="border border-rule/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/15 bg-primary/[0.03] px-5 py-4">
        <p className="font-mono-ui text-[11px] uppercase tracking-[0.18em]">
          {desk === "regulator" ? "Regulator action timeline" : "Clearance action timeline"} · {app.ref}
        </p>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {app.company} · {app.route} route · {Math.round(p.percent)}% cleared
        </p>
      </div>

      <ol className="divide-y divide-rule/12">
        {PORTAL_STAGES.map((stage, i) => {
          const state = p.states[i]!;
          const active = open === i;
          const frac = stageProgress(app, i, now);
          const nodes = nodesFor(app, i);
          return (
            <li key={stage.key}>
              <button
                onClick={() => setOpen(active ? null : i)}
                aria-expanded={active}
                disabled={state === "queued"}
                className="grid w-full grid-cols-[26px_1fr_auto] items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-primary/5 disabled:opacity-45"
              >
                <span className="relative mt-1 flex h-full justify-center">
                  <span
                    className={`block h-3 w-3 shrink-0 ${
                      state === "cleared"
                        ? "bg-primary"
                        : state === "running"
                          ? "animate-pulse border-2 border-primary"
                          : "border border-rule/40"
                    }`}
                    aria-hidden
                  />
                </span>
                <span>
                  <span className="font-display block text-xl leading-tight">
                    {String(i + 1).padStart(2, "0")} · {stage.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {stage.actor} · {nodes.filter((n) => n.mode === "manual").length} manual /{" "}
                    {nodes.filter((n) => n.mode === "automated").length} automated step
                    {nodes.length === 1 ? "" : "s"}
                  </span>
                  {state === "running" ? (
                    <span className="mt-2 block h-[3px] w-full max-w-xs bg-rule/20">
                      <span
                        className="block h-full bg-primary transition-all"
                        style={{ width: `${Math.round(frac * 100)}%` }}
                      />
                    </span>
                  ) : null}
                </span>
                <span className="font-mono-ui text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {state === "cleared" ? clock(times[i]!) : state === "running" ? "In progress" : "Queued"}
                  <span className="mt-1 block text-primary">
                    {state === "queued" ? "—" : hash(app.ref + stage.key).slice(0, 10)}
                  </span>
                </span>
              </button>

              {active ? (
                <div className="border-t border-rule/12 bg-primary/[0.02] px-5 pb-6 pt-5">
                  <div className="grid gap-px bg-rule/15">
                    {nodes.map((n) => (
                      <div
                        key={n.actor + n.digest}
                        className="grid gap-3 bg-background p-4 lg:grid-cols-[150px_1fr_120px] lg:items-start"
                      >
                        <span
                          className={`font-mono-ui text-[10px] uppercase tracking-[0.16em] ${
                            n.mode === "manual" ? "text-foreground" : "text-primary"
                          }`}
                        >
                          {n.mode === "manual" ? "Manual approval" : "Automated step"}
                        </span>
                        <span>
                          <span className="font-display block text-lg leading-tight">{n.actor}</span>
                          <span className="mt-0.5 block text-xs uppercase tracking-[0.08em] text-muted-foreground">
                            {n.role}
                          </span>
                          <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                            {n.action}
                          </span>
                          <span className="font-mono-ui mt-2 block text-[10px] uppercase tracking-[0.14em] text-primary">
                            {ENGINE_META[n.engine].label}
                          </span>
                        </span>
                        <span className="font-mono-ui text-[10px] tracking-[0.08em] lg:text-right">
                          <span className="block text-muted-foreground">Evidence digest</span>
                          <span className="mt-1 block text-primary">{n.digest}</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-px bg-rule/15 sm:grid-cols-2">
                    <div className="bg-background p-4">
                      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                        Evidence produced
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stage.evidence}</p>
                    </div>
                    <div className="bg-background p-4">
                      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                        In plain words
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stage.plain}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
