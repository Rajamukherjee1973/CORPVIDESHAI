import { useState } from "react";
import type { EvidenceItem, RouteKey } from "@/lib/routes-detail";
import { evidenceFor } from "@/lib/routes-detail";
import {
  ROLES,
  ROLE_LABEL,
  ROLE_PLAIN,
  allowedStatuses,
  type PermissionConfig,
} from "@/lib/evidence-permissions";
import type { DeskRole } from "@/lib/session";
import {
  STATUSES,
  auditToCsv,
  itemKey,
  parseProgressFile,
  type AuditEntry,
  type ImportRecord,
  type EvidenceStatus,
  type RegulatorGap,
  type TrackedItem,
} from "@/lib/evidence-state";

const TONE: Record<EvidenceStatus, string> = {
  Outstanding: "border-rule/30 text-muted-foreground",
  Prepared: "border-rule/50 text-foreground",
  Submitted: "border-primary text-primary",
  Validated: "border-primary bg-primary text-primary-foreground",
};

/** Interactive evidence checklist for a single step of a route. */
export function StepEvidence({
  route,
  stepId,
  status,
  onSet,
  can,
  roleLabel,
}: {
  route: RouteKey;
  stepId: string;
  status: (key: string) => EvidenceStatus;
  onSet: (key: string, s: EvidenceStatus) => void;
  can: (item: EvidenceItem, s: EvidenceStatus) => { allowed: boolean; reason: string };
  roleLabel: string;
}) {
  const items = evidenceFor(stepId, route);
  const [denied, setDenied] = useState<string | null>(null);
  const done = items.filter((e) => status(itemKey(stepId, e.document)) === "Validated").length;

  return (
    <div className="mt-6 border border-rule/20">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule/20 bg-primary px-4 py-2.5 text-primary-foreground">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em]">
          Regulator evidence checklist — this step
        </p>
        <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] opacity-80">
          {done}/{items.length} validated · {route} route · acting as {roleLabel}
        </p>
      </div>
      <div className="hidden grid-cols-[1.3fr_0.7fr_0.9fr_1.4fr_auto] gap-4 border-b border-rule/20 px-4 py-2 xl:grid">
        {["Document required", "Supplied by", "Reviewed by", "What the reviewer tests", "Status"].map((h) => (
          <p key={h} className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            {h}
          </p>
        ))}
      </div>
      <ul className="divide-y divide-rule/12">
        {items.map((e) => {
          const key = itemKey(stepId, e.document);
          const current = status(key);
          return (
            <li key={key} className="grid gap-2 px-4 py-3 xl:grid-cols-[1.3fr_0.7fr_0.9fr_1.4fr_auto] xl:gap-4">
              <p className="text-sm font-medium leading-snug">{e.document}</p>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="xl:hidden">Supplied by · </span>
                {e.supplier}
              </p>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">
                <span className="xl:hidden">Reviewed by · </span>
                {e.reviewer}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">{e.reviews}</p>
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label={`Completeness status for ${e.document}`}
              >
                {STATUSES.map((s) => {
                  const verdict = can(e, s);
                  const locked = !verdict.allowed && current !== s;
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={current === s}
                      aria-disabled={locked}
                      disabled={locked}
                      title={verdict.reason}
                      onClick={() => {
                        if (locked) {
                          setDenied(verdict.reason);
                          return;
                        }
                        setDenied(null);
                        onSet(key, s);
                      }}
                      className={`font-mono-ui border px-2 py-1 text-[9px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        current === s
                          ? TONE[s]
                          : locked
                            ? "cursor-not-allowed border-rule/15 text-muted-foreground/45 line-through"
                            : "border-rule/20 text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
        {denied ? (
          <li className="bg-primary/[0.05] px-4 py-2.5 text-xs leading-relaxed text-primary">
            Permission refused — {denied}
          </li>
        ) : null}
        {items.length === 0 ? (
          <li className="px-4 py-3 text-xs text-muted-foreground">
            No separate document is demanded at this step on the {route} route — the rail derives it from
            evidence already on file.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** Where the file is still short, grouped by the authority that will read it. */
export function GapMatrix({
  gaps,
  items,
  route,
  onReset,
}: {
  gaps: RegulatorGap[];
  items: TrackedItem[];
  route: RouteKey;
  onReset: () => void;
}) {
  const outstanding = items.filter((i) => i.status !== "Validated");

  return (
    <div className="border border-rule/20">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule/20 px-4 py-3">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Completeness by regulator — {route} route
        </p>
        <button
          type="button"
          onClick={onReset}
          className="font-mono-ui border border-rule/30 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Reset tracker
        </button>
      </div>
      <ul className="divide-y divide-rule/12">
        {gaps.map((g) => {
          const pct = g.total ? Math.round((g.validated / g.total) * 100) : 0;
          return (
            <li key={g.reviewer} className="grid gap-2 px-4 py-3 sm:grid-cols-[1.2fr_2fr_auto] sm:items-center sm:gap-4">
              <p className="font-mono-ui text-[11px] uppercase tracking-[0.14em]">{g.reviewer}</p>
              <div
                className="h-2 w-full border border-rule/25"
                role="img"
                aria-label={`${pct}% validated for ${g.reviewer}`}
              >
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {g.validated}/{g.total} validated · {g.outstanding} outstanding · {g.prepared} prepared ·{" "}
                {g.submitted} submitted
              </p>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-rule/20 px-4 py-3">
        <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          Still to clear — {outstanding.length} of {items.length}
        </p>
        <ul className="mt-2 grid gap-1.5 md:grid-cols-2">
          {outstanding.slice(0, 12).map((i) => (
            <li key={i.key} className="text-xs leading-relaxed text-muted-foreground">
              <span className="text-primary">{i.status}</span> · {i.document}{" "}
              <span className="text-muted-foreground/70">— {i.stepTitle}</span>
            </li>
          ))}
          {outstanding.length === 0 ? (
            <li className="text-xs text-primary">
              Every document on this route is validated. The file is submission-complete.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

/** Upload a JSON/CSV progress file to prefill statuses across the whole route. */
export function ProgressImport({
  route,
  items,
  onApply,
}: {
  route: RouteKey;
  items: TrackedItem[];
  onApply: (records: ImportRecord[]) => { applied: number; denied: number };
}) {
  const inputId = "evidence-progress-file";
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    setMsg(null);
    try {
      const { records, skipped } = parseProgressFile(await file.text());
      const { applied, denied } = onApply(records);
      setMsg(
        `${applied} status${applied === 1 ? "" : "es"} applied from ${records.length} row${
          records.length === 1 ? "" : "s"
        }${skipped ? ` · ${skipped} row(s) ignored` : ""}${
          denied ? ` · ${denied} row(s) refused — your desk may not set those statuses` : ""
        }. Regulator gaps and exports recalculated.`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  const template = () => {
    const csv = [
      "stepId,document,status",
      ...items.map((i) => `"${i.stepId}","${i.document.replace(/"/g, '""')}","${i.status}"`),
    ].join("\n");
    download(`corpvidesh-progress-${route.toLowerCase()}.csv`, csv, "text/csv");
  };

  return (
    <div className="border border-rule/20">
      <div className="border-b border-rule/20 px-4 py-3">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Import a progress file — JSON or CSV
        </p>
      </div>
      <div className="grid gap-3 px-4 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          In plain words: if your team already tracks these documents in a spreadsheet, upload it here. Every
          matching row sets the status straight away, the regulator gap bars redraw, and each change is written
          into the audit trail below with who did it and when. CSV needs{" "}
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-primary">
            stepId, document, status
          </span>{" "}
          columns; JSON accepts an array of the same fields or a key/status map.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={inputId}
            className="font-mono-ui cursor-pointer border border-primary bg-primary px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-primary-foreground"
          >
            Choose file
          </label>
          <input
            id={inputId}
            type="file"
            accept=".json,.csv,application/json,text/csv,text/plain"
            className="sr-only"
            onChange={(e) => {
              void handle(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={template}
            className="font-mono-ui border border-rule/30 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Download current state as CSV template
          </button>
        </div>
        {msg ? <p className="text-xs leading-relaxed text-primary">{msg}</p> : null}
        {err ? <p className="text-xs leading-relaxed text-primary">Import failed: {err}</p> : null}
      </div>
    </div>
  );
}

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Immutable record of every status change made on this device. */
export function EvidenceAudit({
  entries,
  route,
  onClear,
}: {
  entries: AuditEntry[];
  route: RouteKey;
  onClear: () => void;
}) {
  const [all, setAll] = useState(false);
  const scoped = all ? entries : entries.filter((e) => e.route === route);
  const shown = scoped.slice(0, 40);

  return (
    <div className="border border-rule/20">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule/20 px-4 py-3">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Evidence audit trail — {scoped.length} recorded change{scoped.length === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className="font-mono-ui border border-rule/30 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {all ? "This route only" : "Both routes"}
          </button>
          <button
            type="button"
            onClick={() => download(`corpvidesh-evidence-audit.csv`, auditToCsv(scoped), "text/csv")}
            className="font-mono-ui border border-rule/30 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() =>
              download(`corpvidesh-evidence-audit.json`, JSON.stringify(scoped, null, 2), "application/json")
            }
            className="font-mono-ui border border-rule/30 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={onClear}
            className="font-mono-ui border border-rule/30 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Clear log
          </button>
        </div>
      </div>
      <div className="hidden grid-cols-[0.9fr_1fr_1.5fr_1.1fr_0.7fr] gap-4 border-b border-rule/20 px-4 py-2 xl:grid">
        {["Timestamp (UTC)", "Signed by", "Document", "Change", "Source"].map((h) => (
          <p key={h} className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            {h}
          </p>
        ))}
      </div>
      <ul className="divide-y divide-rule/12">
        {shown.map((e, i) => (
          <li
            key={`${e.at}-${e.stepId}-${e.document}-${i}`}
            className="grid gap-1.5 px-4 py-3 xl:grid-cols-[0.9fr_1fr_1.5fr_1.1fr_0.7fr] xl:gap-4"
          >
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {e.at.replace("T", " ").slice(0, 19)}
            </p>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.12em]">{e.actor}</p>
            <p className="text-xs leading-relaxed">
              {e.document}
              <span className="text-muted-foreground"> — {e.stepTitle}</span>
            </p>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-primary">
              {e.from} → {e.to}
            </p>
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              {e.source} · {e.route}
            </p>
          </li>
        ))}
        {scoped.length === 0 ? (
          <li className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            No status changes recorded yet. Every time someone marks a document prepared, submitted or
            validated — by hand or through an import — the change is stamped here with the signer and the time.
          </li>
        ) : null}
      </ul>
      {scoped.length > shown.length ? (
        <p className="border-t border-rule/20 px-4 py-2 font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          Showing the latest {shown.length} of {scoped.length} — export for the full log
        </p>
      ) : null}
    </div>
  );
}


/** Who may set what. Read-only for every desk except the platform administrator. */
export function PermissionMatrix({
  config,
  isAdmin,
  stepId,
  stepTitle,
  onToggle,
  onScope,
  onClearStep,
  onReset,
}: {
  config: PermissionConfig;
  isAdmin: boolean;
  stepId: string;
  stepTitle: string;
  onToggle: (role: DeskRole, status: EvidenceStatus, on: boolean, stepId?: string) => void;
  onScope: (on: boolean) => void;
  onClearStep: (stepId: string) => void;
  onReset: () => void;
}) {
  const [scope, setScope] = useState<"step" | "global">("step");
  const perStep = scope === "step";
  const overridden = Boolean(config.steps[stepId]);

  return (
    <div className="border border-rule/20">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule/20 bg-primary px-4 py-2.5 text-primary-foreground">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em]">
          Role permissions — who may set which status
        </p>
        <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] opacity-80">
          {isAdmin ? "Administrator — editable" : "Read-only on this desk"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-rule/20 px-4 py-3">
        {(["step", "global"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={scope === v}
            onClick={() => setScope(v)}
            className={`font-mono-ui border px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] transition-colors ${
              scope === v
                ? "border-primary bg-primary text-primary-foreground"
                : "border-rule/30 text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {v === "step" ? `This step — ${stepId}` : "All steps (default)"}
          </button>
        ))}
        {overridden && perStep ? (
          <button
            type="button"
            disabled={!isAdmin}
            onClick={() => onClearStep(stepId)}
            className="font-mono-ui border border-rule/30 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
          >
            Clear this step's override
          </button>
        ) : null}
        <button
          type="button"
          disabled={!isAdmin}
          onClick={onReset}
          className="font-mono-ui border border-rule/30 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
        >
          Restore statutory defaults
        </button>
      </div>

      <div className="hidden grid-cols-[1.1fr_1.6fr_1.4fr] gap-4 border-b border-rule/20 px-4 py-2 xl:grid">
        {["Desk", "What this desk is", "Statuses it may set"].map((h) => (
          <p key={h} className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            {h}
          </p>
        ))}
      </div>
      <ul className="divide-y divide-rule/12">
        {ROLES.map((role) => {
          const list = perStep ? allowedStatuses(config, role, stepId) : config.base[role];
          return (
            <li key={role} className="grid gap-2 px-4 py-3 xl:grid-cols-[1.1fr_1.6fr_1.4fr] xl:gap-4">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">
                {ROLE_LABEL[role]}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">{ROLE_PLAIN[role]}</p>
              <div className="flex flex-wrap gap-1" role="group" aria-label={`Statuses ${ROLE_LABEL[role]} may set`}>
                {STATUSES.map((st) => {
                  const on = list.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      aria-pressed={on}
                      disabled={!isAdmin}
                      onClick={() => onToggle(role, st, !on, perStep ? stepId : undefined)}
                      className={`font-mono-ui border px-2 py-1 text-[9px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-rule/20 text-muted-foreground/60 line-through"
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
                {list.length === 0 ? (
                  <span className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    View only
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule/20 px-4 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Regulator officers may act only on documents their own authority reviews.
        </p>
        <button
          type="button"
          disabled={!isAdmin}
          aria-pressed={config.scopeRegulatorsToOwnDocuments}
          onClick={() => onScope(!config.scopeRegulatorsToOwnDocuments)}
          className={`font-mono-ui border px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] transition-colors disabled:opacity-40 ${
            config.scopeRegulatorsToOwnDocuments
              ? "border-primary bg-primary text-primary-foreground"
              : "border-rule/30 text-muted-foreground"
          }`}
        >
          {config.scopeRegulatorsToOwnDocuments ? "Own-authority scope on" : "Own-authority scope off"}
        </button>
      </div>

      <div className="border-t border-rule/20 border-l-2 border-l-primary bg-primary/[0.04] px-4 py-3">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">In plain words</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Each desk gets its own set of buttons on {stepTitle}. A company can say a paper is ready and handed
          in, but only the regulator that reads it can mark it passed, an investor can look without touching,
          and the administrator can widen or narrow any of it — step by step. Every permitted change is still
          signed and written into the audit trail.
        </p>
      </div>
    </div>
  );
}
