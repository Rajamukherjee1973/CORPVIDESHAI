// Prototype role gate. This is a demonstration desk, not authentication:
// an identity is chosen on this device and stored locally. It decides which
// desks are reachable and which officer actions a signer may take.

import { useEffect, useState } from "react";
import { REG_TASKS } from "@/lib/regulator";

export type CorporateSession = {
  role: "corporate";
  id: string;
  company: string;
  contact: string;
  email: string;
};

export type RegulatorSession = {
  role: "regulator";
  id: string;
  code: string;
  officer: string;
  scope: string;
};

export type InvestorSession = {
  role: "investor";
  id: string;
  name: string;
  fund: string;
};

export type AdminSession = {
  role: "admin";
  id: string;
  name: string;
  office: string;
};

export type Session = CorporateSession | RegulatorSession | InvestorSession | AdminSession;
export type DeskRole = Session["role"];

/** One human-readable label for whoever holds the device, whatever their desk. */
export function sessionLabel(s: Session | null): string {
  if (!s) return "Unsigned device operator";
  if (s.role === "corporate") return `${s.contact} · ${s.company}`;
  if (s.role === "regulator") return `${s.officer} · ${s.code}`;
  if (s.role === "investor") return `${s.name} · ${s.fund}`;
  return `${s.name} · ${s.office}`;
}

const ROLES: DeskRole[] = ["corporate", "regulator", "investor", "admin"];

const KEY = "corpvidesh.session.v1";
const EVT = "corpvidesh:session";

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (parsed && ROLES.includes(parsed.role)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session | null) {
  if (typeof window === "undefined") return;
  try {
    if (s) window.localStorage.setItem(KEY, JSON.stringify(s));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — the session stays in memory for this view */
  }
  window.dispatchEvent(new CustomEvent(EVT));
}

/** Reads the active desk identity, and stays in step across tabs. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSession(loadSession());
    sync();
    setReady(true);
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { session, ready };
}

export function corporateIdFor(company: string, email: string) {
  return `corp:${company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${email.trim().toLowerCase()}`;
}

export function regulatorSessionFor(code: string): RegulatorSession | null {
  const task = REG_TASKS.find((t) => t.code === code);
  if (!task) return null;
  return {
    role: "regulator",
    id: `reg:${task.code.toLowerCase()}`,
    code: task.code,
    officer: task.officer,
    scope: task.scope,
  };
}

/** A regulator signer may only clear the desk they hold office at. */
export function canClear(session: Session | null, code: string) {
  return session?.role === "regulator" && session.code === code;
}

/** A corporate treasury may only see filings raised under its own identity. */
export function ownsFiling(session: Session | null, ownerId: string | undefined) {
  if (session?.role !== "corporate") return false;
  return ownerId === session.id;
}
