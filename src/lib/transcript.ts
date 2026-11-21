// Exportable transcript of the step-by-step voice narration for either route,
// in any of the offered narration languages, with per-step and cumulative timings.
import { ROUTE_STEPS, fmtClock, narrationFor, stepsFor, totalSeconds, type RouteKey } from "@/lib/routes-detail";

export type TranscriptRow = {
  index: number;
  title: string;
  seconds: number;
  cumulative: string;
  actor: string;
  basis: string;
  script: string;
};

export function buildTranscript(route: RouteKey): TranscriptRow[] {
  const steps = stepsFor(route);
  let run = 0;
  return steps.map((s, i) => {
    run += s.seconds[route];
    return {
      index: i + 1,
      title: s.title,
      seconds: s.seconds[route],
      cumulative: fmtClock(run),
      actor: s.actor,
      basis: s.basis,
      script: narrationFor(route, s, i, steps.length),
    };
  });
}

/** Ask the server to render the scripts in the chosen narration language. */
export async function translateRows(rows: TranscriptRow[], language: string): Promise<TranscriptRow[]> {
  if (language.toLowerCase().startsWith("english")) return rows;
  const res = await fetch("/api/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, lines: rows.map((r) => r.script) }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  const data = (await res.json()) as { lines?: string[] };
  return rows.map((r, i) => ({ ...r, script: data.lines?.[i] ?? r.script }));
}

function header(route: RouteKey, language: string) {
  return [
    "CORPVIDESH AI — VOICE NARRATION TRANSCRIPT",
    `${route} route · ${language}`,
    `Rail total ${fmtClock(totalSeconds(route))} · ${stepsFor(route).length} steps of ${ROUTE_STEPS.length} defined`,
    `Generated ${new Date().toISOString()}`,
  ];
}

export function transcriptText(route: RouteKey, language: string, rows: TranscriptRow[]) {
  const out = [...header(route, language), ""];
  for (const r of rows) {
    out.push(
      `${String(r.index).padStart(2, "0")}. ${r.title}`,
      `    Actor: ${r.actor} · Step time: ${r.seconds}s · Elapsed: ${r.cumulative}`,
      `    Statutory basis: ${r.basis}`,
      `    Script: ${r.script}`,
      "",
    );
  }
  return out.join("\n");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function fileStem(route: RouteKey, language: string) {
  return `corpvidesh-narration-${route.toLowerCase()}-${language.replace(/[^\w]+/g, "-").toLowerCase()}`;
}

export function downloadTranscriptText(route: RouteKey, language: string, rows: TranscriptRow[]) {
  download(
    new Blob([transcriptText(route, language, rows)], { type: "text/plain;charset=utf-8" }),
    `${fileStem(route, language)}.txt`,
  );
}

export async function downloadTranscriptDocx(route: RouteKey, language: string, rows: TranscriptRow[]) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");
  const head = header(route, language);
  const children = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: head[0]!, bold: true, size: 30, color: "D81E05", font: "Arial" })],
    }),
    ...head.slice(1).map(
      (l) => new Paragraph({ children: [new TextRun({ text: l, size: 20, color: "444444", font: "Arial" })] }),
    ),
    new Paragraph({ children: [new TextRun({ text: "", size: 20 })] }),
  ];
  for (const r of rows) {
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 60 },
        children: [
          new TextRun({ text: `${String(r.index).padStart(2, "0")}. ${r.title}`, bold: true, size: 24, font: "Arial" }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Actor: ${r.actor}  |  Step time: ${r.seconds}s  |  Elapsed: ${r.cumulative}`,
            size: 20,
            color: "D81E05",
            font: "Arial",
          }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: `Statutory basis: ${r.basis}`, size: 20, italics: true, font: "Arial" })],
      }),
      new Paragraph({ children: [new TextRun({ text: r.script, size: 22, font: "Arial" })] }),
    );
  }
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [
      {
        properties: {
          page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } },
        },
        children,
      },
    ],
  });
  download(await Packer.toBlob(doc), `${fileStem(route, language)}.docx`);
}

/* ---------- machine-readable exports ---------- */

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transcriptCsv(route: RouteKey, language: string, rows: TranscriptRow[]) {
  const head = ["route", "language", "step_index", "step_title", "actor", "statutory_basis", "step_seconds", "cumulative_rail_time", "script"];
  const body = rows.map((r) =>
    [route, language, r.index, r.title, r.actor, r.basis, r.seconds, r.cumulative, r.script].map(csvCell).join(","),
  );
  return [head.join(","), ...body].join("\n");
}

export function transcriptJson(route: RouteKey, language: string, rows: TranscriptRow[]) {
  return JSON.stringify(
    {
      route,
      language,
      generatedAt: new Date().toISOString(),
      railTotalSeconds: totalSeconds(route),
      railTotal: fmtClock(totalSeconds(route)),
      steps: rows.map((r) => ({
        index: r.index,
        title: r.title,
        actor: r.actor,
        statutoryBasis: r.basis,
        seconds: r.seconds,
        cumulative: r.cumulative,
        script: r.script,
      })),
    },
    null,
    2,
  );
}

export function downloadTranscriptCsv(route: RouteKey, language: string, rows: TranscriptRow[]) {
  download(
    new Blob(["\uFEFF" + transcriptCsv(route, language, rows)], { type: "text/csv;charset=utf-8" }),
    `${fileStem(route, language)}.csv`,
  );
}

export function downloadTranscriptJson(route: RouteKey, language: string, rows: TranscriptRow[]) {
  download(
    new Blob([transcriptJson(route, language, rows)], { type: "application/json;charset=utf-8" }),
    `${fileStem(route, language)}.json`,
  );
}
