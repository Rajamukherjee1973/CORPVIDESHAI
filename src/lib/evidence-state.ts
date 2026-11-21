// Per-item evidence completeness state, persisted locally per route.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ROUTE_STEPS, evidenceFor, type EvidenceItem, type RouteKey } from "@/lib/routes-detail";
import { loadSession, sessionLabel } from "@/lib/session";

export const STATUSES = ["Outstanding", "Prepared", "Submitted", "Validated"] as const;
export type EvidenceStatus = (typeof STATUSES)[number];

export type TrackedItem = EvidenceItem & { stepId: string; stepTitle: string; key: string; status: EvidenceStatus };

const STORE = "corpvidesh.evidence.v1";
const AUDIT_STORE = "corpvidesh.evidence.audit.v1";

export type AuditEntry = {
  at: string;
  actor: string;
  route: RouteKey;
  stepId: string;
  stepTitle: string;
  document: string;
  from: EvidenceStatus;
  to: EvidenceStatus;
  source: "manual" | "import" | "reset";
};

export function itemKey(stepId: string, document: string) {
  return `${stepId}::${document}`;
}

function read(): Record<string, EvidenceStatus> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORE) ?? "{}") as Record<string, EvidenceStatus>;
  } catch {
    return {};
  }
}

function readAudit(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUDIT_STORE) ?? "[]");
    return Array.isArray(parsed) ? (parsed as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

/** Who is acting on this device — used as the audit trail signer. */
export function currentActor(): string {
  return sessionLabel(loadSession());
}

function isStatus(v: unknown): v is EvidenceStatus {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

export type ImportRecord = { stepId: string; document: string; status: EvidenceStatus };
export type ImportResult = { records: ImportRecord[]; skipped: number };

function normaliseStatus(raw: string): EvidenceStatus | null {
  const v = raw.trim().toLowerCase();
  const hit = STATUSES.find((s) => s.toLowerCase() === v);
  return hit ?? null;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Accepts a JSON array/object map or a CSV with stepId,document,status columns. */
export function parseProgressFile(text: string): ImportResult {
  const body = text.trim();
  if (!body) throw new Error("The file is empty.");
  const records: ImportRecord[] = [];
  let skipped = 0;

  if (body.startsWith("{") || body.startsWith("[")) {
    const parsed = JSON.parse(body) as unknown;
    const rows: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { items?: unknown[] }).items)
        ? ((parsed as { items: unknown[] }).items)
        : Object.entries(parsed as Record<string, unknown>).map(([k, v]) => ({ key: k, status: v }));
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const key = typeof r["key"] === "string" ? (r["key"] as string) : null;
      const stepId = typeof r["stepId"] === "string" ? (r["stepId"] as string) : key?.split("::")[0];
      const document =
        typeof r["document"] === "string" ? (r["document"] as string) : key?.split("::").slice(1).join("::");
      const status = isStatus(r["status"]) ? r["status"] : normaliseStatus(String(r["status"] ?? ""));
      if (!stepId || !document || !status) {
        skipped += 1;
        continue;
      }
      records.push({ stepId, document, status });
    }
  } else {
    const lines = body.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const header = splitCsvLine(lines[0] ?? "").map((h) => h.toLowerCase());
    const iStep = header.findIndex((h) => h === "stepid" || h === "step" || h === "step id");
    const iDoc = header.findIndex((h) => h === "document" || h === "evidence" || h === "item");
    const iStatus = header.findIndex((h) => h === "status");
    const iKey = header.findIndex((h) => h === "key");
    if (iStatus < 0 || (iKey < 0 && (iStep < 0 || iDoc < 0)))
      throw new Error("CSV needs a status column plus either key, or stepId and document columns.");
    for (const line of lines.slice(1)) {
      const cells = splitCsvLine(line);
      const key = iKey >= 0 ? cells[iKey] : undefined;
      const stepId = iStep >= 0 ? cells[iStep] : key?.split("::")[0];
      const document = iDoc >= 0 ? cells[iDoc] : key?.split("::").slice(1).join("::");
      const status = normaliseStatus(cells[iStatus] ?? "");
      if (!stepId || !document || !status) {
        skipped += 1;
        continue;
      }
      records.push({ stepId, document, status });
    }
  }
  if (records.length === 0) throw new Error("No usable rows found in the file.");
  return { records, skipped };
}

function stepTitleOf(stepId: string) {
  return ROUTE_STEPS.find((s) => s.id === stepId)?.title ?? stepId;
}

export function auditToCsv(entries: AuditEntry[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = ["timestamp_utc", "actor", "route", "step_id", "step", "document", "from", "to", "source"];
  return [
    head.join(","),
    ...entries.map((e) =>
      [e.at, e.actor, e.route, e.stepId, e.stepTitle, e.document, e.from, e.to, e.source].map(esc).join(","),
    ),
  ].join("\n");
}

/** Every evidence item demanded on a route, in rail order. */
export function itemsForRoute(route: RouteKey, state: Record<string, EvidenceStatus>): TrackedItem[] {
  return ROUTE_STEPS.filter((s) => s.routes.includes(route)).flatMap((s) =>
    evidenceFor(s.id, route).map((e) => {
      const key = itemKey(s.id, e.document);
      return { ...e, stepId: s.id, stepTitle: s.title, key, status: state[key] ?? "Outstanding" };
    }),
  );
}

/** Split a reviewer label such as "RBI · CBDT" into individual authorities. */
export function reviewers(item: EvidenceItem) {
  return item.reviewer.split("·").map((r) => r.trim()).filter(Boolean);
}

export type RegulatorGap = {
  reviewer: string;
  total: number;
  validated: number;
  submitted: number;
  prepared: number;
  outstanding: number;
};

export function gapsByRegulator(items: TrackedItem[]): RegulatorGap[] {
  const map = new Map<string, RegulatorGap>();
  for (const item of items) {
    for (const r of reviewers(item)) {
      const row = map.get(r) ?? { reviewer: r, total: 0, validated: 0, submitted: 0, prepared: 0, outstanding: 0 };
      row.total += 1;
      if (item.status === "Validated") row.validated += 1;
      else if (item.status === "Submitted") row.submitted += 1;
      else if (item.status === "Prepared") row.prepared += 1;
      else row.outstanding += 1;
      map.set(r, row);
    }
  }
  return [...map.values()].sort((a, b) => b.outstanding - a.outstanding || a.reviewer.localeCompare(b.reviewer));
}

export type ChangeVerdict = { allowed: boolean; reason: string };
export type EvidenceGuard = (item: TrackedItem, status: EvidenceStatus) => ChangeVerdict;

const ALLOW_ALL: EvidenceGuard = () => ({ allowed: true, reason: "" });

export function useEvidenceState(route: RouteKey, guard: EvidenceGuard = ALLOW_ALL) {
  const [state, setState] = useState<Record<string, EvidenceStatus>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(read());
    setAudit(readAudit());
    setHydrated(true);
  }, []);

  const record = useCallback((entries: AuditEntry[]) => {
    if (entries.length === 0) return;
    setAudit((prev) => {
      const next = [...entries, ...prev].slice(0, 500);
      write(AUDIT_STORE, next);
      return next;
    });
  }, []);

  const set = useCallback(
    (key: string, status: EvidenceStatus): ChangeVerdict => {
      const [stepId, ...rest] = key.split("::");
      const document = rest.join("::");
      const from = state[key] ?? "Outstanding";
      if (from === status) return { allowed: true, reason: "No change." };
      const item = itemsForRoute(route, state).find((i) => i.key === key);
      const verdict = item ? guard(item, status) : { allowed: false, reason: "Unknown evidence item." };
      if (!verdict.allowed) return verdict;
      const next = { ...state, [key]: status };
      setState(next);
      write(STORE, next);
      record([
        {
          at: new Date().toISOString(),
          actor: currentActor(),
          route,
          stepId: stepId ?? "",
          stepTitle: stepTitleOf(stepId ?? ""),
          document,
          from,
          to: status,
          source: "manual",
        },
      ]);
      return verdict;
    },
    [guard, record, route, state],
  );

  /** Prefill statuses from an uploaded progress file; every change is audited. */
  const applyImport = useCallback(
    (records: ImportRecord[]) => {
      const next = { ...state };
      const entries: AuditEntry[] = [];
      const at = new Date().toISOString();
      const actor = currentActor();
      const lookup = new Map(itemsForRoute(route, state).map((i) => [i.key, i] as const));
      let denied = 0;
      for (const r of records) {
        const key = itemKey(r.stepId, r.document);
        const from = next[key] ?? "Outstanding";
        if (from === r.status) continue;
        const item = lookup.get(key);
        if (!item || !guard(item, r.status).allowed) {
          denied += 1;
          continue;
        }
        next[key] = r.status;
        entries.push({
          at,
          actor,
          route,
          stepId: r.stepId,
          stepTitle: stepTitleOf(r.stepId),
          document: r.document,
          from,
          to: r.status,
          source: "import",
        });
      }
      setState(next);
      write(STORE, next);
      record(entries);
      return { applied: entries.length, denied };
    },
    [guard, record, route, state],
  );

  const reset = useCallback(() => {
    const at = new Date().toISOString();
    const actor = currentActor();
    const lookup = new Map(itemsForRoute(route, state).map((i) => [i.key, i] as const));
    const clearable = Object.entries(state).filter(([key, v]) => {
      if (v === "Outstanding") return true;
      const item = lookup.get(key);
      return item ? guard(item, "Outstanding").allowed : false;
    });
    const entries: AuditEntry[] = clearable
      .filter(([, v]) => v !== "Outstanding")
      .map(([key, from]) => {
        const [stepId, ...rest] = key.split("::");
        return {
          at,
          actor,
          route,
          stepId: stepId ?? "",
          stepTitle: stepTitleOf(stepId ?? ""),
          document: rest.join("::"),
          from,
          to: "Outstanding" as EvidenceStatus,
          source: "reset" as const,
        };
      });
    const kept: Record<string, EvidenceStatus> = { ...state };
    for (const [key] of clearable) delete kept[key];
    setState(kept);
    record(entries);
    write(STORE, kept);
  }, [guard, record, route, state]);

  const clearAudit = useCallback(() => {
    setAudit([]);
    try {
      window.localStorage.removeItem(AUDIT_STORE);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const items = useMemo(() => itemsForRoute(route, state), [route, state]);
  const gaps = useMemo(() => gapsByRegulator(items), [items]);
  const validated = items.filter((i) => i.status === "Validated").length;

  return {
    state,
    set,
    reset,
    applyImport,
    audit,
    clearAudit,
    items,
    gaps,
    hydrated,
    validated,
    total: items.length,
  };
}
