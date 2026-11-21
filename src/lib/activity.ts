// Action-level activity trail: every action a user takes on a filing is
// recorded with who did it, when (UTC), from which page, and under which role.
// Persisted locally so the trail survives reloads, and read back under the
// same role rules that govern the desks themselves.
import { useEffect, useState } from "react";
import type { Session } from "@/lib/session";

export type ActivityEntry = {
  id: string;
  ref: string;
  company: string;
  action: string;
  detail: string;
  actorId: string;
  actor: string;
  role: "corporate" | "regulator";
  authority: string;
  page: string;
  at: number;
  /** Desk that owns the filing — used to keep corporate trails private. */
  ownerId: string;
};

const KEY = "corpvidesh.activity.v1";
const EVT = "corpvidesh:activity";

export function loadActivity(): ActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logActivity(
  session: Session | null,
  entry: Omit<ActivityEntry, "id" | "at" | "actor" | "actorId" | "role" | "authority">,
) {
  if (typeof window === "undefined") return;
  const at = Date.now();
  const row: ActivityEntry = {
    ...entry,
    id: `${entry.ref}:${entry.action}:${at}`,
    at,
    actorId: session?.id ?? "anonymous",
    actor:
      session?.role === "corporate"
        ? `${session.contact} · ${session.company}`
        : session?.role === "regulator"
          ? `${session.officer} · ${session.code}`
          : "Unidentified desk",
    role: session?.role === "regulator" ? "regulator" : "corporate",
    authority: session?.role === "regulator" ? session.code : (session?.role === "corporate" ? session.company : "—"),
  };
  const next = [row, ...loadActivity()].slice(0, 400);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the trail stays in this view only */
  }
  window.dispatchEvent(new CustomEvent(EVT));
}

/** Live activity trail, scoped to what the signed-in desk is allowed to read. */
export function useActivity(session: Session | null) {
  const [rows, setRows] = useState<ActivityEntry[]>([]);
  useEffect(() => {
    const sync = () => setRows(loadActivity());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    const id = window.setInterval(sync, 2000);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
      window.clearInterval(id);
    };
  }, []);

  if (session?.role === "corporate") return rows.filter((r) => r.ownerId === session.id);
  if (session?.role === "regulator") return rows;
  return [];
}

export const utc = (t: number) => new Date(t).toISOString().replace("T", " ").slice(0, 19) + "Z";