import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AgentRunResult } from "@/lib/agents/types";

const Input = z.object({
  question: z.string().min(4).max(600),
  context: z.string().max(2400).default(""),
});

export const runStatutoryGraph = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<AgentRunResult> => {
    const { runAgentGraph } = await import("@/lib/agents/graph.server");
    const { executeAgent } = await import("@/lib/agents/execution.server");
    return executeAgent("statutory", data.question,
      (memory) => runAgentGraph({ question: data.question, context: [memory, data.context].filter(Boolean).join("\n").slice(0, 3800) }),
      (result) => `${result.qaVerdict?.pass ? "QA passed" : "Human review required"}: ${result.draft?.determination ?? result.answer}`,
      (result) => Boolean(result.qaVerdict?.pass));
  });

const ProbeInput = z.object({
  query: z.string().min(3).max(400),
  k: z.number().int().min(1).max(8).default(4),
});

/**
 * Retrieval probe: embeds the query, searches the vector index over the
 * statutory corpus and reports which mode answered — used on the architecture
 * desk to prove retrieval is semantic, not keyword matching.
 */
export const probeRetrieval = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ProbeInput.parse(data))
  .handler(async ({ data }) => {
    const { semanticRetrieve } = await import("@/lib/agents/rag.server");
    const { serviceOperation } = await import("@/lib/services/runtime.server");
    return serviceOperation("agents.retrieval-probe", async () => {
      const t = Date.now();
      const r = await semanticRetrieve(data.query, data.k);
      return { ...r, latencyMs: Date.now() - t };
    });
  });
