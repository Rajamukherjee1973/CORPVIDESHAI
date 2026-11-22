import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ClientExamples } from "@/lib/agents/training";

async function message(e: unknown) {
  const { agentError } = await import("@/lib/agents/llm.server");
  return agentError(e);
}

/** Treasury copilot, run as the "copilot" specialist of the LangGraph agent mesh. */
export const copilotAsk = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ question: z.string().min(3).max(800), context: z.string().max(1200).default(""), examples: ClientExamples }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { runMesh } = await import("@/lib/agents/mesh.server");
      const { executeAgent } = await import("@/lib/agents/execution.server");
      const run = await executeAgent("copilot", data.question,
        (memory, viewer) => runMesh({ agent: "copilot", question: data.question, context: data.context }, memory, viewer, data.examples),
        (r) => `${r.output.forecast} ${r.output.action}`);
      return { ok: true as const, answer: run.output, learning: run.learning };
    } catch (e) {
      console.error(e);
      return { ok: false as const, error: await message(e) };
    }
  });

/** Document reader, run as the "document" specialist of the LangGraph agent mesh. */
export const documentRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ text: z.string().max(20000).default(""), image: z.string().max(6_000_000).optional(), examples: ClientExamples }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { runMesh } = await import("@/lib/agents/mesh.server");
      const { executeAgent } = await import("@/lib/agents/execution.server");
      const input = data.image ? { agent: "document" as const, text: data.text, image: data.image } : { agent: "document" as const, text: data.text };
      const run = await executeAgent("document", "Document evidence extraction",
        (memory, viewer) => runMesh(input, memory, viewer, data.examples),
        (r) => `${r.output.entity} | ${r.output.currency} ${r.output.amount} | ${r.output.route} | ${r.output.summary}`);
      return { ok: true as const, doc: run.output, learning: run.learning };
    } catch (e) {
      console.error(e);
      return { ok: false as const, error: await message(e) };
    }
  });
