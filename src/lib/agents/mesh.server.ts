/**
 * CorpVidesh AI — the agent mesh: one LangGraph StateGraph that every AI agent runs through.
 *
 *   START → recall → dispatch ─┬→ statutory (compiled statutory subgraph: retrieve · grade · rewrite · draft · QA)
 *                              ├→ copilot   (LangChain structured call)
 *                              ├→ document  (LangChain structured call, vision)
 *                              └→ currency  (LangChain structured call, provider FX)
 *                                     ↓
 *                                   learn → END
 *
 * NOTE: recall is the only place memory and reviewer-endorsed examples are assembled,
 * and dispatch is deterministic (the caller names the agent), so no two agents answer
 * the same request and no LLM router can send work to the wrong specialist.
 */
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  CURATED_EXAMPLES, formatExamples, learningSummary, selectExamples,
  type ClientExample, type LearningSummary, type ReviewedExample, type TrainableAgent,
} from "./training";
import type { AgentRunResult } from "./types";
import type { CopilotAnswer, DocExtract } from "@/lib/frontier.server";

type Viewer = { userId: string; client: SupabaseClient<Database> } | null;

export type MeshInput =
  | { agent: "statutory"; question: string; context: string }
  | { agent: "copilot"; question: string; context: string }
  | { agent: "document"; text: string; image?: string }
  | { agent: "currency"; code: string; budgetCr: number; months: number };

type CurrencyResult = Awaited<ReturnType<typeof import("@/lib/currency-outlook.server").generateCurrencyOutlook>>;
export type MeshOutput = { statutory: AgentRunResult; copilot: CopilotAnswer; document: DocExtract; currency: CurrencyResult };

/** The question used to find similar reviewed examples — the same text the rating UI stores. */
export function meshQuestion(input: MeshInput): string {
  switch (input.agent) {
    case "statutory":
    case "copilot": return input.question;
    case "document": return input.text.slice(0, 400) || "Uploaded document image";
    case "currency": return `${input.code} / INR · ${input.budgetCr} crore · ${input.months} months`;
  }
}

async function accountExamples(viewer: Viewer, agent: TrainableAgent): Promise<ReviewedExample[]> {
  if (!viewer) return [];
  const { data, error } = await viewer.client.from("agent_feedback")
    .select("agent,rating,question,answer,correction,created_at")
    .eq("user_id", viewer.userId).eq("agent", agent)
    .order("created_at", { ascending: false }).limit(100);
  if (error) return []; // learning is additive; a read failure must not block the answer
  return (data ?? []).map((r) => ({
    agent, rating: r.rating === 1 ? 1 : -1, question: r.question, answer: r.answer,
    correction: r.correction, at: r.created_at, origin: "account" as const,
  }));
}

const MeshState = Annotation.Root({
  input: Annotation<MeshInput>(),
  memory: Annotation<string>(),
  examples: Annotation<ReviewedExample[]>({ reducer: (_, b) => b, default: () => [] }),
  output: Annotation<unknown>({ reducer: (_, b) => b, default: () => null }),
  path: Annotation<string[]>({ reducer: (a, b) => [...a, ...b], default: () => [] }),
});
type State = typeof MeshState.State;

/** Builds the mesh for one request. The viewer and guest examples stay in the closure, never in model-visible state. */
export function buildMesh(viewer: Viewer = null, guestExamples: ClientExample[] = []) {
  const recall = async (s: State) => {
    const agent = s.input.agent;
    const reviewed = viewer
      ? await accountExamples(viewer, agent)
      : guestExamples.map((g) => ({ agent, rating: 1 as const, question: g.question, answer: g.answer, correction: "", at: "", origin: "browser" as const }));
    const examples = selectExamples(agent, meshQuestion(s.input), [...reviewed, ...CURATED_EXAMPLES]);
    return { examples, path: ["recall"] };
  };

  const fewShot = (s: State) => formatExamples(s.examples);
  const withMemory = (memory: string, context: string) => [memory, context].filter(Boolean).join("\n");

  const statutory = async (s: State) => {
    if (s.input.agent !== "statutory") throw new Error("Mesh dispatch mismatch.");
    const { runAgentGraph } = await import("./graph.server");
    const output = await runAgentGraph({ question: s.input.question, context: withMemory(s.memory, s.input.context).slice(0, 3800), examples: fewShot(s) });
    return { output, path: ["statutory"] };
  };
  const copilot = async (s: State) => {
    if (s.input.agent !== "copilot") throw new Error("Mesh dispatch mismatch.");
    const { askCopilot } = await import("@/lib/frontier.server");
    return { output: await askCopilot(s.input.question, withMemory(s.memory, s.input.context), fewShot(s)), path: ["copilot"] };
  };
  const document = async (s: State) => {
    if (s.input.agent !== "document") throw new Error("Mesh dispatch mismatch.");
    const { readDocument } = await import("@/lib/frontier.server");
    return { output: await readDocument(s.input.text, s.input.image, fewShot(s)), path: ["document"] };
  };
  const currency = async (s: State) => {
    if (s.input.agent !== "currency") throw new Error("Mesh dispatch mismatch.");
    const { generateCurrencyOutlook } = await import("@/lib/currency-outlook.server");
    const { code, budgetCr, months } = s.input;
    return { output: await generateCurrencyOutlook({ code, budgetCr, months }, fewShot(s)), path: ["currency"] };
  };
  const learn = async () => ({ path: ["learn"] });

  return new StateGraph(MeshState)
    .addNode("recall", recall)
    .addNode("statutory", statutory)
    .addNode("copilot", copilot)
    .addNode("document", document)
    .addNode("currency", currency)
    .addNode("learn", learn)
    .addEdge(START, "recall")
    .addConditionalEdges("recall", (s: State) => s.input.agent, {
      statutory: "statutory", copilot: "copilot", document: "document", currency: "currency",
    })
    .addEdge("statutory", "learn")
    .addEdge("copilot", "learn")
    .addEdge("document", "learn")
    .addEdge("currency", "learn")
    .addEdge("learn", END)
    .compile();
}

/** Runs one agent through the mesh and reports which reviewed examples shaped the answer. */
export async function runMesh<I extends MeshInput>(
  input: I, memory: string, viewer: Viewer, guestExamples: ClientExample[] = [],
): Promise<{ output: MeshOutput[I["agent"]]; learning: LearningSummary }> {
  const final = (await buildMesh(viewer, guestExamples).invoke(
    { input, memory },
    { recursionLimit: 12, runName: `corpvidesh-mesh-${input.agent}`, tags: ["corpvidesh-mesh", input.agent] },
  )) as State;
  if (final.output === null) throw new Error("The agent mesh finished without an answer.");
  return { output: final.output as MeshOutput[I["agent"]], learning: learningSummary(final.examples, final.path) };
}

/** Managed LangGraph entry (langgraph.json → "mesh"): guests only, no account examples outside a request. */
export function makeMeshGraph() {
  return buildMesh(null, []);
}
