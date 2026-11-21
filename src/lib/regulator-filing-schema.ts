import { z } from "zod";
export const secureFilingSchema = z.object({
  company: z.string().trim().min(1).max(500),
  period: z.string().regex(/^[A-Za-z]+ \d{4}$/),
  filedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => { const d = new Date(`${s}T00:00:00Z`); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s; }),
  officer: z.string().trim().min(1).max(100),
  authority: z.string().trim().min(1).max(100),
});
export function validateSecureFiling(input: unknown, today = new Date().toISOString().slice(0, 10)) {
  const clean = secureFilingSchema.parse(input);
  if (clean.filedOn > today) throw new Error("Filing date cannot be in the future.");
  return clean;
}