// Searchable, filterable audit console across every filing the signed-in desk
// is allowed to read, with subset export and a page-level action trail.
import { useMemo, useState } from "react";
import { auditChain, downloadSubsetCSV, downloadSubsetPDF, stamp, type AuditRow } from "@/lib/audit";
import { PORTAL_STAGES, type PortalApplication } from "@/lib/portal";
import { utc, type ActivityEntry } from "@/lib/activity";

function toMillis(local: string) {
  // The input is read as UTC on purpose — the whole log is stamped in UTC.
  if (!local) return null;
  const t = Date.parse(local.length === 16 ? `${local}:00Z` : `${local}Z`);
  return Number.isNaN(t) ? null : t;
}

export function AuditConsole({
  apps,
  now,
  activity,
  scope,
}: {
  apps: PortalApplication[];
  now: number;
  activity: ActivityEntry[];
  scope: string;
}) {
  const [corporate, setCorporate] = useState("ALL");
  const [stage, setStage] = useState("ALL");
  const [officer, setOfficer] = useState("");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<"blocks" | "actions">("blocks");

  const all: AuditRow[] = useMemo(
    () => apps.flatMap((app) => auditChain(app, now || Date.now()).map((block) => ({ app, block }))),
    [apps, now],
  );

  const fromMs = toMillis(from);
  const toMs = toMillis(to);
  const needle = officer.trim().toLowerCase();

  const rows = all.filter(({ app, block }) => {
    if (corporate !== "ALL" && app.company !== corporate) return false;
    if (stage !== "ALL" && block.key !== stage) return false;
    if (status !== "ALL" && block.state !== status) return false;
    if (needle && !`${block.officer} ${block.designation} ${block.node} ${block.actor}`.toLowerCase().includes(needle))
      return false;
    if (fromMs !== null && (block.at === null || block.at < fromMs)) return false;
    if (toMs !== null && (block.at === null || block.at > toMs)) return false;
    return true;
  });

  const filters: [string, string][] = [
    ["Scope", scope],
    ["Corporate", corporate === "ALL" ? "All filings visible to this desk" : corporate],
    ["Checkpoint stage", stage === "ALL" ? "All stages" : PORTAL_STAGES.find((s) => s.key === stage)!.title],
    ["Status", status === "ALL" ? "All statuses" : status],
    ["Officer / designation contains", officer || "—"],
    ["From (UTC)", fromMs ? stamp(fromMs) : "—"],
    ["To (UTC)", toMs ? stamp(toMs) : "—"],
  ];

  const acts = activity.filter((a) => {
    if (corporate !== "ALL" && a.company !== corporate) return false;
    if (needle && !`${a.actor} ${a.authority} ${a.page}`.toLowerCase().includes(needle)) return false;
    if (fromMs !== null && a.at < fromMs) return false;
    if (toMs !== null && a.at > toMs) return false;
    return true;
  });

  const companies = Array.from(new Set(apps.map((a) => a.company))).sort();

  return (
    <div className="border border-rule/25">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule/25 px-6 py-5">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">
            Audit console — {scope}
          </p>
          <p className="font-display mt-1 text-4xl leading-none">
            {tab === "blocks" ? `${rows.length} of ${all.length} blocks` : `${acts.length} recorded actions`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab("blocks")}
            className={`font-mono-ui border px-3 py-2 text-[10px] uppercase tracking-[0.14em] ${tab === "blocks" ? "border-primary text-primary" : "border-rule/25"}`}
          >
            Checkpoint blocks
          </button>
          <button
            onClick={() => setTab("actions")}
            className={`font-mono-ui border px-3 py-2 text-[10px] uppercase tracking-[0.14em] ${tab === "actions" ? "border-primary text-primary" : "border-rule/25"}`}
          >
            Action trail
          </button>
          <button
            disabled={rows.length === 0}
            onClick={() => downloadSubsetCSV(rows, filters)}
            className="font-mono-ui border border-rule/25 px-3 py-2 text-[10px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary disabled:opacity-40"
          >
            Export selection · CSV
          </button>
          <button
            disabled={rows.length === 0}
            onClick={() =>
              downloadSubsetPDF(
                rows,
                [["Rows exported", String(rows.length)], ...filters],
                `corpvidesh-audit-subset-${rows.length}-rows.pdf`,
                "filtered audit subset",
              )
            }
            className="font-mono-ui bg-primary px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40"
          >
            Export selection · PDF
          </button>
        </div>
      </div>

      <div className="grid gap-px border-b border-rule/25 bg-rule/15 md:grid-cols-3 lg:grid-cols-6">
        <Cell label="Corporate">
          <select value={corporate} onChange={(e) => setCorporate(e.target.value)} className="w-full bg-transparent text-sm outline-none">
            <option value="ALL">All corporates</option>
            {companies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Cell>
        <Cell label="Checkpoint stage">
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full bg-transparent text-sm outline-none">
            <option value="ALL">All ten checkpoints</option>
            {PORTAL_STAGES.map((s, i) => (
              <option key={s.key} value={s.key}>{String(i + 1).padStart(2, "0")} · {s.title}</option>
            ))}
          </select>
        </Cell>
        <Cell label="Officer / designation">
          <input
            value={officer}
            onChange={(e) => setOfficer(e.target.value)}
            placeholder="e.g. Deshmukh, RBI, assessing officer"
            className="w-full bg-transparent text-sm outline-none"
          />
        </Cell>
        <Cell label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-transparent text-sm outline-none">
            <option value="ALL">Any status</option>
            <option value="cleared">Cleared</option>
            <option value="running">Running</option>
            <option value="queued">Queued</option>
          </select>
        </Cell>
        <Cell label="From (UTC)">
          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="tnum w-full bg-transparent text-sm outline-none" />
        </Cell>
        <Cell label="To (UTC)">
          <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="tnum w-full bg-transparent text-sm outline-none" />
        </Cell>
      </div>

      {tab === "blocks" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="font-mono-ui border-b border-rule/25 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Corporate</th>
                <th className="px-4 py-3">Checkpoint</th>
                <th className="px-4 py-3">Cleared by</th>
                <th className="px-4 py-3">Timestamp (UTC)</th>
                <th className="px-4 py-3">Digest</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map(({ app, block }) => (
                <tr key={app.ref + block.key} className="border-b border-rule/10 align-top">
                  <td className="font-mono-ui px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-primary">{app.ref}</td>
                  <td className="px-4 py-3 text-sm">{app.company}</td>
                  <td className="px-4 py-3 text-sm">
                    {String(block.height).padStart(2, "0")} · {block.stage}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {block.officer}
                    <span className="block text-xs">{block.designation} · {block.node}</span>
                  </td>
                  <td className="tnum px-4 py-3 text-xs text-muted-foreground">{stamp(block.at)}</td>
                  <td className="font-mono-ui px-4 py-3 text-[11px] text-primary">{block.shortDigest}</td>
                  <td className="font-mono-ui px-4 py-3 text-[10px] uppercase tracking-[0.14em]">{block.state}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-sm text-muted-foreground">
                    Nothing matches these filters. Widen the stage, officer or UTC window.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          {acts.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              No recorded actions in this window yet. Registering, filing, tracking, approving or exporting all write
              a line here.
            </p>
          ) : (
            acts.slice(0, 200).map((a) => (
              <div key={a.id} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule/10 px-6 py-4">
                <div>
                  <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
                    {a.ref} · {a.action}
                  </p>
                  <p className="mt-1 text-sm">{a.detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.actor} · {a.role === "regulator" ? "regulator desk" : "corporate desk"} · from page{" "}
                    <span className="text-primary">{a.page}</span>
                  </p>
                </div>
                <span className="tnum font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {utc(a.at)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="border-t border-rule/25 border-l-2 border-l-primary bg-primary/[0.04] px-6 py-4">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">In plain words</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Narrow the record to one company, one checkpoint, one officer or one window of clock time, switch between
          the blockchain checkpoints and the human action trail — who did what, when, and from which page — and
          download exactly that selection as a spreadsheet or a PDF. You only ever see the filings your role permits.
        </p>
      </div>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-background p-4">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}