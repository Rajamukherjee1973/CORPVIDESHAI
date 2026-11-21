import { createServerFn } from "@tanstack/react-start";
import { ToolInput, toolAccess } from "@/lib/agents/execution";

export const integrationStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { executionViewer, recentExecutions } = await import("@/lib/agents/execution.server");
  const { serviceOperation } = await import("./services/runtime.server");
  return serviceOperation("agents.integration-status", async () => {
    const viewer = await executionViewer();
    return {
      verified: Boolean(viewer),
      aiConfigured: Boolean(process.env["LOVABLE_API_KEY"]),
      tracingConfigured: Boolean(process.env["LANGSMITH_API_KEY"] || process.env["LANGCHAIN_API_KEY"]),
      licensedFxConfigured: Boolean((process.env["BLOOMBERG_API_KEY"] && process.env["BLOOMBERG_FX_URL"]) || (process.env["LSEG_API_KEY"] && process.env["LSEG_FX_URL"])),
      history: await recentExecutions(viewer),
    };
  });
});

export const executeReadTool = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ToolInput.parse(input))
  .handler(async ({ data }) => {
    const { executionViewer, recentExecutions, executeAgent } = await import("@/lib/agents/execution.server");
    const viewer = await executionViewer();
    const access = toolAccess(data.name, Boolean(viewer));
    if (!access.allowed) return { ok: false as const, error: access.reason };
    try {
      const output = await executeAgent("tool", data.name, async () => {
        if (data.name === "ledger.read") return { records: await recentExecutions(viewer) };
        if (data.name === "statute.search") {
          const { semanticRetrieve } = await import("@/lib/agents/rag.server");
          return semanticRetrieve(data.query || "FEMA overseas investment reporting", 4);
        }
        if (data.name === "fx.rate") {
          const { getRates } = await import("@/lib/fx-sources");
          const rates = await getRates();
          const inr = rates?.payload.rates["INR"];
          const per = data.code === "USD" ? 1 : rates?.payload.rates[data.code];
          if (!rates || !inr || !per) throw new Error("No provider rate is available for this currency.");
          return { code: data.code, inrPerUnit: inr / per, source: rates.payload.source, providerStamp: rates.payload.stamp, stale: rates.stale, tier: rates.payload.tier };
        }
        const { pullMarketQuote } = await import("@/lib/market-quotes.server");
        const quote = await pullMarketQuote(data.symbol);
        if (!quote) throw new Error("A public market quote is unavailable for this index.");
        return quote;
      }, () => `Read-only ${data.name}`);
      return { ok: true as const, output };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "The tool could not complete." };
    }
  });