/**
 * LangGraph Platform (LangGraph Cloud) deployment surface + graph test suite.
 *
 * The graph is not a notebook experiment: it is declared in `langgraph.json`,
 * built by a factory the managed runtime imports, exposed as named assistants,
 * scaled by the platform's task queue, and regression-tested by the suite
 * below. Every case asserts on the structured filing packet the graph returns,
 * not on prose, so a failing case is a real behavioural regression.
 */

import type { AgentRunResult } from "@/lib/agents/types";

export type Assistant = {
  id: string;
  name: string;
  purpose: string;
  graph: string;
  /** Managed-runtime configuration surfaced on the deployment card. */
  config: string;
};

export const DEPLOYMENT = {
  graphId: "statutory",
  configFile: "langgraph.json",
  factory: "src/lib/agents/platform-graph.server.ts:makeDeployedGraph",
  runtime: "Application-hosted LangGraph via server functions: the agent mesh (all four AI agents) and its statutory subgraph, both declared in langgraph.json. Managed LangGraph deployment is not connected.",
  persistence: "Verified users: private append-only run outcomes in Lovable Cloud. Node-resume checkpoints are not configured.",
  scaling:
    "Request-driven application runtime; no managed graph queue or background resume is provisioned.",
  observability: "Per-run spans in the desk and private run history; LangSmith mirroring requires a configured credential.",
} as const;

export const ASSISTANTS: Assistant[] = [
  {
    id: "asst_statutory_full",
    name: "Statutory determination",
    purpose: "Full run: coordinate, retrieve, grade, draft the filing packet, quality-check every citation.",
    graph: "statutory",
    config: "recursion_limit 24 · streaming on · corrective retries 2",
  },
  {
    id: "asst_retrieval_only",
    name: "Corrective retrieval probe",
    purpose: "Retriever + grader + rewriter only — used to test the corpus without spending draft tokens.",
    graph: "statutory",
    config: "interrupt_after ['grader'] · streaming on",
  },
  {
    id: "asst_qa_gate",
    name: "Filing QA gate",
    purpose: "Re-runs the quality agent against an existing draft before a filing leaves the desk.",
    graph: "statutory",
    config: "entry ['qa'] · deterministic temperature 0",
  },
];

/* ------------------------------------------------------------------ *
 * Regression suite executed against the deployed graph.
 * ------------------------------------------------------------------ */

export type EvalCase = {
  id: string;
  name: string;
  question: string;
  context: string;
  /** Substrings the determination or route must contain (case-insensitive, any-of per group). */
  expectRoute: string[][];
  /** Forms that must appear in the packet. */
  expectForms: string[];
  /** Statutory anchors that must be cited. */
  expectCitations: string[];
  /** Maximum acceptable end-to-end latency, ms. */
  budgetMs: number;
};

export const EVAL_SUITE: EvalCase[] = [
  {
    id: "eval-195-saas",
    name: "Foreign SaaS subscription — royalty vs FTS",
    question:
      "An Indian listed company pays USD 240,000 a year for a US-based AI SaaS subscription with no human intervention. Is this chargeable as Royalty or FTS under section 195, and what must be filed?",
    context: "Vendor is US tax resident; TRC on file, Form 10F pending.",
    expectRoute: [["195", "withholding", "chargeab"]],
    expectForms: ["15CA", "15CB"],
    expectCitations: ["195", "37BB"],
    budgetMs: 45_000,
  },
  {
    id: "eval-odi-headroom",
    name: "ODI headroom under Rule 7",
    question:
      "A listed manufacturer with audited net worth of ₹4,200 crore wants to infuse ₹475 crore of equity into its wholly-owned Singapore subsidiary. Which route applies and what is the financial commitment headroom?",
    context: "No prior overseas commitment; UIN already allotted.",
    expectRoute: [["automatic"]],
    expectForms: ["FC"],
    expectCitations: ["7", "2022"],
    budgetMs: 45_000,
  },
  {
    id: "eval-opi-cap",
    name: "OPI 50% cap on a listed-entity purchase",
    question:
      "Can an Indian company make an overseas portfolio investment of ₹900 crore in listed foreign equity when its net worth is ₹1,500 crore?",
    context: "No existing OPI on the books.",
    expectRoute: [["opi", "50"]],
    expectForms: ["OPI"],
    expectCitations: ["2022"],
    budgetMs: 45_000,
  },
  {
    id: "eval-trc-missing",
    name: "Missing TRC on a treaty claim",
    question:
      "A non-resident vendor claims a 10% treaty rate but has not furnished a Tax Residency Certificate. What withholding position should the remitter take and what documents are required?",
    context: "Form 10F not filed; no PAN with the vendor.",
    expectRoute: [["trc", "residency", "90(4)"]],
    expectForms: ["10F"],
    expectCitations: ["90", "195"],
    budgetMs: 45_000,
  },
];

export type EvalOutcome = {
  case: EvalCase;
  pass: boolean;
  checks: { label: string; pass: boolean; detail: string }[];
  latencyMs: number;
  costUsd: number;
  tokens: number;
  qaPass: boolean;
  rewrites: number;
  error?: string;
};

function has(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

/** Score one deployed-graph run against its case assertions. */
export function scoreCase(c: EvalCase, r: AgentRunResult): EvalOutcome {
  const draft = r.draft;
  const routeText = `${draft?.route ?? ""} ${draft?.determination ?? ""} ${r.answer}`;
  const formsText = (draft?.forms ?? []).join(" | ");
  const citeText = (draft?.statutory_basis ?? []).join(" | ");

  const checks = [
    ...c.expectRoute.map((group) => ({
      label: `Route mentions ${group.join(" / ")}`,
      pass: group.some((g) => has(routeText, g)),
      detail: draft?.route || "no route returned",
    })),
    ...c.expectForms.map((f) => ({
      label: `Form ${f} in packet`,
      pass: has(formsText, f),
      detail: formsText || "no forms returned",
    })),
    ...c.expectCitations.map((s) => ({
      label: `Cites ${s}`,
      pass: has(citeText, s),
      detail: citeText || "no citations returned",
    })),
    {
      label: "Quality gate passed",
      pass: Boolean(r.qaVerdict?.pass),
      detail: r.qaVerdict?.issues?.join("; ") || "clean",
    },
    {
      label: `Latency under ${Math.round(c.budgetMs / 1000)} s`,
      pass: r.totals.latencyMs <= c.budgetMs,
      detail: `${(r.totals.latencyMs / 1000).toFixed(1)} s`,
    },
  ];

  return {
    case: c,
    pass: checks.every((k) => k.pass),
    checks,
    latencyMs: r.totals.latencyMs,
    costUsd: r.totals.costUsd,
    tokens: r.totals.promptTokens + r.totals.completionTokens,
    qaPass: Boolean(r.qaVerdict?.pass),
    rewrites: r.retrieval.rewrites,
  };
}

export function suiteToCsv(rows: EvalOutcome[]): string {
  const head = [
    "case_id", "case_name", "pass", "checks_passed", "checks_total",
    "latency_ms", "tokens", "cost_usd", "qa_pass", "corrective_rewrites", "error",
  ].join(",");
  const body = rows.map((r) =>
    [
      r.case.id, `"${r.case.name}"`, r.pass, r.checks.filter((c) => c.pass).length,
      r.checks.length, r.latencyMs, r.tokens, r.costUsd.toFixed(6),
      r.qaPass, r.rewrites, `"${r.error ?? ""}"`,
    ].join(","),
  );
  return [head, ...body].join("\n");
}
