/**
 * Currency outlook — LangChain specialist of the agent mesh.
 * NOTE: owns conditional FX scenarios, allocation and hedge only; statutory
 * citations and forms belong to the statutory graph.
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getRates } from "@/lib/fx-sources";
import { HUBS } from "@/data/hubs";
import { COUNTRY_META } from "@/data/currencies";
import { RAIL_CURRENCIES } from "@/lib/opi-signal";
import { CurrencyOutlookSchema, normalizeOutlook } from "@/lib/currency-outlook";
import { agentError, structuredCall } from "@/lib/agents/llm.server";

const SYSTEM =
  "You are an Indian corporate treasury currency outlook agent. Your only job: a cautious conditional currency scenario with an OPI allocation and hedge proposal — leave statutory citations and filing forms to the statutory graph. Use only the supplied provider snapshot, never invent market news, trends, history or licensed feed access. One spot rate cannot establish momentum or a calibrated forecast. This is NOT investment advice or a trade. centralMovePct is an explicitly illustrative INR-per-unit change over the supplied horizon, between -15 and +15; prefer zero absent directional evidence. Positive means INR depreciation and a rupee translation gain. allocationPct and hedgePct are proposed percentages from 0 to 100, not legal eligibility findings. If supported is false set allocationPct to zero and recommend legal review, not an alternative ODI execution. Do not equate currency or hub support with legal OPI eligibility. Mention security eligibility, available OPI headroom, board policy and AD-bank review before any investment. Give up to four concise evidence-based rationale items explaining the scenario, allocation and hedge, up to four risks, and one measurable review trigger. Explain that a hedge offsets translation movement only in a simplified scenario; exclude asset returns, fees, hedge carry and tax. No synthetic five-year data or simulated microticks are provided. Reviewed examples are style references only. Keep the response compact; outlook and action each at most two sentences.";

export async function generateCurrencyOutlook(input: { code: string; budgetCr: number; months: number }, examples = "") {
  const row = RAIL_CURRENCIES.find((r) => r.code === input.code);
  if (!row) throw new Error("Select a supported currency.");
  const rates = await getRates();
  const inr = rates?.payload.rates["INR"];
  const per = input.code === "USD" ? 1 : rates?.payload.rates[input.code];
  if (!rates || rates.stale || !inr || !per) throw new Error("A fresh provider rate is unavailable. No outlook was generated.");
  const spot = inr / per;
  const hubs = HUBS.filter((h) => COUNTRY_META[h.country]?.currency === input.code);
  const supported = hubs.some((h) => h.route.includes("OPI"));
  const snapshot = { code: input.code, spot, source: rates.payload.source, tier: rates.payload.tier, providerStamp: rates.payload.stamp, capturedAt: new Date().toISOString(), supported, hubs: hubs.map((h) => h.city) };
  const answer = await structuredCall("currency", CurrencyOutlookSchema, [
    new SystemMessage(SYSTEM),
    new HumanMessage(`${JSON.stringify({ snapshot, budgetCr: input.budgetCr, horizonMonths: input.months })}${examples ? `\n${examples}` : ""}`),
  ], "currency_outlook", "The agent did not return a usable outlook. No recommendation was applied.");
  return { answer: normalizeOutlook(answer, supported), snapshot, budgetCr: input.budgetCr, months: input.months };
}

/** Kept for existing callers; all agents now share one error vocabulary. */
export function outlookError(error: unknown): string {
  return agentError(error);
}
