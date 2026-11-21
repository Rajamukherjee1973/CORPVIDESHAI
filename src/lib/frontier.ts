/**
 * Frontier desk — deterministic engines for the stress tester (treasury) and
 * the early-warning radar (regulators). Pure functions so they are testable.
 */

export type Shock = {
  /** Rupee move vs the destination currency, % (positive = rupee weakens). */
  inrMovePct: number;
  /** Change in destination policy rate, basis points. */
  rateShockBps: number;
  /** Destination equity drawdown, %. */
  equityDrawdownPct: number;
  /** Destination placed on a sanctions / FATF grey list. */
  sanctions: boolean;
  /** Share of the exposure hedged, 0–1. */
  hedgeRatio: number;
};

export type StressInput = {
  croreInr: number;
  netWorthCrore: number;
  usedCrore: number;
  route: "ODI" | "OPI";
  shock: Shock;
};

export type StressResult = {
  /** Extra rupees needed to remit the same foreign amount, crore. */
  fxCostCrore: number;
  /** Mark-to-market loss on the investment, crore. */
  valueLossCrore: number;
  /** Total hit after the hedge offset, crore. */
  netHitCrore: number;
  /** Headroom left under the FEMA ceiling after the shock, crore. */
  headroomCrore: number;
  /** Ceiling under FEMA OI Rules: 400% of net worth for ODI, 50% for OPI. */
  ceilingCrore: number;
  breach: boolean;
  verdict: "Proceed" | "Proceed with hedge" | "Defer" | "Blocked";
  action: string;
};

const round2 = (v: number) => Math.round(v * 100) / 100;

export function ceilingFor(route: "ODI" | "OPI", netWorthCrore: number): number {
  return route === "ODI" ? netWorthCrore * 4 : netWorthCrore * 0.5;
}

export function runStress(i: StressInput): StressResult {
  const { shock } = i;
  const unhedged = 1 - Math.min(1, Math.max(0, shock.hedgeRatio));
  const fxCost = i.croreInr * (shock.inrMovePct / 100) * unhedged;
  // Rate shock: duration-1 proxy on the invested value.
  const rateLoss = i.croreInr * (Math.max(0, shock.rateShockBps) / 10000);
  const equityLoss = i.route === "OPI" ? i.croreInr * (shock.equityDrawdownPct / 100) : i.croreInr * (shock.equityDrawdownPct / 100) * 0.4;
  const valueLoss = rateLoss + equityLoss;
  const ceiling = ceilingFor(i.route, i.netWorthCrore);
  const committed = i.usedCrore + i.croreInr * (1 + Math.max(0, shock.inrMovePct) / 100);
  const headroom = ceiling - committed;
  const breach = headroom < 0;
  const net = Math.max(0, fxCost) + valueLoss;
  const hitShare = net / Math.max(1, i.croreInr);

  let verdict: StressResult["verdict"];
  let action: string;
  if (shock.sanctions) {
    verdict = "Blocked";
    action = "Stop the remittance. A sanctioned or grey-listed destination fails AD bank screening; reroute through an alternate hub.";
  } else if (breach) {
    verdict = "Defer";
    action = `The shock pushes commitments past the ${i.route === "ODI" ? "400%" : "50%"} ceiling by ₹${round2(-headroom)} crore. Split the tranche or seek prior RBI approval.`;
  } else if (hitShare > 0.05) {
    verdict = "Proceed with hedge";
    action = `Lift hedge cover to at least ${Math.min(100, Math.round((shock.hedgeRatio + 0.3) * 100))}% before remitting; the unhedged hit is ${(hitShare * 100).toFixed(1)}% of the ticket.`;
  } else {
    verdict = "Proceed";
    action = "The ticket survives this scenario within tolerance. Remit on the current tape.";
  }

  return {
    fxCostCrore: round2(fxCost),
    valueLossCrore: round2(valueLoss),
    netHitCrore: round2(net),
    headroomCrore: round2(headroom),
    ceilingCrore: round2(ceiling),
    breach,
    verdict,
    action,
  };
}

/* ----------------------------- Early warning ----------------------------- */

export type Flow = {
  id: string;
  entity: string;
  hub: string;
  crore: number;
  /** Hours since the previous remittance by the same entity. */
  gapHours: number;
  /** Utilisation of the FEMA ceiling after this flow, %. */
  utilisationPct: number;
  /** Same beneficiary used by other unrelated Indian entities. */
  sharedBeneficiary: number;
  /** Amount sits just under a reporting threshold. */
  nearThreshold: boolean;
};

export type Alert = Flow & { score: number; level: "Watch" | "Elevated" | "Critical"; reasons: string[] };

export function scoreFlow(f: Flow): Alert {
  const reasons: string[] = [];
  let s = 0;
  if (f.utilisationPct >= 90) { s += 35; reasons.push(`Ceiling ${f.utilisationPct.toFixed(0)}% used`); }
  else if (f.utilisationPct >= 75) { s += 18; reasons.push(`Ceiling ${f.utilisationPct.toFixed(0)}% used`); }
  if (f.gapHours < 24) { s += 20; reasons.push("Repeat remittance inside 24h"); }
  if (f.sharedBeneficiary >= 3) { s += 30; reasons.push(`Beneficiary shared by ${f.sharedBeneficiary} entities`); }
  else if (f.sharedBeneficiary === 2) { s += 12; reasons.push("Beneficiary shared by 2 entities"); }
  if (f.nearThreshold) { s += 15; reasons.push("Amount sits just under a threshold"); }
  const score = Math.min(100, s);
  const level = score >= 60 ? "Critical" : score >= 30 ? "Elevated" : "Watch";
  return { ...f, score, level, reasons };
}

/* ------------------ Real RBI overseas investment disclosures ------------------ */

/** One row of RBI's monthly OFDI release (amounts in USD million). */
export type RbiFlow = {
  party: string; jv: string; kind: string; country: string; activity: string;
  equity: number; loan: number; guarantee: number; total: number;
  /** Rows filed by the same Indian party in the month. */
  partyCount: number;
  /** Month total for the same Indian party, USD million. */
  partyTotal: number;
  /** Distinct Indian parties investing into the same overseas entity. */
  sharedJv: number;
};

export type RbiAlert = RbiFlow & { score: number; level: Alert["level"]; reasons: string[] };

export const CONDUIT_HUBS = ["Mauritius", "United Arab Emirates", "Singapore", "Cayman Islands", "British Virgin Islands", "Virgin Islands (British)", "Jersey", "Guernsey", "Isle Of Man", "Bermuda", "Cyprus"];

export function scoreRbiFlow(f: RbiFlow): RbiAlert {
  const reasons: string[] = [];
  let s = 0;
  if (f.partyTotal >= 1000) { s += 30; reasons.push(`Party commitments $${f.partyTotal.toFixed(0)}m this month — above the USD 1bn approval trigger`); }
  if (f.total >= 100) { s += 20; reasons.push(`Large ticket $${f.total.toFixed(1)}m`); }
  else if (f.total >= 25) { s += 10; reasons.push(`Sizeable ticket $${f.total.toFixed(1)}m`); }
  if (f.total >= 50 && f.guarantee / f.total >= 0.8) { s += 25; reasons.push("Mostly guarantees — hidden contingent exposure"); }
  if (f.loan >= 10 && f.equity === 0 && f.kind === "WOS") { s += 15; reasons.push("Loan-only to own subsidiary — round-tripping check"); }
  if (CONDUIT_HUBS.some((h) => h.toLowerCase() === f.country.toLowerCase())) { s += 15; reasons.push(`Conduit jurisdiction (${f.country})`); }
  if (f.sharedJv >= 3) { s += 30; reasons.push(`Same overseas entity funded by ${f.sharedJv} Indian parties`); }
  else if (f.sharedJv === 2) { s += 12; reasons.push("Overseas entity funded by 2 Indian parties"); }
  if (f.partyCount >= 4) { s += 20; reasons.push(`${f.partyCount} filings by the same party this month`); }
  else if (f.partyCount >= 2) { s += 8; reasons.push(`${f.partyCount} filings by the same party this month`); }
  const score = Math.min(100, s);
  const level = score >= 60 ? "Critical" : score >= 30 ? "Elevated" : "Watch";
  return { ...f, score, level, reasons };
}

/** USD million → ₹ crore at a given USD/INR rate. */
export const usdMnToCrore = (usdMn: number, usdInr: number) => (usdMn * usdInr) / 10;
