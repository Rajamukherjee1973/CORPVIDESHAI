import { z } from "zod";
import { REGULATOR_PARTIES, type GiftParty } from "./gift-portal";

export type FundParty = Exclude<GiftParty, "treasury"> | "investor";
export const FUND_REGULATORS = REGULATOR_PARTIES.filter((party): party is Exclude<GiftParty, "treasury"> => party !== "treasury");
export type FundEvent = { party: FundParty; action: string };
export const FUND_PACK = ["Investment mandate", "Investor KYC / beneficial ownership", "Source of funds declaration", "Investment proposal", "Valuation / term sheet", "Tax and FEMA assessment"];
export const FUND_STAGE = { awaiting_bank: "With AD bank", with_regulators: "Parallel demo review", awaiting_release: "Awaiting GIFT IBU", released: "Demo clearance completed", queried: "Investor response required" } as const;
export type FundStage = keyof typeof FUND_STAGE;

export function fundStage(events: FundEvent[]): FundStage {
  let start = 0;
  events.forEach((event, index) => { if (event.action === "resubmitted") start = index; });
  const round = events.slice(start);
  if (round.some((event) => event.action === "queried")) return "queried";
  if (round.some((event) => event.party === "ibu" && event.action === "released")) return "released";
  if (!round.some((event) => event.party === "ad_bank" && event.action === "verified")) return "awaiting_bank";
  return REGULATOR_PARTIES.every((party) => round.some((event) => event.party === party && event.action === "cleared")) ? "awaiting_release" : "with_regulators";
}

export function canFundAct(party: FundParty, events: FundEvent[]): boolean {
  const stage = fundStage(events);
  if (party === "investor") return stage === "queried";
  if (party === "ad_bank") return stage === "awaiting_bank";
  if (party === "ibu") return stage === "awaiting_release";
  let lastResponse = -1;
  events.forEach((event, index) => { if (event.action === "resubmitted") lastResponse = index; });
  return stage === "with_regulators" && !events.slice(lastResponse + 1).some((event) => event.party === party && event.action === "cleared");
}

export const fundProposalSchema = z.object({
  title: z.string().trim().min(3).max(160),
  hub: z.string().trim().min(2).max(80),
  currency: z.string().regex(/^[A-Z]{3}$/),
  amount_crore: z.number().positive().max(1_000_000),
  investment_type: z.enum(["ODI equity", "OPI securities", "Overseas fund units"]),
  route: z.enum(["Automatic", "Approval", "Assessment required"]),
  purpose: z.string().trim().min(10).max(2000),
  ad_bank: z.string().trim().min(2).max(120),
  documents: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
});

export const fundEventSchema = z.object({
  proposal_id: z.string().uuid(),
  action: z.enum(["verified", "cleared", "queried", "released", "resubmitted"]),
  note: z.string().trim().min(3).max(2000),
  documents: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
});