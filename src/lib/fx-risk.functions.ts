import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Public read: realised currency volatility vs INR from dated reference snapshots. No user data. */
export const measuredFxRisk = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ codes: z.array(z.string().regex(/^[A-Z]{3}$/)).min(1).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const { readFxRisk } = await import("./services/fx-risk.server");
    const { serviceOperation } = await import("./services/runtime.server");
    return serviceOperation("market.fx-risk", () => readFxRisk([...new Set(data.codes)]));
  });
