import { useEffect, useState } from "react";
import { auditChain, downloadAuditCSV, downloadAuditPDF, stamp, type AuditBlock } from "@/lib/audit";
import { hash, type PortalApplication } from "@/lib/portal";
import { toast } from "sonner";

export function AuditLog({ app, now }: { app: PortalApplication; now: number }) {
  const chain = auditChain(app, now);
  const cleared = chain.filter((b) => b.state === "cleared");
  const [open, setOpen] = useState<string>(chain[0]!.key);
  const selected = chain.find((b) => b.key === open) ?? chain[0]!;

  // Follow the rail: as a new checkpoint clears, open its block.
  useEffect(() => {
    const last = cleared[cleared.length - 1];
    if (last) setOpen(last.key);
  }, [cleared.length]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border border-rule/25 border-b-0 p-6">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Audit log — {app.ref}
          </p>
          <p className="font-display mt-1 text-3xl leading-none">
            {cleared.length} of {chain.length} checkpoints written
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Genesis {hash(app.ref + ":genesis").slice(0, 24)}… · head {chain[chain.length - 1]!.blockHash.slice(0, 24)}…
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              downloadAuditCSV(app, chain);
              toast("Audit log exported", { description: `${app.ref}-audit-log.csv downloaded.` });
            }}
            className="font-mono-ui border border-rule/25 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              downloadAuditPDF(app, chain);
              toast("Audit log exported", { description: `${app.ref}-audit-log.pdf downloaded.` });
            }}
            className="font-mono-ui bg-primary px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-primary-foreground"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid gap-px border border-rule/25 bg-rule/15 lg:grid-cols-[1.05fr_1fr]">
        <div className="bg-background">
          <div className="grid grid-cols-[36px_1fr_92px] border-b border-rule/10 px-5 py-2.5">
            {["#", "Checkpoint · cleared by · timestamp", "Digest"].map((h) => (
              <p key={h} className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                {h}
              </p>
            ))}
          </div>
          <ol>
            {chain.map((b) => (
              <li key={b.key}>
                <button
                  onClick={() => setOpen(b.key)}
                  className={`grid w-full grid-cols-[36px_1fr_92px] items-start gap-2 border-b border-rule/10 px-5 py-3.5 text-left transition-colors hover:bg-secondary ${
                    b.key === selected.key ? "bg-secondary" : ""
                  }`}
                >
                  <span className="font-mono-ui text-[11px] text-primary">{String(b.height).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-sm leading-tight">{b.stage}</span>
                    <span className="block text-xs text-muted-foreground">
                      {b.officer} · {b.at ? stamp(b.at).slice(0, 19) : b.state === "running" ? "writing…" : "queued"}
                    </span>
                  </span>
                  <span
                    className={`font-mono-ui text-[10px] ${
                      b.state === "cleared" ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {b.state === "cleared" ? b.shortDigest.slice(0, 10) : "—"}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <BlockInspector app={app} block={selected} chain={chain} />
      </div>
    </div>
  );
}

function BlockInspector({
  app,
  block,
  chain,
}: {
  app: PortalApplication;
  block: AuditBlock;
  chain: AuditBlock[];
}) {
  const trail = chain.slice(0, block.height);
  const pending = block.state !== "cleared";
  return (
    <div className="bg-background">
      <div className="border-b border-rule/10 p-6">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Block {String(block.height).padStart(2, "0")} · {block.state}
        </p>
        <p className="font-display mt-1 text-3xl leading-tight">{block.stage}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{block.plain}</p>
      </div>

      <dl className="grid grid-cols-1 gap-px bg-rule/15 sm:grid-cols-2">
        <Cell k="Cleared by" v={block.officer} sub={block.designation} />
        <Cell k="Node" v={block.node} sub={block.actor} />
        <Cell k="Timestamp (UTC)" v={pending ? "not yet written" : stamp(block.at)} sub="ISO-8601, millisecond precision" />
        <Cell k="Evidence artefact" v={block.evidence} sub={pending ? "sealed on clearance" : "sealed"} />
      </dl>

      <div className="border-t border-rule/10 p-6">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Evidence digest</p>
        <p className="font-mono-ui mt-2 break-all text-[12px] leading-relaxed">{block.digest}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          The fingerprint of the artefact itself. Re-hash the document and it must match this string, character for
          character — otherwise the document was changed after it was filed.
        </p>
      </div>

      <div className="border-t border-rule/10 p-6">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Linked documents</p>
        <ul className="mt-2 space-y-1.5">
          {block.documents.map((d) => (
            <li key={d} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
              <span className="font-mono-ui text-[10px] text-primary">›</span>
              <span>
                {d}
                <span className="font-mono-ui ml-2 text-[10px] text-primary/70">
                  {hash(app.ref + block.key + d).slice(0, 12)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-rule/10 p-6">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Hash-chained proof trail</p>
        <ol className="mt-3 space-y-0">
          <li className="border-l-2 border-primary/25 pl-4">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Genesis</p>
            <p className="font-mono-ui break-all text-[11px]">{hash(app.ref + ":genesis").slice(0, 40)}</p>
          </li>
          {trail.map((b) => (
            <li
              key={b.key}
              className={`mt-3 border-l-2 pl-4 ${b.key === block.key ? "border-primary" : "border-primary/25"}`}
            >
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {String(b.height).padStart(2, "0")} · {b.stage} {b.state === "cleared" ? "" : `(${b.state})`}
              </p>
              <p className="font-mono-ui break-all text-[11px]">
                <span className="text-muted-foreground">prev </span>
                {b.prevHash.slice(0, 24)}…
              </p>
              <p className="font-mono-ui break-all text-[11px] text-primary">
                <span className="text-muted-foreground">block </span>
                {b.blockHash}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          <span className="font-mono-ui uppercase tracking-[0.14em] text-primary">In plain words — </span>
          every block is stamped with the fingerprint of the one before it. Change a timestamp, an officer's name or a
          single page of an annexure and every block after it stops matching, so an auditor sees the tampering
          immediately.
        </p>
      </div>
    </div>
  );
}

function Cell({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="bg-background p-5">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{k}</p>
      <p className="mt-1.5 text-sm leading-tight">{v}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
