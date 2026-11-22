import type { LearningSummary } from "./training";
/** Shared (client-safe) types for the multi-agent statutory graph. */

export type AgentNode =
  | "coordinator"
  | "retriever"
  | "grader"
  | "rewriter"
  | "external_lookup"
  | "drafter"
  | "qa"
  | "finalise";

export type TraceSpan = {
  id: string;
  node: AgentNode;
  agent: string;
  status: "ok" | "corrective" | "failed";
  startedAt: number;
  latencyMs: number;
  model: string | null;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  summary: string;
  detail: string;
};

export type RetrievedChunk = {
  id: string;
  title: string;
  source: string;
  text: string;
  score: number;
  origin: "enterprise" | "external";
};

export type DraftPacket = {
  determination: string;
  route: string;
  statutory_basis: string[];
  forms: string[];
  documents: string[];
  checks: { check: string; regulator: string }[];
  narrative: string;
};

export type AgentRunResult = {
  runId: string;
  question: string;
  answer: string;
  draft: DraftPacket | null;
  qaVerdict: { pass: boolean; issues: string[]; confidence: number } | null;
  retrieval: { grade: string; rewrites: number; usedExternal: boolean; chunks: RetrievedChunk[] };
  spans: TraceSpan[];
  totals: { latencyMs: number; promptTokens: number; completionTokens: number; costUsd: number };
  tracing: { provider: "langsmith" | "local"; project: string; enabled: boolean };
  /** Set by the agent mesh: how many reviewer-endorsed examples shaped this run. */
  learning?: LearningSummary;
};

export const AGENT_LABEL: Record<AgentNode, string> = {
  coordinator: "Graph Coordinator",
  retriever: "Data Retriever Agent",
  grader: "Retrieval Grader (CRAG)",
  rewriter: "Query Rewriter Agent",
  external_lookup: "Expanded Corpus Agent",
  drafter: "Coding / Filing Agent",
  qa: "Quality Assurance Agent",
  finalise: "Response Composer",
};
