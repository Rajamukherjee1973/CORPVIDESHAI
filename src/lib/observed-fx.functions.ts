import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
export const observedFxHistory = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ code: z.string().regex(/^[A-Z]{3}$/) }).parse(input))
  .handler(async ({ data }) => {
    const { readObservedHistory } = await import("./services/market-history.server");
    const { serviceOperation } = await import("./services/runtime.server");
    return serviceOperation("market.observed-history", () => readObservedHistory(data.code));
  });
