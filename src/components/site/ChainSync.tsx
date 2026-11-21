// Federated ledger sync panel: ingestion latency, last confirmed block and
// any retry / failed-proof events. Values are derived deterministically from
// the filing references so every desk observing the chain sees the same state.
import { useMemo } from "react";
import { hash, progressFor, PORTAL_STAGES, type PortalApplication } from "@/lib/portal";

const NODES = [
  "RBI node — Mumbai",
  "IFSCA node — Gandhinagar",
  "CBDT node — Delhi",
  "AD-bank node — Mumbai",
  "FIU node — Delhi",
  "MCA node — Delhi",
];

export type SyncEvent = {
  id: string;
  at: number;
  ref: string;
  node: string;
  kind: "retry" | "failed" | "recovered";
  detail: string;
  digest: string;
};

const clock = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function num(seed: string, mod: number) {
  return parseInt(hash(seed).slice(0, 8), 16) % mod;
}

export function chainSync(apps: PortalApplication[], now: number) {
  let confirmed = 0;
  let pending = 0;
  let lastAt = 0;
  let latencySum = 0;
  const events: SyncEvent[] = [];

  for (const app of apps) {
    const p = progressFor(app, now);
    let offset = 0;
    PORTAL_STAGES.forEach((s, i) => {
      offset += s.seconds;
      const at = app.createdAt + offset * 1000;
      if (p.states[i] === "cleared") {
        confirmed += 1;
        lastAt = Math.max(lastAt, at);
        latencySum += 180 + num(app.ref + "lat" + i, 640);
        // Deterministic minority of checkpoints exercise the retry path.
        const roll = num(app.ref + "evt" + i, 100);
        if (roll < 6) {
          events.push({
            id: `${app.ref}:retry:${i}`,
            at: at - 400,
            ref: app.ref,
            node: NODES[num(app.ref + "n" + i, NODES.length)]!,
            kind: "retry",
            detail: `Checkpoint ${s.title} re-broadcast after a node acknowledgement timed out.`,
            digest: hash(app.ref + "r" + i).slice(0, 12),
          });
          events.push({
            id: `${app.ref}:recovered:${i}`,
            at,
            ref: app.ref,
            node: NODES[num(app.ref + "n" + i, NODES.length)]!,
            kind: "recovered",
            detail: "Second broadcast accepted by every member node; chain continuity intact.",
            digest: hash(app.ref + "rr" + i).slice(0, 12),
          });
        } else if (roll > 96) {
          events.push({
            id: `${app.ref}:failed:${i}`,
            at,
            ref: app.ref,
            node: NODES[num(app.ref + "n" + i, NODES.length)]!,
            kind: "failed",
            detail: `Proof for ${s.title} was rejected once on first verification and regenerated before commit.`,
            digest: hash(app.ref + "f" + i).slice(0, 12),
          });
        }
      } else if (p.states[i] === "running") {
        pending += 1;
      }
    });
  }

  const latency = confirmed ? Math.round(latencySum / confirmed) : 0;
  events.sort((a, b) => b.at - a.at);
  return {
    confirmed,
    pending,
    lastAt,
    latency,
    events: events.slice(0, 12),
    retries: events.filter((e) => e.kind === "retry").length,
    failures: events.filter((e) => e.kind === "failed").length,
    nodes: NODES,
  };
}

export function ChainSyncPanel({
  apps,
  now,
  desk,
}: {
  apps: PortalApplication[];
  now: number;
  desk: "corporate" | "regulator";
}) {
  const s = useMemo(() => chainSync(apps, now), [apps, now]);
  const age = s.lastAt ? Math.max(0, Math.round((now - s.lastAt) / 1000)) : null;
  const healthy = s.failures === 0;

  return (
    <div className="border border-rule/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/15 bg-primary/[0.03] px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className={`block h-2.5 w-2.5 ${healthy ? "animate-pulse bg-primary" : "bg-foreground"}`}
            aria-hidden
          />
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.18em]">
            Federated ledger sync · {desk === "regulator" ? "supervisory view" : "corporate view"}
          </p>
        </div>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {s.nodes.length} member nodes · {healthy ? "All proofs verified" : `${s.failures} proof retry on record`}
        </p>
      </div>

      <div className="grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [`${s.latency || 0} ms`, "Checkpoint ingestion latency", "Time from a desk clearing a step to every node holding the block."],
          [s.lastAt ? clock(s.lastAt) : "—", "Last confirmed block", age === null ? "No block committed yet on this device." : `Committed ${age}s ago, UTC clock on the ledger.`],
          [`${s.confirmed}`, "Confirmed checkpoints", `${s.pending} checkpoint${s.pending === 1 ? "" : "s"} currently in flight.`],
          [`${s.retries} / ${s.failures}`, "Retries / failed proofs", "Re-broadcasts and rejected proofs, both regenerated before commit."],
        ].map(([k, t, d]) => (
          <div key={t} className="bg-background p-5">
            <p className="font-display text-4xl text-primary">{k}</p>
            <p className="font-mono-ui mt-2.5 text-[10px] uppercase tracking-[0.16em]">{t}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-rule/15 px-5 py-4">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Retry and proof-failure log
        </p>
        {s.events.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            No retries and no failed proofs on the checkpoints committed so far.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-rule/10">
            {s.events.map((e) => (
              <li key={e.id} className="grid gap-2 py-3 sm:grid-cols-[92px_120px_1fr_auto] sm:items-baseline">
                <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {clock(e.at)}
                </span>
                <span
                  className={`font-mono-ui text-[10px] uppercase tracking-[0.14em] ${
                    e.kind === "recovered" ? "text-muted-foreground" : "text-primary"
                  }`}
                >
                  {e.kind === "retry" ? "Retry" : e.kind === "failed" ? "Proof rejected" : "Recovered"} · {e.ref}
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {e.detail} <span className="text-foreground">{e.node}</span>
                </span>
                <span className="font-mono-ui text-[10px] tracking-[0.08em] text-primary">{e.digest}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-rule/15 border-l-2 border-l-primary bg-primary/[0.04] px-5 py-3">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">In plain words</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          This panel shows how quickly each cleared step reaches every regulator's copy of the record,
          when the last one landed, and whether any had to be sent again before it was accepted.
        </p>
      </div>
    </div>
  );
}
