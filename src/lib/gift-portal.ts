import { z } from "zod";

export const GIFT_PARTIES = ["treasury", "ad_bank", "rbi", "ifsca", "mof", "fiu_ind", "dpiit", "cbdt", "ibu"] as const;
export type GiftParty = (typeof GIFT_PARTIES)[number];
export const REGULATOR_PARTIES: GiftParty[] = ["rbi", "ifsca", "mof", "fiu_ind", "dpiit", "cbdt"];

export const PARTY_LABEL: Record<GiftParty, string> = {
  treasury: "Corporate treasury", ad_bank: "AD Category-I bank", rbi: "RBI", ifsca: "IFSCA", mof: "MoF",
  fiu_ind: "FIU-IND", dpiit: "DPIIT", cbdt: "CBDT", ibu: "GIFT IFSC banking unit",
};

export const PARTY_ACTIONS: Record<GiftParty, Array<"filed" | "verified" | "cleared" | "queried" | "released" | "recorded">> = {
  treasury: ["filed"], ad_bank: ["verified", "queried"], rbi: ["cleared", "queried"], ifsca: ["cleared", "queried"],
  mof: ["cleared", "queried"], fiu_ind: ["cleared", "queried"], dpiit: ["cleared", "queried"], cbdt: ["cleared", "queried"],
  ibu: ["released", "queried"],
};

export type GiftEvent = { party: GiftParty; action: string };
export type CaseStage = "awaiting_bank" | "with_regulators" | "awaiting_release" | "released" | "queried";

/** Pure workflow rule: bank verifies first, then all six regulators clear in parallel, then the IBU releases. */
export function caseStage(events: GiftEvent[]): CaseStage {
  // A bank re-verification after a query restarts the regulator round.
  let lastVerify = -1;
  events.forEach((e, i) => { if (e.party === "ad_bank" && e.action === "verified") lastVerify = i; });
  const round = events.filter((e, i) => e.party === "treasury" || e.party === "ad_bank" || i > lastVerify);
  const latestBy = new Map<GiftParty, string>();
  for (const e of round) latestBy.set(e.party, e.action);
  if ([...latestBy.values()].includes("queried")) return "queried";
  if (latestBy.get("ibu") === "released") return "released";
  if (latestBy.get("ad_bank") !== "verified") return "awaiting_bank";
  if (REGULATOR_PARTIES.every((p) => latestBy.get(p) === "cleared")) return "awaiting_release";
  return "with_regulators";
}

/** Whether this party may act now, given the case's events. */
export function canAct(party: GiftParty, events: GiftEvent[]): boolean {
  const stage = caseStage(events);
  let lastVerify = -1;
  events.forEach((e, i) => { if (e.party === "ad_bank" && e.action === "verified") lastVerify = i; });
  const latest = [...events].slice(lastVerify + 1).reverse().find((e) => e.party === party)?.action;
  if (party === "treasury") return false;
  if (party === "ad_bank") return stage === "awaiting_bank" || stage === "queried";
  if (party === "ibu") return stage === "awaiting_release";
  return stage === "with_regulators" && latest !== "cleared";
}

export const openCaseSchema = z.object({
  company: z.string().trim().min(2).max(160),
  hub: z.string().trim().min(2).max(80),
  currency: z.string().trim().regex(/^[A-Z]{3}$/),
  amount_crore: z.number().positive().max(1_000_000),
  route: z.enum(["Automatic", "Approval"]),
  purpose: z.string().trim().max(200).default(""),
  ad_bank: z.string().trim().min(2).max(120),
  fx_rate: z.number().positive().nullable(),
  fx_source: z.string().trim().max(120).nullable(),
  documents: z.array(z.string().trim().min(1).max(80)).max(12),
});

export const addEventSchema = z.object({
  case_id: z.string().uuid(),
  action: z.enum(["verified", "cleared", "queried", "released"]),
  note: z.string().trim().max(500).default(""),
  documents: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
});
