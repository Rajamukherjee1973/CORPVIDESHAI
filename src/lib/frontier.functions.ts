import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function message(e: unknown) {
  const { outlookError } = await import("@/lib/currency-outlook.server");
  return outlookError(e);
}

export const copilotAsk = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ question: z.string().min(3).max(800), context: z.string().max(1200).default("") }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { askCopilot } = await import("@/lib/frontier.server");
      const { executeAgent } = await import("@/lib/agents/execution.server");
      return { ok: true as const, answer: await executeAgent("copilot", data.question,
        (memory) => askCopilot(data.question, [memory, data.context].filter(Boolean).join("\n")),
        (answer) => `${answer.forecast} ${answer.action}`) };
    } catch (e) {
      console.error(e);
      return { ok: false as const, error: await message(e) };
    }
  });

export const documentRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ text: z.string().max(20000).default(""), image: z.string().max(6_000_000).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { readDocument } = await import("@/lib/frontier.server");
      const { executeAgent } = await import("@/lib/agents/execution.server");
      return { ok: true as const, doc: await executeAgent("document", "Document evidence extraction",
        () => readDocument(data.text, data.image), (doc) => `${doc.entity} | ${doc.currency} ${doc.amount} | ${doc.route} | ${doc.summary}`) };
    } catch (e) {
      console.error(e);
      return { ok: false as const, error: await message(e) };
    }
  });
