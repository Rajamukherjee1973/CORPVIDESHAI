/**
 * CorpVidesh AI — the single LangChain runtime every agent uses.
 *
 * NOTE: before this module, the statutory graph used LangChain while the
 * copilot, document reader and currency outlook each built their own Vercel AI
 * SDK client. Now one factory owns the gateway connection, run-id correlation,
 * LangSmith tracing switch and error wording, so no agent duplicates plumbing.
 *
 * Each agent keeps the model it already ran on; only the client is shared.
 */
import { ChatOpenAI } from "@langchain/openai";
import type { BaseMessage } from "@langchain/core/messages";
import type { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "@/lib/prediction-agent/run-id.server";
import type { TrainableAgent } from "./training";

type ModelSpec = { model: string; temperature?: number; reasoning?: "low" | "medium"; responses: boolean };

/** One row per agent. Changing a model here changes it everywhere that agent runs. */
export const AGENT_MODELS: Record<TrainableAgent, ModelSpec> = {
  statutory: { model: "google/gemini-3.7-flash", temperature: 0.1, responses: false },
  copilot: { model: "openai/gpt-6-astra", reasoning: "low", responses: true },
  document: { model: "openai/gpt-6-astra", reasoning: "low", responses: true },
  currency: { model: "openai/gpt-6-astra", reasoning: "medium", responses: true },
};

function correlationFetch() {
  try {
    return createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(getRequest())).fetch;
  } catch {
    return undefined; // outside a request (e.g. managed LangGraph deployment): no run-id header
  }
}

/** Mirrors runs to LangSmith only when a credential exists; otherwise traces stay local spans. */
export function tracingConfig() {
  const lsKey = process.env["LANGSMITH_API_KEY"] || process.env["LANGCHAIN_API_KEY"];
  const project = process.env["LANGSMITH_PROJECT"] || "corpvidesh-ai";
  if (lsKey) {
    process.env["LANGCHAIN_TRACING_V2"] = "true";
    process.env["LANGCHAIN_API_KEY"] = lsKey;
    process.env["LANGCHAIN_PROJECT"] = project;
  }
  return { provider: lsKey ? ("langsmith" as const) : ("local" as const), project, enabled: Boolean(lsKey) };
}

export function chatModel(agent: TrainableAgent): ChatOpenAI {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this app.");
  const spec = AGENT_MODELS[agent];
  const fetch = correlationFetch();
  return new ChatOpenAI({
    model: spec.model,
    apiKey: key,
    maxRetries: 0,
    streamUsage: true,
    ...(spec.temperature !== undefined ? { temperature: spec.temperature } : {}),
    ...(spec.responses ? { useResponsesApi: true } : {}),
    ...(spec.reasoning ? { reasoning: { effort: spec.reasoning } } : {}),
    configuration: {
      baseURL: "https://ai.gateway.lovable.dev/v1",
      defaultHeaders: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "langchain" },
      ...(fetch ? { fetch } : {}),
    },
  });
}

/**
 * Structured LangChain call: the model must return the zod schema. A response
 * that cannot be parsed raises `invalidMessage` instead of a guessed answer.
 */
export async function structuredCall<S extends z.ZodTypeAny>(
  agent: TrainableAgent,
  schema: S,
  messages: BaseMessage[],
  name: string,
  invalidMessage: string,
): Promise<z.infer<S>> {
  const runnable = chatModel(agent).withStructuredOutput(schema, { method: "jsonSchema", name });
  let raw: unknown;
  try {
    raw = await runnable.invoke(messages, { runName: `corpvidesh-${agent}`, tags: ["corpvidesh", agent] });
  } catch (error) {
    if (error instanceof Error && /parse|schema|json/i.test(error.message) && !statusOf(error)) throw new Error(invalidMessage);
    throw error;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error(invalidMessage);
  return parsed.data;
}

function statusOf(error: unknown): number | null {
  const s = (error as { status?: unknown } | null)?.status;
  return typeof s === "number" ? s : null;
}

/** Safe, specific wording for any agent failure — credits, limits, config — without leaking internals. */
export function agentError(error: unknown): string {
  const status = statusOf(error);
  if (status === 402) return "AI credits for this workspace have run out. Add credits, then try again.";
  if (status === 429) return "The AI service is busy right now. Wait a moment, then try again.";
  if (status === 401 || status === 403) return "The AI service refused this request. The workspace AI connection needs attention.";
  if (status && status >= 500) return "The AI service had a temporary problem. No answer was applied; try again shortly.";
  if (error instanceof Error && error.message) return error.message.replace(/^\d{3}\s+/, "").slice(0, 300);
  return "The agent could not complete this request.";
}
