import { ENGINE_META, adTape, type AdEvent } from "@/lib/regulator";
import type { PortalApplication } from "@/lib/portal";

const time = (t: number) =>
  new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function Cell({ e }: { e: AdEvent }) {
  return (
    <span className="flex shrink-0 items-center gap-3 border-r border-rule/15 px-5 py-2.5">
      <span className="font-mono-ui tnum text-[10px] text-muted-foreground">{time(e.at)}</span>
      <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">{e.ref}</span>
      <span className="text-[12px]">{e.bank.split(" — ")[0]}</span>
      <span className="text-[12px] text-muted-foreground">{e.desk}</span>
      <span className="text-[12px]">{e.action}</span>
      <span className="font-mono-ui border border-rule/25 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        {ENGINE_META[e.engine].label}
      </span>
    </span>
  );
}

/** Live AD Category-I bank processing tape across every filing on the rail. */
export function AdBankTicker({ apps, now }: { apps: PortalApplication[]; now: number }) {
  const tape = adTape(apps, now);
  return (
    <div className="border border-rule/20">
      <div className="flex items-center justify-between border-b border-rule/15 px-4 py-2.5">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          AD Category-I bank — live processing tape
        </p>
        <span className="font-mono-ui flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-primary">
          <span className="block h-2 w-2 animate-pulse bg-primary" aria-hidden />
          {tape.length} events
        </span>
      </div>
      {tape.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          No filing on the rail yet. File one from the Corporate Application desk and every bank action appears here as it happens.
        </p>
      ) : (
        <div className="overflow-hidden">
          <div className="tape-track">
            {[...tape, ...tape].map((e, i) => (
              <Cell key={`${e.id}-${i}`} e={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Vertical, per-filing view of the same bank rail. */
export function AdBankDesk({ events }: { events: AdEvent[] }) {
  return (
    <div className="border border-rule/20">
      {events.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">The bank has not opened this file yet.</p>
      ) : (
        [...events].reverse().map((e) => (
          <div key={e.id} className="grid gap-2 border-b border-rule/12 px-5 py-3.5 last:border-b-0 md:grid-cols-[86px_1fr_170px]">
            <span className="font-mono-ui tnum text-[10px] text-muted-foreground">{time(e.at)}</span>
            <div>
              <p className="text-sm">{e.action}</p>
              <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {e.bank} · {e.desk} · digest {e.digest}
              </p>
            </div>
            <span className="font-mono-ui self-start border border-rule/25 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              {ENGINE_META[e.engine].label}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
