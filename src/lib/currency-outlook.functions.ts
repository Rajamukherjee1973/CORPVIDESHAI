import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ClientExamples } from "@/lib/agents/training";

/** Currency outlook, run as the "currency" specialist of the LangGraph agent mesh. */
export const runCurrencyOutlook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ code: z.string().regex(/^[A-Z]{3}$/), budgetCr: z.number().positive().max(100000), months: z.number().int().min(1).max(12), examples: ClientExamples }).parse(input))
  .handler(async ({ data }) => {
    const { runMesh } = await import("@/lib/agents/mesh.server");
    const { agentError } = await import("@/lib/agents/llm.server");
    const { executeAgent } = await import("@/lib/agents/execution.server");
    try {
      const run = await executeAgent("currency", `${data.code} / INR · ${data.budgetCr} crore · ${data.months} months`,
        (memory, viewer) => runMesh({ agent: "currency", code: data.code, budgetCr: data.budgetCr, months: data.months }, memory, viewer, data.examples),
        (r) => `${r.output.answer.outlook} ${r.output.answer.action}`);
      return { ok: true as const, result: { ...run.output, learning: run.learning } };
    } catch (error) {
      return { ok: false as const, error: agentError(error) };
    }
  });
