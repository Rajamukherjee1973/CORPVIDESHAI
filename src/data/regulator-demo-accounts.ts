// Deliberately public credentials for isolated, disposable regulator-portal showcase desks only.
export const REGULATOR_DEMO_PASSWORD = "CorpVidesh-Demo-2026!";
export const REGULATOR_DEMO_ACCOUNTS = [
  { desk: "Corporate Treasury", email: "regdesk.treasury@corpvideshai.com", does: "Files a demonstration Form FC record." },
  { desk: "AD Bank", email: "regdesk.adbank@corpvideshai.com", does: "Acknowledges receipt, raises KYC or document queries." },
  { desk: "RBI", email: "regdesk.rbi@corpvideshai.com", does: "Checks the 400% net-worth ceiling and reporting delay; clears or escalates." },
  { desk: "IFSCA", email: "regdesk.ifsca@corpvideshai.com", does: "Reviews IFSC-entity conditions where GIFT City is involved." },
  { desk: "MoF", email: "regdesk.mof@corpvideshai.com", does: "Proposed policy lane: strategic-sector and country conditions." },
  { desk: "FIU-IND", email: "regdesk.fiuind@corpvideshai.com", does: "Flags suspicious-pattern or counterparty risk." },
  { desk: "DPIIT", email: "regdesk.dpiit@corpvideshai.com", does: "Proposed sector lane: activity and sector conditions." },
  { desk: "CBDT", email: "regdesk.cbdt@corpvideshai.com", does: "Proposed tax lane: Section 195, 15CA/15CB, treaty position." },
] as const;

export const ACTION_LABELS = {
  acknowledge: "Acknowledge receipt",
  query: "Raise query",
  flag_risk: "Flag risk",
  condition: "Clear with condition",
  clear: "Clear",
  escalate: "Escalate to approval route",
} as const;
export type RegulatorActionKind = keyof typeof ACTION_LABELS;
