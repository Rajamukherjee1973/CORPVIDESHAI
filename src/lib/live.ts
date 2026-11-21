// Real-time checkpoint watcher. Any desk that mounts this hook is told the
// instant a checkpoint clears on the chain, with the clearing officer named.
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { buildNotification, progressFor, type Notification, type PortalApplication } from "@/lib/portal";

export function useLiveCheckpoints(
  apps: PortalApplication[],
  now: number,
  opts: { desk: "corporate" | "regulator"; announce?: boolean } = { desk: "corporate" },
) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!now || apps.length === 0) return;
    const fresh: Notification[] = [];
    for (const app of apps) {
      const p = progressFor(app, now);
      p.states.forEach((st, i) => {
        if (st !== "cleared") return;
        const n = buildNotification(app, i);
        if (seen.current.has(n.id)) return;
        seen.current.add(n.id);
        fresh.push(n);
      });
    }
    if (fresh.length === 0) return;
    setNotifications((prev) => [...fresh, ...prev].sort((a, b) => b.at - a.at).slice(0, 200));
    if (opts.announce === false) return;
    for (const n of fresh) {
      // Only announce live events — history replayed on load stays silent.
      if (Date.now() - n.at > 4000) continue;
      toast(`${n.ref} — ${n.title} cleared`, {
        description:
          opts.desk === "regulator"
            ? `${n.company} · cleared by ${n.officer}, ${n.designation} · block ${n.digest}`
            : `Cleared by ${n.officer}, ${n.designation}. Notice emailed to ${n.emailTo}.`,
      });
    }
  }, [now, apps, opts.desk, opts.announce]);

  const markAllRead = () => setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  const dropRef = (ref: string) => setNotifications((n) => n.filter((x) => x.ref !== ref));

  return { notifications, unread: notifications.filter((n) => !n.read).length, markAllRead, dropRef };
}