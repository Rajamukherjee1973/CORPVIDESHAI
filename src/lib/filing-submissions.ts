import { useEffect, useState } from "react";
import { z } from "zod";
import type { Session } from "@/lib/session";

const STORE = "corpvidesh.form-fc.simulations.v1";
const EVENT = "corpvidesh:form-fc";
const PROFILE = "corpvidesh.filing-officer.v1";
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
}, "Enter a valid filing date.");
export const officerSchema = z.object({ officer: z.string().trim().min(1).max(100), authority: z.string().trim().min(1).max(100) });
export const submissionSchema = officerSchema.extend({
  company: z.string().trim().min(1).max(500),
  period: z.string().regex(/^[A-Za-z]+ \d{4}$/),
  filedOn: dateSchema,
});
export type OfficerProfile = z.infer<typeof officerSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
const recordSchema = submissionSchema.extend({ id: z.string(), recordedAt: z.string(), simulation: z.literal(true) });
export type FilingSubmission = z.infer<typeof recordSchema>;

export function createSubmission(input: SubmissionInput, session: Session | null, now = new Date()): FilingSubmission {
  if (session?.role !== "regulator") throw new Error("Choose a regulator demonstration desk before recording a filing.");
  const clean = submissionSchema.parse(input);
  if (clean.filedOn > now.toISOString().slice(0, 10)) throw new Error("Filing date cannot be in the future.");
  return { ...clean, id: crypto.randomUUID(), recordedAt: now.toISOString(), simulation: true };
}

export function latestSubmission(records: FilingSubmission[], company: string, period: string) {
  return [...records].reverse().find((r) => r.company === company && r.period === period);
}

function readRecords(): FilingSubmission[] {
  try {
    const parsed = z.array(recordSchema).safeParse(JSON.parse(localStorage.getItem(STORE) ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch { return []; }
}

export function loadOfficer(): OfficerProfile | null {
  try {
    const parsed = officerSchema.safeParse(JSON.parse(localStorage.getItem(PROFILE) ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

export function useFilingSubmissions() {
  const [records, setRecords] = useState<FilingSubmission[]>([]);
  useEffect(() => {
    const sync = () => setRecords(readRecords());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  function save(input: SubmissionInput, session: Session | null) {
    const record = createSubmission(input, session);
    const next = [...readRecords(), record];
    // Fail visibly if storage is unavailable; never claim a record was saved.
    localStorage.setItem(STORE, JSON.stringify(next));
    localStorage.setItem(PROFILE, JSON.stringify({ officer: record.officer, authority: record.authority }));
    setRecords(next);
    window.dispatchEvent(new Event(EVENT));
    return record;
  }
  return { records, save };
}