// Role-based permissions for evidence status changes.
// An admin decides which statuses each desk may set, globally and per step.
import { useCallback, useEffect, useState } from "react";
import { STATUSES, reviewers, type EvidenceStatus, type TrackedItem } from "@/lib/evidence-state";
import type { DeskRole, Session } from "@/lib/session";

export const ROLES: DeskRole[] = ["corporate", "regulator", "investor", "admin"];

export const ROLE_LABEL: Record<DeskRole, string> = {
  corporate: "Corporate treasury",
  regulator: "Regulator officer",
  investor: "Investor / observer",
  admin: "Platform administrator",
};

export const ROLE_PLAIN: Record<DeskRole, string> = {
  corporate: "The company filing the remittance. It gathers papers and hands them in.",
  regulator: "The authority reading the file. It is the only desk that can pass a document.",
  investor: "A diligence observer. Sees everything, and by default changes nothing.",
  admin: "The platform operator. Can set any status and decide what the other desks may do.",
};

export type RolePermissions = Record<DeskRole, EvidenceStatus[]>;

/** Sensible statutory default: companies prepare and submit, regulators validate, observers watch. */
export const DEFAULT_PERMISSIONS: RolePermissions = {
  corporate: ["Outstanding", "Prepared", "Submitted"],
  regulator: ["Submitted", "Validated"],
  investor: [],
  admin: [...STATUSES],
};

export type PermissionConfig = {
  base: RolePermissions;
  /** Per-step overrides, e.g. only the RBI desk may validate at step S07. */
  steps: Record<string, Partial<RolePermissions>>;
  /** When true a regulator may only act on documents their own authority reviews. */
  scopeRegulatorsToOwnDocuments: boolean;
};

export const DEFAULT_CONFIG: PermissionConfig = {
  base: DEFAULT_PERMISSIONS,
  steps: {},
  scopeRegulatorsToOwnDocuments: true,
};

const STORE = "corpvidesh.evidence.permissions.v1";
const EVT = "corpvidesh:permissions";

function sanitise(raw: unknown): PermissionConfig {
  const cfg = (raw ?? {}) as Partial<PermissionConfig>;
  const base = { ...DEFAULT_PERMISSIONS };
  for (const r of ROLES) {
    const list = cfg.base?.[r];
    if (Array.isArray(list)) base[r] = STATUSES.filter((s) => list.includes(s));
  }
  const steps: Record<string, Partial<RolePermissions>> = {};
  for (const [stepId, over] of Object.entries(cfg.steps ?? {})) {
    const clean: Partial<RolePermissions> = {};
    for (const r of ROLES) {
      const list = (over as Partial<RolePermissions>)[r];
      if (Array.isArray(list)) clean[r] = STATUSES.filter((s) => list.includes(s));
    }
    if (Object.keys(clean).length > 0) steps[stepId] = clean;
  }
  return {
    base,
    steps,
    scopeRegulatorsToOwnDocuments: cfg.scopeRegulatorsToOwnDocuments !== false,
  };
}

export function loadPermissions(): PermissionConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORE);
    return raw ? sanitise(JSON.parse(raw)) : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function savePermissions(cfg: PermissionConfig) {
  try {
    window.localStorage.setItem(STORE, JSON.stringify(cfg));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent(EVT));
}

/** Statuses a role may set at a given step, after any per-step override. */
export function allowedStatuses(cfg: PermissionConfig, role: DeskRole, stepId: string): EvidenceStatus[] {
  return cfg.steps[stepId]?.[role] ?? cfg.base[role];
}

export type Verdict = { allowed: boolean; reason: string };

/** The single gate every status change passes through. */
export function canSetStatus(
  session: Session | null,
  cfg: PermissionConfig,
  item: { stepId: string; reviewer: string },
  status: EvidenceStatus,
): Verdict {
  if (!session)
    return { allowed: false, reason: "No desk identity is held on this device — sign in at Desk access." };
  const role = session.role;
  const list = allowedStatuses(cfg, role, item.stepId);
  if (!list.includes(status))
    return {
      allowed: false,
      reason: `${ROLE_LABEL[role]} is not permitted to set “${status}” at this step.`,
    };
  if (role === "regulator" && cfg.scopeRegulatorsToOwnDocuments) {
    const mine = reviewers(item as TrackedItem).includes(session.code);
    if (!mine)
      return {
        allowed: false,
        reason: `This document is reviewed by ${item.reviewer} — ${session.code} may not act on it.`,
      };
  }
  return { allowed: true, reason: `${ROLE_LABEL[role]} may set “${status}” here.` };
}

/** Live permission config, shared across tabs; only an admin may write it. */
export function usePermissions(session: Session | null) {
  const [config, setConfig] = useState<PermissionConfig>(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setConfig(loadPermissions());
    sync();
    setReady(true);
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isAdmin = session?.role === "admin";

  const setRoleStatuses = useCallback(
    (role: DeskRole, status: EvidenceStatus, on: boolean, stepId?: string) => {
      if (!isAdmin) return;
      setConfig((prev) => {
        const next: PermissionConfig = {
          ...prev,
          base: { ...prev.base },
          steps: { ...prev.steps },
        };
        if (stepId) {
          const current = next.steps[stepId]?.[role] ?? next.base[role];
          const list = on ? [...new Set([...current, status])] : current.filter((s) => s !== status);
          next.steps[stepId] = { ...next.steps[stepId], [role]: STATUSES.filter((s) => list.includes(s)) };
        } else {
          const list = on
            ? [...new Set([...next.base[role], status])]
            : next.base[role].filter((s) => s !== status);
          next.base[role] = STATUSES.filter((s) => list.includes(s));
        }
        savePermissions(next);
        return next;
      });
    },
    [isAdmin],
  );

  const setScope = useCallback(
    (on: boolean) => {
      if (!isAdmin) return;
      setConfig((prev) => {
        const next = { ...prev, scopeRegulatorsToOwnDocuments: on };
        savePermissions(next);
        return next;
      });
    },
    [isAdmin],
  );

  const clearStepOverride = useCallback(
    (stepId: string) => {
      if (!isAdmin) return;
      setConfig((prev) => {
        const steps = { ...prev.steps };
        delete steps[stepId];
        const next = { ...prev, steps };
        savePermissions(next);
        return next;
      });
    },
    [isAdmin],
  );

  const resetAll = useCallback(() => {
    if (!isAdmin) return;
    setConfig(DEFAULT_CONFIG);
    savePermissions(DEFAULT_CONFIG);
  }, [isAdmin]);

  return { config, ready, isAdmin, setRoleStatuses, setScope, clearStepOverride, resetAll };
}
