/**
 * Predictive intelligence cases for large Indian corporates.
 *
 * Each case is an illustrative archetype — a sector, a corridor, a ticket and
 * a balance-sheet position — run through the same deterministic forecast
 * engine the Prediction surface uses. Company profiles and net-worth figures
 * are illustrative, not any named company's plans or filed accounts.
 */
import type { RouteKind } from "@/lib/predict";

export type PredictiveCase = {
  id: string;
  n: string;
  sector: string;
  archetype: string;
  /** The question the CFO or treasurer actually asks. */
  question: string;
  /** What the treasury would typically do without a forward view. */
  blindSpot: string;
  hub: string;
  purpose: string;
  amountCr: number;
  route: RouteKind;
  docsReady: number;
  firstTimeFiler: boolean;
  section195: boolean;
  /** Illustrative audited net worth, INR crore. */
  netWorthCr: number;
  /** Illustrative commitment already outstanding, INR crore. */
  committedCr: number;
  /** The forecast that decides this case. */
  decisive: "clearance" | "cost" | "drift" | "rework" | "headroom";
};

export const PREDICTIVE_CASES: PredictiveCase[] = [
  {
    id: "ceiling",
    n: "01",
    sector: "Energy & infrastructure",
    archetype: "Diversified conglomerate · overseas solar and wind platform",
    question: "Can we commit the next ₹6,500 crore tranche abroad without it turning into a Reserve Bank approval case?",
    blindSpot: "Headroom is checked once, at board approval, against last year's numbers — and the breach is found by the AD bank.",
    hub: "Sydney",
    purpose: "ODI-025",
    amountCr: 6500,
    route: "ODI",
    docsReady: 84,
    firstTimeFiler: false,
    section195: true,
    netWorthCr: 40000,
    committedCr: 142000,
    decisive: "headroom",
  },
  {
    id: "opi-cap",
    n: "02",
    sector: "Consumer goods",
    archetype: "Cash-rich FMCG major · parking treasury surplus offshore",
    question: "How much surplus can we place in an overseas money-market fund this year before we hit the portfolio cap?",
    blindSpot: "Portfolio placements are booked by the treasury desk one at a time; the 50% cumulative cap is reconciled at year end.",
    hub: "Luxembourg",
    purpose: "OPI-007",
    amountCr: 900,
    route: "OPI",
    docsReady: 93,
    firstTimeFiler: false,
    section195: false,
    netWorthCr: 12000,
    committedCr: 4800,
    decisive: "headroom",
  },
  {
    id: "fx-window",
    n: "03",
    sector: "Automotive & EV",
    archetype: "Auto OEM · battery-cell joint venture in Japan",
    question: "If approval takes three sessions, how much can the yen move against a ₹3,200 crore equity cheque?",
    blindSpot: "Hedging is decided after the regulator responds, so the exposure window is open and unpriced while the file is queued.",
    hub: "Tokyo",
    purpose: "ODI-027",
    amountCr: 3200,
    route: "Approval",
    docsReady: 88,
    firstTimeFiler: false,
    section195: true,
    netWorthCr: 25000,
    committedCr: 30000,
    decisive: "drift",
  },
  {
    id: "first-filer",
    n: "04",
    sector: "Pharmaceuticals",
    archetype: "Mid-cap pharma · first overseas formulation-plant acquisition",
    question: "We have never filed an ODI before. Where will this file get stuck, and what do we fix first?",
    blindSpot: "Missing valuation and board papers surface as regulator queries weeks in, restarting the clock each time.",
    hub: "Frankfurt",
    purpose: "ODI-031",
    amountCr: 2400,
    route: "ODI",
    docsReady: 62,
    firstTimeFiler: true,
    section195: true,
    netWorthCr: 18000,
    committedCr: 6000,
    decisive: "rework",
  },
  {
    id: "spread",
    n: "05",
    sector: "Metals & mining",
    archetype: "Steel group · brownfield acquisition of an Italian rolling mill",
    question: "Is our AD bank pricing this corridor fairly, or are we leaving spread on the table?",
    blindSpot: "One relationship bank quotes the conversion; the margin is never benchmarked against the corridor.",
    hub: "Milan",
    purpose: "ODI-003",
    amountCr: 4100,
    route: "ODI",
    docsReady: 90,
    firstTimeFiler: false,
    section195: true,
    netWorthCr: 60000,
    committedCr: 41000,
    decisive: "cost",
  },
  {
    id: "release",
    n: "06",
    sector: "IT services",
    archetype: "IT services leader · Gulf cloud-delivery subsidiary",
    question: "Everything looks in order — can we release today, and how much hedge does a short window really need?",
    blindSpot: "Clean files wait in the same queue as problem files, so a well-prepared case pays the same delay and exposure as a weak one.",
    hub: "Dubai (DIFC)",
    purpose: "ODI-030",
    amountCr: 1150,
    route: "ODI",
    docsReady: 95,
    firstTimeFiler: false,
    section195: true,
    netWorthCr: 90000,
    committedCr: 12000,
    decisive: "clearance",
  },
];
