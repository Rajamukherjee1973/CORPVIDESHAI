import { useState } from "react";
import { emailBody, PORTAL_STAGES, type Notification } from "@/lib/portal";

const time = (t: number) =>
  new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export function NotificationFeed({
  items,
  unread,
  onMarkAll,
}: {
  items: Notification[];
  unread: number;
  onMarkAll: () => void;
}) {
  return (
    <div className="bg-background">
      <div className="flex items-center justify-between gap-4 border-b border-rule/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="relative block h-3.5 w-3.5 bg-primary" aria-hidden />
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            In-app notifications
          </p>
          <span className="font-mono-ui bg-primary px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-primary-foreground">
            {unread} unread
          </span>
        </div>
        <button
          onClick={onMarkAll}
          className="font-mono-ui border border-rule/25 px-3 py-2 text-[10px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
        >
          Mark all read
        </button>
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No alerts yet. File an application and every checkpoint will report here the moment it clears.
          </p>
        ) : (
          items.map((n) => (
            <div key={n.id} className={`border-b border-rule/10 px-6 py-4 ${n.read ? "" : "bg-secondary"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
                  {n.ref} · stage {String(n.stageIndex + 1).padStart(2, "0")}/{PORTAL_STAGES.length} cleared
                </p>
                <span className="tnum font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {time(n.at)}
                </span>
              </div>
              <p className="font-display mt-1 text-2xl leading-tight">{n.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">Cleared by — </span>
                {n.officer}, {n.designation} · {n.node}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Evidence: {n.evidence} · digest {n.digest}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function EmailOutbox({ items }: { items: Notification[] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  return (
    <div className="bg-background">
      <div className="flex items-center justify-between gap-4 border-b border-rule/10 px-6 py-4">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Email notifications dispatched
        </p>
        <span className="tnum font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">
          {items.length} sent
        </span>
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Stage notices addressed to the filing's notification address will appear here as they go out.
          </p>
        ) : (
          items.map((n) => (
            <div key={n.id} className="border-b border-rule/10">
              <button
                onClick={() => setOpen((o) => (o === n.id ? null : n.id))}
                className="block w-full px-6 py-4 text-left hover:bg-secondary"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
                    To {n.emailTo}
                  </span>
                  <span className="tnum font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {time(n.at)}
                  </span>
                </div>
                <p className="mt-1 text-base leading-tight">{n.subject}</p>
              </button>
              {open === n.id ? (
                <pre className="whitespace-pre-wrap border-t border-rule/10 bg-secondary px-6 py-4 font-mono-ui text-[11px] leading-relaxed text-muted-foreground">
                  {emailBody(n)}
                </pre>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
