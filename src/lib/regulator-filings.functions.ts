import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { secureFilingSchema } from "./regulator-filing-schema";

export const readRegulatorFilings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { readPortalFilings } = await import("./services/regulator-filings.server");
  const { serviceOperation } = await import("./services/runtime.server");
  return serviceOperation("filings.regulator.read", () => readPortalFilings(context));
});

export const appendRegulatorFiling = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => secureFilingSchema.parse(input)).handler(async ({ data, context }) => {
    const { appendPortalFiling } = await import("./services/regulator-filings.server");
    const { serviceOperation } = await import("./services/runtime.server");
    return serviceOperation("filings.regulator.append", () => appendPortalFiling(data, context));
  });

export const recordRegulatorAction = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ recordId: z.string().uuid(), action: z.enum(["acknowledge", "query", "flag_risk", "condition", "clear", "escalate"]), note: z.string().trim().max(600) }).parse(input))
  .handler(async ({ data, context }) => {
    const { appendRegulatorAction } = await import("./services/regulator-filings.server");
    const { serviceOperation } = await import("./services/runtime.server");
    return serviceOperation("filings.regulator.action", () => appendRegulatorAction(data, context));
  });
