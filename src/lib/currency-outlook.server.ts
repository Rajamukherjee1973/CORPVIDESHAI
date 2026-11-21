import { APICallError, NoObjectGeneratedError } from "ai";
import { getRates } from "@/lib/fx-sources";
import { HUBS } from "@/data/hubs";
import { COUNTRY_META } from "@/data/currencies";
import { RAIL_CURRENCIES } from "@/lib/opi-signal";
import { CurrencyOutlookSchema, normalizeOutlook } from "@/lib/currency-outlook";
import { createResponsesCall } from "./prediction-agent/responses.server";

export async function generateCurrencyOutlook(request: Request, input: { code: string; budgetCr: number; months: number }) {
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
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("The currency agent is not configured.");
  const call = createResponsesCall(request, { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, model: "openai/gpt-6-astra" }, [{ role: "user", content: JSON.stringify({ snapshot, budgetCr: input.budgetCr, horizonMonths: input.months }) }],
    "You are an Indian corporate treasury currency outlook agent. Use only the supplied provider snapshot, never invent market news, trends, history or licensed feed access. One spot rate cannot establish momentum or a calibrated forecast. Generate a cautious conditional currency outlook and an OPI review recommendation, NOT investment advice or a trade. centralMovePct is an explicitly illustrative INR-per-unit change over the supplied horizon, between -15 and +15; prefer zero absent directional evidence. Positive means INR depreciation and a rupee translation gain. allocationPct and hedgePct are proposed percentages from 0 to 100, not legal eligibility findings. If supported is false set allocationPct to zero and recommend legal review, not an alternative ODI execution. Do not equate currency or hub support with legal OPI eligibility. Mention security eligibility, available OPI headroom, board policy and AD-bank review before any investment. Give up to four concise evidence-based rationale items explaining the scenario, allocation and hedge, up to four risks, and one measurable review trigger. Explain that a hedge offsets translation movement only in a simplified scenario; exclude asset returns, fees, hedge carry and tax. No synthetic five-year data or simulated microticks are provided. Keep the response compact; outlook and action each at most two sentences.");
  let answer;
  try {
    answer = await call.result.output;
  } catch (error) {
    if (!NoObjectGeneratedError.isInstance(error)) throw error;
    try {
      answer = CurrencyOutlookSchema.parse(JSON.parse(error.text ?? ""));
    } catch {
      throw new Error("The agent did not return a usable outlook. No recommendation was applied.");
    }
  }
  return { answer: normalizeOutlook(answer, supported), snapshot, budgetCr: input.budgetCr, months: input.months };
}

export function outlookError(error: unknown): string {
  if (APICallError.isInstance(error)) {
    try {
      const body = JSON.parse(error.responseBody ?? "{}") as { message?: string; error?: { message?: string } };
      const message = body.message ?? body.error?.message;
      if (message) return message;
    } catch { /* use safe SDK message */ }
    return error.message;
  }
  return error instanceof Error ? error.message : "The currency agent could not complete this request.";
}