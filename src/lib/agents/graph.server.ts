/**
 * CorpVidesh AI — multi-agent statutory graph.
 *
 * LangGraph StateGraph coordinates specialised agents; every node is an LCEL
 * chain (prompt | model) consumed as a stream, so long generations never stall
 * behind a buffered request. Corrective RAG: the grader scores enterprise
 * retrieval, the coordinator rewrites the query or escalates to an external
 * statutory lookup instead of letting the drafter hallucinate.
 */
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AIMessageChunk, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { type CorpusDoc, CORPUS } from "./corpus";
import { semanticRetrieve } from "./rag.server";
import { validateQa } from "./execution";
import { getRequest } from "@tanstack/react-start/server";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "@/lib/prediction-agent/run-id.server";
import type {
  AgentNode,
  AgentRunResult,
  DraftPacket,
  RetrievedChunk,
  TraceSpan,
} from "./types";
import { AGENT_LABEL } from "./types";

const MODEL_ID = "google/gemini-3.7-flash";
const PRICE_IN = 0.075 / 1_000_000;
const PRICE_OUT = 0.3 / 1_000_000;

function makeModel(key: string) {
  const correlation = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(getRequest()));
  return new ChatOpenAI({
    model: MODEL_ID,
    apiKey: key,
    temperature: 0.1,
    maxRetries: 0,
    streamUsage: true,
    configuration: {
      baseURL: "https://ai.gateway.lovable.dev/v1",
      defaultHeaders: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "langchain" },
      fetch: correlation.fetch,
    },
  });
}

type Usage = { prompt: number; completion: number };

/** Run an LCEL chain as a stream and fold the chunks back into text + usage. */
async function runChain(
  model: ChatOpenAI,
  system: string,
  human: string,
  vars: Record<string, unknown>,
): Promise<{ text: string; usage: Usage }> {
  const chain = ChatPromptTemplate.fromMessages([
    new SystemMessage(system),
    ["human", human],
  ]).pipe(model);

  const stream = await chain.stream(vars);
  let acc: AIMessageChunk | null = null;
  for await (const chunk of stream) acc = acc ? acc.concat(chunk) : chunk;

  const text = typeof acc?.content === "string" ? acc.content : String(acc?.content ?? "");
  const u = acc?.usage_metadata as { input_tokens?: number; output_tokens?: number } | undefined;
  return {
    text: text.trim(),
    usage: { prompt: u?.input_tokens ?? 0, completion: u?.output_tokens ?? 0 },
  };
}

function parseJson<T>(raw: string): T | null {
  const fenced = raw.replace(/```json|```/g, "").trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(fenced.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** Broader statutory index used only when enterprise retrieval is graded poor. */
function externalLookup(query: string): RetrievedChunk[] {
  const q = query.toLowerCase();
  const pool: CorpusDoc[] = CORPUS;
  return pool
    .map((d) => ({
      d,
      s: d.tags.reduce((acc, t) => acc + (q.includes(t.slice(0, 4)) ? 1 : 0), 0) + 0.4,
    }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map(({ d, s }) => ({
      id: `ext-${d.id}`,
      title: d.title,
      source: `Local expanded corpus — ${d.source}`,
      text: d.text,
      score: Number(Math.min(1, s / 2).toFixed(2)),
      origin: "enterprise" as const,
    }));
}

const GraphState = Annotation.Root({
  question: Annotation<string>(),
  context: Annotation<string>(),
  query: Annotation<string>(),
  chunks: Annotation<RetrievedChunk[]>({ reducer: (_, b) => b, default: () => [] }),
  grade: Annotation<string>({ reducer: (_, b) => b, default: () => "unknown" }),
  gradeReason: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  rewrites: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  usedExternal: Annotation<boolean>({ reducer: (_, b) => b, default: () => false }),
  draft: Annotation<DraftPacket | null>({ reducer: (_, b) => b, default: () => null }),
  answer: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  verdict: Annotation<AgentRunResult["qaVerdict"]>({ reducer: (_, b) => b, default: () => null }),
  qaLoops: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  spans: Annotation<TraceSpan[]>({ reducer: (a, b) => [...a, ...b], default: () => [] }),
});

type State = typeof GraphState.State;

function span(
  node: AgentNode,
  startedAt: number,
  summary: string,
  usage: Usage | null,
  status: TraceSpan["status"] = "ok",
  detail?: string,
): TraceSpan {
  const promptTokens = usage?.prompt ?? 0;
  const completionTokens = usage?.completion ?? 0;
  return {
    id: `${node}-${startedAt}-${Math.random().toString(36).slice(2, 7)}`,
    node,
    agent: AGENT_LABEL[node],
    status,
    startedAt,
    latencyMs: Date.now() - startedAt,
    model: usage ? MODEL_ID : null,
    promptTokens,
    completionTokens,
    costUsd: Number((promptTokens * PRICE_IN + completionTokens * PRICE_OUT).toFixed(6)),
    summary,
    detail: detail ?? "",
  };
}

export function buildGraph(key: string) {
  const model = makeModel(key);

  const coordinator = async (s: State) => {
    const t = Date.now();
    return {
      query: s.query || s.question,
      spans: [
        span(
          "coordinator",
          t,
          `Plan issued: retrieve → grade → draft → QA. Context: ${s.context || "none"}`,
          null,
        ),
      ],
    };
  };

  const retriever = async (s: State) => {
    const t = Date.now();
    const retrieval = await semanticRetrieve(s.query, 4);
    const chunks = retrieval.chunks;
    return {
      chunks,
      spans: [
        span(
          "retriever",
          t,
          `${chunks.length} ${retrieval.mode} passages for "${s.query}"`,
          null,
          chunks.length ? "ok" : "corrective",
          chunks.map((c) => `${c.title} (${c.score})`).join(" · "),
        ),
      ],
    };
  };

  const grader = async (s: State) => {
    const t = Date.now();
    const ctx = s.chunks.map((c, i) => `[${i + 1}] ${c.title} — ${c.text}`).join("\n");
    const { text, usage } = await runChain(
      model,
      "You grade retrieved statutory passages for an Indian cross-border remittance compliance engine. Reply ONLY with JSON: {\"grade\":\"good|partial|poor\",\"reason\":\"one sentence\"}. Grade 'good' only if the passages fully answer the question.",
      "Question: {question}\n\nPassages:\n{ctx}",
      { question: s.question, ctx: ctx || "none" },
    );
    const parsed = parseJson<{ grade: string; reason: string }>(text);
    const grade = (parsed?.grade || (s.chunks.length ? "partial" : "poor")).toLowerCase();
    return {
      grade,
      gradeReason: parsed?.reason || text.slice(0, 180),
      spans: [
        span(
          "grader",
          t,
          `Retrieval graded ${grade.toUpperCase()} — ${parsed?.reason ?? "heuristic grade"}`,
          usage,
          grade === "good" ? "ok" : "corrective",
        ),
      ],
    };
  };

  const rewriter = async (s: State) => {
    const t = Date.now();
    const { text, usage } = await runChain(
      model,
      "Rewrite the user question into a dense keyword search query over Indian FEMA / Income-tax statutory text. Reply with the query only, no punctuation beyond spaces.",
      "Question: {question}\nPrevious query: {query}\nWhy it failed: {reason}",
      { question: s.question, query: s.query, reason: s.gradeReason || "low relevance" },
    );
    const query = ((text || s.query).split("\n")[0] ?? s.query).slice(0, 160);
    return {
      query,
      rewrites: s.rewrites + 1,
      spans: [span("rewriter", t, `Query rewritten to "${query}"`, usage, "corrective")],
    };
  };

  const external = async (s: State) => {
    const t = Date.now();
    const ext = externalLookup(s.query);
    return {
      usedExternal: false,
      chunks: [...s.chunks, ...ext],
      spans: [
        span(
          "external_lookup",
          t,
          `Expanded local corpus search — ${ext.length} passages merged; no external evidence fetched`,
          null,
          "corrective",
        ),
      ],
    };
  };

  const drafter = async (s: State) => {
    const t = Date.now();
    const ctx = s.chunks.map((c, i) => `[${i + 1}] ${c.source} — ${c.text}`).join("\n");
    const { text, usage } = await runChain(
      model,
      "You are the filing agent of an Indian outbound-remittance rail. Using ONLY the passages, produce JSON: {\"determination\":\"one line\",\"route\":\"automatic|approval|not-applicable\",\"statutory_basis\":[\"...\"],\"forms\":[\"...\"],\"documents\":[\"...\"],\"checks\":[{\"check\":\"...\",\"regulator\":\"RBI|IFSCA|MoF|FIU-IND|DPIIT|CBDT\"}],\"narrative\":\"3 sentences for a treasury officer\"}. Never invent a provision that is not in the passages.",
      "Question: {question}\nDeal context: {context}\n\nPassages:\n{ctx}\n\nQA feedback to fix (may be empty): {feedback}",
      {
        question: s.question,
        context: s.context || "none",
        ctx,
        feedback: s.verdict?.issues?.join("; ") || "",
      },
    );
    const raw = parseJson<Partial<DraftPacket>>(text);
    const draft: DraftPacket | null = raw
      ? {
          determination: String(raw.determination ?? "—"),
          route: String(raw.route ?? "not-applicable"),
          statutory_basis: (raw.statutory_basis ?? []).map(String),
          forms: (raw.forms ?? []).map(String),
          documents: (raw.documents ?? []).map(String),
          checks: (raw.checks ?? []).map((c) => ({
            check: String(c?.check ?? ""),
            regulator: String(c?.regulator ?? ""),
          })),
          narrative: String(raw.narrative ?? ""),
        }
      : null;
    return {
      draft,
      answer: draft?.narrative || text,
      spans: [
        span(
          "drafter",
          t,
          draft
            ? `Filing packet drafted — route ${draft.route}`
            : "Draft returned unparsed prose",
          usage,
          draft ? "ok" : "corrective",
        ),
      ],
    };
  };

  const qa = async (s: State) => {
    const t = Date.now();
    const { text, usage } = await runChain(
      model,
      "You are the quality assurance agent. Verify every statutory citation in the draft appears in the passages and that forms/documents are consistent with the route. Reply ONLY with JSON: {\"pass\":true|false,\"confidence\":0-1,\"issues\":[\"...\"]}.",
      "Draft:\n{draft}\n\nPassages:\n{ctx}",
      {
        draft: JSON.stringify(s.draft ?? s.answer),
        ctx: s.chunks.map((c) => `${c.source} — ${c.text}`).join("\n"),
      },
    );
    const parsed = parseJson<{ pass: boolean; confidence: number; issues: string[] }>(text);
    const verdict = validateQa(parsed, Boolean(s.draft));
    return {
      verdict,
      qaLoops: s.qaLoops + 1,
      spans: [
        span(
          "qa",
          t,
          verdict.pass
            ? `QA passed at ${(verdict.confidence * 100).toFixed(0)}% confidence`
            : `QA rejected — ${verdict.issues.slice(0, 2).join("; ")}`,
          usage,
          verdict.pass ? "ok" : "corrective",
        ),
      ],
    };
  };

  const finalise = async (s: State) => {
    const t = Date.now();
    return {
      spans: [
        span(
          "finalise",
          t,
          `Answer composed from ${s.chunks.length} passages, ${s.rewrites} rewrite(s), external ${s.usedExternal ? "used" : "not needed"}`,
          null,
        ),
      ],
    };
  };

  const graph = new StateGraph(GraphState)
    .addNode("coordinator", coordinator)
    .addNode("retriever", retriever)
    .addNode("grader", grader)
    .addNode("rewriter", rewriter)
    .addNode("external_lookup", external)
    .addNode("drafter", drafter)
    .addNode("qa", qa)
    .addNode("finalise", finalise)
    .addEdge(START, "coordinator")
    .addEdge("coordinator", "retriever")
    .addEdge("retriever", "grader")
    .addConditionalEdges(
      "grader",
      (s: State) => {
        if (s.grade === "good") return "drafter";
        if (s.rewrites < 1) return "rewriter";
        return s.usedExternal ? "drafter" : "external_lookup";
      },
      { drafter: "drafter", rewriter: "rewriter", external_lookup: "external_lookup" },
    )
    .addEdge("rewriter", "retriever")
    .addEdge("external_lookup", "drafter")
    .addEdge("drafter", "qa")
    .addConditionalEdges(
      "qa",
      (s: State) => (s.verdict?.pass || s.qaLoops >= 2 ? "finalise" : "drafter"),
      { finalise: "finalise", drafter: "drafter" },
    )
    .addEdge("finalise", END);

  return graph.compile();
}

export async function runAgentGraph(input: {
  question: string;
  context?: string;
}): Promise<AgentRunResult> {
  const key = process.env["LOVABLE_API_KEY"];
  const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const lsKey = process.env["LANGSMITH_API_KEY"] || process.env["LANGCHAIN_API_KEY"];
  const project = process.env["LANGSMITH_PROJECT"] || "corpvidesh-ai";

  if (lsKey) {
    process.env["LANGCHAIN_TRACING_V2"] = "true";
    process.env["LANGCHAIN_API_KEY"] = lsKey;
    process.env["LANGCHAIN_PROJECT"] = project;
  }

  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const app = buildGraph(key);
  const final = (await app.invoke(
    { question: input.question, context: input.context ?? "", query: input.question },
    { recursionLimit: 24, runName: "corpvidesh-statutory-graph", metadata: { runId } },
  )) as State;

  const spans = final.spans;
  const totals = spans.reduce(
    (acc, s) => ({
      latencyMs: acc.latencyMs + s.latencyMs,
      promptTokens: acc.promptTokens + s.promptTokens,
      completionTokens: acc.completionTokens + s.completionTokens,
      costUsd: Number((acc.costUsd + s.costUsd).toFixed(6)),
    }),
    { latencyMs: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 },
  );

  return {
    runId,
    question: input.question,
    answer: final.answer,
    draft: final.draft,
    qaVerdict: final.verdict,
    retrieval: {
      grade: final.grade,
      rewrites: final.rewrites,
      usedExternal: final.usedExternal,
      chunks: final.chunks,
    },
    spans,
    totals,
    tracing: { provider: lsKey ? "langsmith" : "local", project, enabled: Boolean(lsKey) },
  };
}
