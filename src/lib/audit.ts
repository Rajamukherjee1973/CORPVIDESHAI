// Audit log + evidence hash chain for a portal application.
// Every checkpoint produces an evidence digest; digests are chained so any
// tampering with an earlier block invalidates every block after it.
import jsPDF from "jspdf";
import {
  CLEARERS,
  PORTAL_STAGES,
  hash,
  progressFor,
  type PortalApplication,
} from "@/lib/portal";

export type AuditBlock = {
  height: number;
  key: string;
  stage: string;
  actor: string;
  officer: string;
  designation: string;
  node: string;
  state: "queued" | "running" | "cleared";
  at: number | null;
  evidence: string;
  digest: string;
  shortDigest: string;
  prevHash: string;
  blockHash: string;
  documents: string[];
  plain: string;
};

/** Documents each checkpoint reads or produces, drawn from the filed annexures. */
function docsFor(app: PortalApplication, key: string): string[] {
  const filed = app.documents.map((d) => `${d.name} — ${d.file}`);
  switch (key) {
    case "received":
      return filed.length ? filed : ["Intake manifest (no annexure attached)"];
    case "kyc":
      return filed.filter((d) => /kyc|board resolution/i.test(d)).concat("AD-bank signatory mandate");
    case "reason":
      return filed.filter((d) => /net-worth|valuation/i.test(d)).concat("Rule 7 determination note");
    case "docs":
      return ["Completeness report against the statute list", ...filed.slice(0, 3)];
    case "parallel":
      return ["Signed dossier — six-regulator copy", "Six clearance receipts"];
    case "tax":
      return filed.filter((d) => /15CA|15CB/i.test(d)).concat("Section 195 position note");
    case "zk":
      return ["Groth16 proof artefact", "Public inputs — ceiling, commitment"];
    case "uin":
      return ["UIN allotment advice", "Form FC — Part I acknowledgement"];
    case "settle":
      return ["Settlement advice", "SWIFT / GIFT IFSC value-date confirmation"];
    default:
      return ["Ledger block header", "Annual performance report seed"];
  }
}

export function auditChain(app: PortalApplication, now: number): AuditBlock[] {
  const prog = progressFor(app, now || Date.now());
  let prev = hash(app.ref + ":genesis").slice(0, 40);
  let offset = 0;
  return PORTAL_STAGES.map((s, i) => {
    offset += s.seconds;
    const clearer = CLEARERS[s.key]!;
    const state = prog.states[i]!;
    const digest = hash(app.ref + s.key);
    const blockHash = hash(prev + digest + String(i)).slice(0, 40);
    const block: AuditBlock = {
      height: i + 1,
      key: s.key,
      stage: s.title,
      actor: s.actor,
      officer: clearer.officer,
      designation: clearer.designation,
      node: clearer.node,
      state,
      at: state === "cleared" ? app.createdAt + offset * 1000 : null,
      evidence: s.evidence,
      digest,
      shortDigest: digest.slice(0, 16),
      prevHash: prev,
      blockHash,
      documents: docsFor(app, s.key),
      plain: s.plain,
    };
    prev = blockHash;
    return block;
  });
}

export const stamp = (t: number | null) =>
  t === null ? "—" : new Date(t).toISOString().replace("T", " ").slice(0, 23) + "Z";

export function auditCSV(app: PortalApplication, chain: AuditBlock[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = [
    "block_height","stage_key","stage","status","timestamp_utc","actor","cleared_by","designation","node",
    "evidence_artefact","evidence_digest","previous_block_hash","block_hash","linked_documents",
  ];
  const rows = chain.map((b) =>
    [
      String(b.height), b.key, b.stage, b.state.toUpperCase(), stamp(b.at), b.actor, b.officer, b.designation,
      b.node, b.evidence, b.digest, b.prevHash, b.blockHash, b.documents.join(" | "),
    ].map(esc).join(","),
  );
  const header = [
    `# CorpVidesh AI — audit log`,
    `# Reference,${app.ref}`,
    `# Entity,${app.company}`,
    `# Corridor,GIFT IFSC to ${app.hub}, ${app.country}`,
    `# Route,${app.route} (${app.routeBasis})`,
    `# Amount (INR Cr),${app.amountCr}`,
    `# Exported (UTC),${stamp(Date.now())}`,
  ];
  return [...header, head.map(esc).join(","), ...rows].join("\n");
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadAuditCSV(app: PortalApplication, chain: AuditBlock[]) {
  download(`${app.ref}-audit-log.csv`, new Blob([auditCSV(app, chain)], { type: "text/csv;charset=utf-8" }));
}

export function downloadAuditPDF(app: PortalApplication, chain: AuditBlock[]) {
  downloadSubsetPDF(
    chain.map((b) => ({ app, block: b })),
    [
      ["Reference", app.ref],
      ["Entity", app.company],
      ["Corridor", `GIFT IFSC to ${app.hub}, ${app.country}`],
      ["Route", `${app.route} - ${app.routeBasis}`],
      ["Financial commitment", `INR ${app.amountCr.toLocaleString("en-IN")} Cr`],
      ["Signatory", `${app.contact} · ${app.email}`],
      ["Exported (UTC)", stamp(Date.now())],
    ],
    `${app.ref}-audit-log.pdf`,
    `${app.ref} — audit log`,
  );
}

/** One row of a filtered audit export: a block plus the filing it belongs to. */
export type AuditRow = { app: PortalApplication; block: AuditBlock };

export function subsetCSV(entries: AuditRow[], filters: [string, string][]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = [
    "reference","entity","corridor","route","block_height","stage_key","stage","status","timestamp_utc",
    "actor","cleared_by","designation","node","evidence_artefact","evidence_digest",
    "previous_block_hash","block_hash","linked_documents",
  ];
  const body = entries.map(({ app, block: b }) =>
    [
      app.ref, app.company, `GIFT IFSC to ${app.hub}, ${app.country}`, app.route,
      String(b.height), b.key, b.stage, b.state.toUpperCase(), stamp(b.at), b.actor, b.officer,
      b.designation, b.node, b.evidence, b.digest, b.prevHash, b.blockHash, b.documents.join(" | "),
    ].map(esc).join(","),
  );
  const header = [
    "# CorpVidesh AI — audit log (filtered subset)",
    `# Rows,${entries.length}`,
    ...filters.map(([k, v]) => `# ${k},${v}`),
    `# Exported (UTC),${stamp(Date.now())}`,
  ];
  return [...header, head.map(esc).join(","), ...body].join("\n");
}

export function downloadSubsetCSV(entries: AuditRow[], filters: [string, string][]) {
  download(
    `corpvidesh-audit-subset-${entries.length}-rows.csv`,
    new Blob([subsetCSV(entries, filters)], { type: "text/csv;charset=utf-8" }),
  );
}

export function downloadSubsetPDF(
  entries: AuditRow[],
  meta: [string, string][],
  filename = "corpvidesh-audit-subset.pdf",
  footer = "filtered audit subset",
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = M;

  const red: [number, number, number] = [216, 30, 5];
  const ink: [number, number, number] = [17, 17, 17];
  const grey: [number, number, number] = [110, 110, 110];

  const page = () => {
    doc.addPage();
    y = M;
  };
  const need = (h: number) => {
    if (y + h > H - M) page();
  };

  doc.setFillColor(...red);
  doc.rect(M, y, 10, 10, "F");
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold").setFontSize(15);
  doc.text("CORPVIDESH AI — AUDIT LOG", M + 18, y + 9.5);
  y += 26;
  doc.setDrawColor(...red).setLineWidth(1.2);
  doc.line(M, y, W - M, y);
  y += 18;

  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...grey);
  meta.forEach(([k, v]) => {
    doc.setTextColor(...grey).text(k.toUpperCase(), M, y);
    doc.setTextColor(...ink).text(String(v), M + 130, y);
    y += 13;
  });
  y += 8;
  doc.setDrawColor(220).setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 20;

  entries.forEach(({ app, block: b }) => {
    const docLines = b.documents.flatMap((d) => doc.splitTextToSize(`· ${d}`, W - 2 * M - 12) as string[]);
    need(112 + docLines.length * 11);
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...red);
    doc.text(`${app.ref} · BLOCK ${String(b.height).padStart(2, "0")} · ${b.state.toUpperCase()}`, M, y);
    doc.setTextColor(...grey).setFont("helvetica", "normal");
    doc.text(stamp(b.at), W - M, y, { align: "right" });
    y += 15;
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...ink);
    doc.text(b.stage, M, y);
    y += 14;
    doc.setFont("helvetica", "normal").setFontSize(8.6).setTextColor(...ink);
    const rows: [string, string][] = [
      ["Entity", app.company],
      ["Cleared by", `${b.officer}, ${b.designation}`],
      ["Node", b.node],
      ["Evidence", b.evidence],
      ["Digest", b.digest],
      ["Prev hash", b.prevHash],
      ["Block hash", b.blockHash],
    ];
    rows.forEach(([k, v]) => {
      doc.setTextColor(...grey).text(k, M, y);
      doc.setTextColor(...ink).text(v, M + 78, y);
      y += 11;
    });
    doc.setTextColor(...grey).text("Documents", M, y);
    docLines.forEach((l, i) => {
      doc.setTextColor(...ink).text(l, M + 78, y + i * 11);
    });
    y += docLines.length * 11 + 10;
    doc.setDrawColor(230).line(M, y, W - M, y);
    y += 16;
  });

  need(60);
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...red);
  doc.text("CHAIN INTEGRITY", M, y);
  y += 13;
  doc.setFont("helvetica", "normal").setFontSize(8.6).setTextColor(...ink);
  const last = entries[entries.length - 1];
  const note = doc.splitTextToSize(
    last
      ? `Each block carries the hash of the block before it. Recomputing the chain of ${last.app.ref} from the genesis digest ${hash(
          last.app.ref + ":genesis",
        ).slice(0, 40)} must reproduce the block hash ${last.block.blockHash}. Any altered timestamp, officer or document changes every hash after it, so the record cannot be edited silently.`
      : "No blocks matched the selected filters, so nothing was exported.",
    W - 2 * M,
  ) as string[];
  note.forEach((l) => {
    doc.text(l, M, y);
    y += 11;
  });

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5).setTextColor(...grey);
    doc.text(`${footer} · CorpVidesh AI prototype`, M, H - 22);
    doc.text(`${i} / ${total}`, W - M, H - 22, { align: "right" });
  }
  doc.save(filename);
}
