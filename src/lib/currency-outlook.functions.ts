import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

export const runCurrencyOutlook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ code: z.string().regex(/^[A-Z]{3}$/), budgetCr: z.number().positive().max(100000), months: z.number().int().min(1).max(12) }).parse(input))
  .handler(async ({ data }) => {
    const { generateCurrencyOutlook, outlookError } = await import("@/lib/currency-outlook.server");
    const { executeAgent } = await import("@/lib/agents/execution.server");
    try {
      return { ok: true as const, result: await executeAgent("currency", `${data.code} / INR · ${data.budgetCr} crore · ${data.months} months`,
        () => generateCurrencyOutlook(getRequest(), data), (result) => `${result.answer.outlook} ${result.answer.action}`) };
    } catch (error) {
      return { ok: false as const, error: outlookError(error) };
    }
  });