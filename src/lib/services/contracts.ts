import { z } from "zod";

export const legalCaseSchema = z.object({
  investment: z.enum(["ODI", "OPI"]),
  investor: z.enum(["listed", "unlisted"]),
  netWorthCr: z.number().positive().max(10000000),
  existingExposureCr: z.number().nonnegative().max(10000000),
  proposedCr: z.number().positive().max(10000000),
  activity: z.enum(["operating", "real-estate", "gambling", "inr-linked", "financial-services"]),
  denomination: z.enum(["INR", "foreign"]),
  nocRequired: z.boolean(),
  nocAvailable: z.boolean(),
  evidenceComplete: z.boolean(),
});
export type LegalCase = z.infer<typeof legalCaseSchema>;
export type LegalFinding = { code: string; status: "review" | "hold" | "approval"; title: string; reasoning: string; sourceIds: string[] };
export type LegalAssessment = {
  version: "legal-route.v1";
  traceId: string;
  assessedAt: string;
  route: "AD-bank review" | "Prior approval review" | "Hold / specialist review";
  ceilingCr: number;
  totalExposureCr: number;
  headroomCr: number;
  findings: LegalFinding[];
  evidence: string[];
  nextAction: string;
  authority: "Advisory only — no official authorization";
};

export const SERVICE_CATALOG = [
  { id: "legal", name: "Legal interpretation", contract: "legal-route.v1", boundary: "Validated facts → cited checks → human review", runtime: "Server assessment + statutory graph", test: "src/tests/legal-service.test.ts", scale: "Stateless evaluation; versioned legal releases" },
  { id: "filings", name: "Corporate filings", contract: "form-fc.v1", boundary: "Verified account → company membership → append-only record", runtime: "Authenticated server functions + Cloud RLS", test: "src/tests/corporate-access.test.ts src/tests/filing-submissions.test.ts", scale: "Indexed company reads; managed storage" },
  { id: "market", name: "Market evidence", contract: "market-evidence.v1", boundary: "Provider adapter → timestamp → provenance → unavailable state", runtime: "Shared FX / market / observed-history functions", test: "src/tests/fx.test.ts", scale: "Shared provider cache; no fabricated evidence" },
  { id: "agents", name: "Agent orchestration", contract: "agent-outcome.v1", boundary: "Verified viewer → bounded memory → QA → private outcome", runtime: "App-hosted graph + read-only tools", test: "src/tests/agent-integration.test.ts src/tests/currency-outlook.test.ts", scale: "Request-scoped execution; durable private outcomes" },
] as const;