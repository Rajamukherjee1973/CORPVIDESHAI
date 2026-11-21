import jsPDF from "jspdf";
import { AXES, LAYERS, gridFor, scaleLabel } from "@/lib/mechanism";
import { ENGINE_META } from "@/lib/regulator";
import { STATE_LABEL, type WorkTask } from "@/lib/worklist";

export const MECHANISM_OPEN_KEY = "cv.mechanism.open";

/** Layer the operator currently has expanded on the Mechanism Matrix. */
export function currentMechanismLayer(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(MECHANISM_OPEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setMechanismLayer(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MECHANISM_OPEN_KEY, id);
  } catch {
    /* storage unavailable — export falls back to "none expanded" */
  }
}

export type ReadyListBlock = { title: string; caption: string; tasks: WorkTask[] };
export type OwnershipRow = { desk: string; owns: string; notHere: string };

const RED: [number, number, number] = [216, 30, 5];
const INK: [number, number, number] = [17, 17, 17];
const GREY: [number, number, number] = [108, 108, 108];
const LINE: [number, number, number] = [214, 214, 214];

const stampUTC = (t: number) => new Date(t).toISOString().replace("T", " ").slice(0, 19) + " UTC";

/** Why the Ready List exists — printed on the dossier so the reader needs no briefing. */
const WHY: [string, string][] = [
  [
    "One task, one desk",
    "An outbound investment file passes a treasury, an AD bank and six regulators. Without a single matrix the same check is repeated on three desks and owned by none. Every row here names exactly one executing desk.",
  ],
  [
    "Statutory traceability",
    "Each row carries the provision it discharges — FEMA, OI Rules 2022, OI Directions, the Income-tax Act or a DTAA. A supervisor can test the list against the law line by line rather than against a narrative.",
  ],
  [
    "Sequence is the control",
    "Rule 7 headroom must be settled before a route is chosen, and the route before annexures are drawn. The sequence column makes an out-of-order filing visible before it is submitted, not after it is queried.",
  ],
  [
    "Machine and human split, stated",
    "The engine column records which layer of the stack executed the step — deterministic rules, Qwen reasoning, LangChain retrieval or the federated ledger — and which steps remain a signed human act.",
  ],
  [
    "Evidence at export time",
    "The mechanism matrix is exported in the state the operator was reading it, so the dossier reflects a real moment on the desk and can be filed alongside the application.",
  ],
];

/** One-click Ready List dossier: matrix-structured, self-explaining. */
export function downloadReadyListPDF(opts: {
  role: string;
  blocks: ReadyListBlock[];
  ownership: OwnershipRow[];
  openLayer?: string;
  filename?: string;
}) {
  const { role, blocks, ownership } = opts;
  const openLayer = opts.openLayer ?? currentMechanismLayer();

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 34;
  const CW = W - 2 * M;
  let y = M;
  let pageNo = 0;

  const wrap = (t: string, w: number, size: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size);
    return doc.splitTextToSize(t || "—", w) as string[];
  };

  const footer = () => {
    doc.setDrawColor(...LINE).setLineWidth(0.5);
    doc.line(M, H - 26, W - M, H - 26);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...GREY);
    doc.text("CORPVIDESH AI · READY LIST DOSSIER · GIFT IFSC OUTBOUND RAIL", M, H - 16);
    doc.text(String(pageNo).padStart(2, "0"), W - M, H - 16, { align: "right" });
  };

  const newPage = () => {
    if (pageNo > 0) {
      footer();
      doc.addPage();
    }
    pageNo += 1;
    y = M;
  };
  const need = (h: number) => {
    if (y + h > H - 40) newPage();
  };

  const bandTitle = (kicker: string, title: string) => {
    need(52);
    doc.setFillColor(...RED);
    doc.rect(M, y, CW, 18, "F");
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(255, 255, 255);
    doc.text(kicker.toUpperCase(), M + 8, y + 12.5);
    doc.text(title.toUpperCase(), W - M - 8, y + 12.5, { align: "right" });
    y += 18;
  };

  const caption = (t: string) => {
    const lines = wrap(t, CW, 8.5);
    need(lines.length * 10 + 8);
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GREY);
    lines.forEach((l) => {
      doc.text(l, M, y + 9);
      y += 10;
    });
    y += 6;
  };

  /** Bordered matrix table with header row, wrapping cells and page-safe rows. */
  const table = (
    cols: { label: string; w: number; bold?: boolean; red?: boolean }[],
    rows: string[][],
    size = 7.6,
  ) => {
    const widths = cols.map((c) => (c.w / cols.reduce((s, x) => s + x.w, 0)) * CW);
    const xs: number[] = [];
    widths.reduce((acc, w, i) => ((xs[i] = acc), acc + w), M);

    const head = () => {
      doc.setFont("helvetica", "bold").setFontSize(6.8);
      const heads = cols.map((c, i) => doc.splitTextToSize(c.label.toUpperCase(), widths[i]! - 10) as string[]);
      const hh = Math.max(...heads.map((h) => h.length)) * 9 + 7;
      need(hh + 12);
      doc.setFillColor(246, 246, 246);
      doc.rect(M, y, CW, hh, "F");
      doc.setDrawColor(...RED).setLineWidth(0.9);
      doc.line(M, y + hh, W - M, y + hh);
      doc.setFont("helvetica", "bold").setFontSize(6.8).setTextColor(...RED);
      heads.forEach((lines, i) => lines.forEach((l, li) => doc.text(l, xs[i]! + 5, y + 10.5 + li * 9)));
      y += hh;
    };
    head();

    rows.forEach((r, ri) => {
      // A cell may carry a bold lead line followed by normal body text.
      const cells = r.map((v, i) => {
        const [lead, ...rest] = v.split("\n");
        const bold = cols[i]?.bold ?? false;
        const leadLines = wrap(lead ?? "", widths[i]! - 10, size, bold).map((t) => ({ t, b: bold }));
        const restLines = rest.flatMap((x) => wrap(x, widths[i]! - 10, size).map((t) => ({ t, b: false })));
        return [...leadLines, ...restLines];
      });
      const h = Math.max(...cells.map((c) => c.length)) * (size + 2.4) + 9;
      if (y + h > H - 40) {
        newPage();
        head();
      }
      if (ri % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(M, y, CW, h, "F");
      }
      cells.forEach((lines, i) => {
        lines.forEach((l, li) => {
          doc.setFont("helvetica", l.b ? "bold" : "normal").setFontSize(size);
          doc.setTextColor(...(cols[i]?.red ? RED : l.b ? INK : GREY));
          doc.text(l.t, xs[i]! + 5, y + 10 + li * (size + 2.4));
        });
      });
      doc.setDrawColor(...LINE).setLineWidth(0.4);
      doc.line(M, y + h, W - M, y + h);
      y += h;
    });
    y += 14;
  };

  // ── Page 01 — masthead, key, why ─────────────────────────────────────────
  newPage();
  doc.setFillColor(...RED);
  doc.rect(M, y, 12, 12, "F");
  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...INK);
  doc.text("CORPVIDESH AI — READY LIST", M + 20, y + 11);
  y += 22;
  doc.setDrawColor(...RED).setLineWidth(1.4);
  doc.line(M, y, W - M, y);
  y += 8;
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GREY);
  doc.text(
    "The executable matrix for an outbound financial commitment from India through GIFT IFSC — one task per row, one desk per task.",
    M,
    y + 9,
  );
  y += 24;

  table(
    [
      { label: "Field", w: 26, bold: true },
      { label: "Value", w: 74 },
    ],
    [
      ["Desk role", role],
      ["Task matrices in this dossier", String(blocks.length)],
      ["Tasks listed", String(blocks.reduce((s, b) => s + b.tasks.length, 0))],
      ["Mechanism layer expanded at export", openLayer ? layerName(openLayer) : "None expanded"],
      ["Exported", stampUTC(Date.now())],
    ],
    8.5,
  );

  bandTitle("Section 01", "Why this ready list is required");
  caption(
    "Read this page first. It states the control purpose of the matrix that follows, in plain words, for a reader who is neither a lawyer nor an engineer.",
  );
  table(
    [
      { label: "Control purpose", w: 24, bold: true },
      { label: "Why it is required", w: 76 },
    ],
    WHY.map(([k, v]) => [k, v]),
    8.2,
  );

  // ── Task matrices ────────────────────────────────────────────────────────
  blocks.forEach((b, bi) => {
    bandTitle(`Section 0${2 + bi}`, b.title);
    caption(b.caption);
    table(
      [
        { label: "#", w: 4, red: true, bold: true },
        { label: "Task", w: 20, bold: true },
        { label: "In plain words", w: 21 },
        { label: "Who executes it", w: 12 },
        { label: "Statutory basis / evidence", w: 17 },
        { label: "Technology layer", w: 10 },
        { label: "State", w: 7, bold: true, red: true },
        { label: "Desk", w: 9 },
      ],
      b.tasks.map((t) => [
        String(t.seq).padStart(2, "0"),
        `${t.title}\n${t.detail}`,
        t.plain,
        t.owner,
        t.basis,
        ENGINE_META[t.engine].label,
        STATE_LABEL[t.state].toUpperCase(),
        t.deskLabel,
      ]),
    );
  });

  // ── Ownership matrix ─────────────────────────────────────────────────────
  bandTitle(`Section 0${2 + blocks.length}`, "Desk ownership matrix");
  caption(
    "Anti-duplication contract. Each surface of the platform owns one function and is deliberately barred from the others: the treasury never signs an approval, the regulator never uploads a document, the bank never decides the route.",
  );
  table(
    [
      { label: "Desk", w: 18, bold: true },
      { label: "Owns", w: 44 },
      { label: "Deliberately not here", w: 38 },
    ],
    ownership.map((o) => [o.desk, o.owns, o.notHere]),
    8.2,
  );

  // ── Mechanism matrix ─────────────────────────────────────────────────────
  bandTitle(`Section 0${3 + blocks.length}`, "Mechanism matrix — state at export");
  caption(
    "Seven layers carry a filing from identity to continuing compliance. The four control axes state, for each layer, how deterministic it is, whether a model touches it, whether a regulator can see into it, and whether it produces a cryptographic proof.",
  );
  table(
    [
      { label: "Layer", w: 18, bold: true },
      { label: "What the layer does", w: 20 },
      ...AXES.map((a) => ({ label: a, w: 8 })),
      { label: "Technology chosen", w: 15 },
      { label: "Automated", w: 7, red: true, bold: true },
      { label: "Manual", w: 8 },
    ],
    LAYERS.map((l) => [
      `${l.n} · ${l.name}${l.id === openLayer ? " (expanded on screen)" : ""}`,
      l.role,
      ...gridFor(l.id).map((v) => scaleLabel(v)),
      l.tech,
      l.latency,
      l.manual,
    ]),
  );

  const open = LAYERS.find((l) => l.id === openLayer);
  bandTitle(`Section 0${4 + blocks.length}`, open ? `Expanded layer — ${open.n} ${open.name}` : "Expanded layer — none");
  if (open) {
    caption(
      "The layer the operator had open on screen when this dossier was generated, decomposed into what enters it, what it does, what leaves it, and why the technology was chosen over the alternatives.",
    );
    table(
      [
        { label: "Dimension", w: 20, bold: true },
        { label: "Position", w: 80 },
      ],
      [
        ["Enters the layer", open.input],
        ["What the layer does", open.action],
        ["Leaves the layer", open.output],
        ["Technology chosen", open.tech],
        ["Why this technology", open.why],
        ["Ownership", open.owner],
        ["Failure position", open.failsafe],
        ["Timing", `${open.latency} automated · ${open.manual} manual`],
        ["In plain words", open.plain],
      ],
      8.4,
    );
  } else {
    caption(
      "No mechanism layer was expanded when this dossier was generated. Open a layer on the Mechanism Matrix and export again to attach its full decomposition here.",
    );
  }

  footer();
  doc.save(opts.filename ?? `corpvidesh-ready-list-${role.toLowerCase()}.pdf`);
}

function layerName(id: string) {
  const l = LAYERS.find((x) => x.id === id);
  return l ? `${l.n} · ${l.name}` : id;
}
