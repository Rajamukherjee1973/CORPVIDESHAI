import { evaluateLegalCase } from "./legal-policy";
import type { LegalCase, LegalAssessment } from "./contracts";

export async function assessLegalRoute(input: LegalCase): Promise<LegalAssessment> {
  return { ...evaluateLegalCase(input), traceId: crypto.randomUUID(), assessedAt: new Date().toISOString() };
}