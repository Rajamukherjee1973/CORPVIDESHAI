// Named, reloadable simulation runs for the case file desk.
// Stored in the browser so a treasurer can keep a shelf of "what if" datasets
// and put any of them back on the clock later.

import type { CaseInput } from "@/lib/casefile";

export type SavedRun = {
  id: string;
  name: string;
  note: string;
  savedAt: string;
  input: CaseInput;
};

const KEY = "cv.casefile.runs.v1";

function read(): SavedRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedRun[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(runs: SavedRun[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(runs));
  window.dispatchEvent(new CustomEvent("cv:runs"));
}

export function listRuns(): SavedRun[] {
  return read().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveRun(name: string, note: string, input: CaseInput): SavedRun {
  const runs = read();
  const clean = name.trim() || `Run ${runs.length + 1}`;
  const existing = runs.find((r) => r.name.toLowerCase() === clean.toLowerCase());
  const run: SavedRun = {
    id: existing?.id ?? `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: clean,
    note: note.trim(),
    savedAt: new Date().toISOString(),
    input,
  };
  write([run, ...runs.filter((r) => r.id !== run.id)]);
  return run;
}

export function deleteRun(id: string) {
  write(read().filter((r) => r.id !== id));
}

export function renameRun(id: string, name: string) {
  write(read().map((r) => (r.id === id ? { ...r, name: name.trim() || r.name } : r)));
}

export function exportRuns(): string {
  return JSON.stringify(listRuns(), null, 2);
}

/** Merge an exported shelf back in; returns how many rows were accepted. */
export function importRuns(json: string): number {
  const parsed = JSON.parse(json) as SavedRun[];
  if (!Array.isArray(parsed)) throw new Error("Expected a list of saved runs");
  const valid = parsed.filter((r) => r && r.input && typeof r.input.proposed === "number");
  const byId = new Map(read().map((r) => [r.id, r]));
  for (const r of valid) byId.set(r.id, r);
  write([...byId.values()]);
  return valid.length;
}
