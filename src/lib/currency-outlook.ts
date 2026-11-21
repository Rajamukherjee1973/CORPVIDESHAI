import { z } from "zod";

export const CurrencyOutlookSchema = z.object({
  outlook: z.string(),
  action: z.string(),
  centralMovePct: z.number(),
  allocationPct: z.number(),
  hedgePct: z.number(),
  rationale: z.array(z.string()),
  risks: z.array(z.string()),
  reviewTrigger: z.string(),
});

export type CurrencyOutlook = z.infer<typeof CurrencyOutlookSchema>;
const bound = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function normalizeOutlook(answer: CurrencyOutlook, supported: boolean): CurrencyOutlook {
  return {
    ...answer,
    centralMovePct: bound(answer.centralMovePct, -15, 15),
    allocationPct: supported ? bound(answer.allocationPct, 0, 100) : 0,
    hedgePct: bound(answer.hedgePct, 0, 100),
    rationale: answer.rationale.slice(0, 4),
    risks: answer.risks.slice(0, 4),
  };
}

export function currencyScenario(spot: number, movePct: number, budgetCr: number, allocationPct: number, hedgePct: number) {
  const allocationCr = budgetCr * allocationPct / 100;
  return {
    projectedRate: spot * (1 + movePct / 100),
    allocationCr,
    hedgeCr: allocationCr * hedgePct / 100,
    translationCr: (allocationCr * movePct / 100 * (1 - hedgePct / 100)) || 0,
  };
}