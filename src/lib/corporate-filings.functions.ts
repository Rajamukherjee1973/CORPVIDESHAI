import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { secureFilingSchema } from "./regulator-filing-schema";

export const readCorporateFilings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { readCompanyFilings } = await import("./services/corporate-filings.server");
  const { serviceOperation } = await import("./services/runtime.server");
  return serviceOperation("filings.corporate.read", () => readCompanyFilings(context));
});

export const submitCorporateFiling = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => secureFilingSchema.parse(input)).handler(async ({ data, context }) => {
    const { appendCompanyFiling } = await import("./services/corporate-filings.server");
    const { serviceOperation } = await import("./services/runtime.server");
    return serviceOperation("filings.corporate.append", () => appendCompanyFiling(data, context));
  });
