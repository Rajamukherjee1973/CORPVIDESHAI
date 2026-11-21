import { createServerFn } from "@tanstack/react-start";
import { legalCaseSchema } from "./services/contracts";

/** Public, non-persisted advisory calculator: no company identifiers or private records accepted. */
export const assessInvestmentRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => legalCaseSchema.parse(input))
  .handler(async ({ data }) => {
    const { assessLegalRoute } = await import("./services/legal.server");
    const { serviceOperation } = await import("./services/runtime.server");
    return serviceOperation("legal.assess", () => assessLegalRoute(data));
  });