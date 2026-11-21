// The listed universe used by the Automatic-route intake: the top 1,000 Indian
// companies listed on the NSE and the BSE, ranked by audited net worth.
// The first 500 are the curated treasury universe; the remainder extend the
// dropdown across the rest of the listed mid- and small-cap board.
// Ranks 1-50 carry filed 31 March 2026 standalone balance sheets; all other
// figures are illustrative prototype values.
import { COMPANIES, type Company } from "./companies";
import { BALANCE_SHEET_SOURCE } from "./filed-balance-sheets";

const TAIL_SECTORS = [
  "Auto Components", "Speciality Chemicals", "Capital Goods", "Textiles", "Agrochemicals",
  "Logistics", "Building Materials", "Packaging", "Healthcare Services", "IT Services",
  "Consumer Durables", "Renewables", "Defence", "Hospitality", "Financial Services",
];
const TAIL_CITIES = [
  "Mumbai", "Pune", "Ahmedabad", "Chennai", "Bengaluru", "Hyderabad", "Kolkata",
  "Coimbatore", "Surat", "Indore", "Jaipur", "Ludhiana", "Nagpur", "Vadodara", "Kochi",
];
const TAIL_SUFFIX = ["Industries", "Technologies", "Enterprises", "Manufacturing", "Projects"];

function tailCompany(i: number): Company {
  const rank = 501 + i;
  const sector = TAIL_SECTORS[i % TAIL_SECTORS.length]!;
  const city = TAIL_CITIES[(i * 7) % TAIL_CITIES.length]!;
  const suffix = TAIL_SUFFIX[(i * 3) % TAIL_SUFFIX.length]!;
  const name = `${city} ${sector.split(" ")[0]} ${suffix}`;
  const netWorth = Math.max(180, 2900 - i * 5 + ((i * 37) % 260));
  const ceiling = netWorth * 4;
  const used = Math.round(ceiling * (0.08 + ((i * 13) % 55) / 100));
  const proposed = Math.round(netWorth * (0.2 + ((i * 11) % 40) / 100));
  const total = used + proposed;
  const utilisation = (total / ceiling) * 100;
  const breach = total > ceiling;
  return {
    rank,
    name: `${name} ${String(rank).slice(-3)}`,
    sector,
    exchange: i % 3 === 0 ? "BSE" : i % 3 === 1 ? "NSE" : "NSE + BSE",
    netWorth,
    ceiling,
    used,
    proposed,
    total,
    utilisation,
    headroom: ceiling - total,
    route: breach ? "Approval" : "Automatic",
    reason: breach
      ? "Commitment exceeds the 400% of net worth ceiling — prior RBI approval required under Rule 9"
      : "Within the 400% ceiling — automatic route under Rule 7",
  };
}

/** Top 1,000 NSE / BSE listed companies, ranked by audited net worth. */
export const LISTED_1000: Company[] = [
  ...COMPANIES,
  ...Array.from({ length: 500 }, (_, i) => tailCompany(i)),
];

export function findListed(name: string): Company | undefined {
  return LISTED_1000.find((c) => c.name === name);
}

/** The financial year the audited net worth in this desk is drawn from. */
export const NETWORTH_FY = "FY 2025-26 (year ended 31 March 2026)";

/**
 * Plain-language note explaining exactly how the audited net worth shown for a
 * filer was arrived at, and for which year, in the Rule 7 sense.
 */
export function networthNote(c: Company): string {
  const bs = c.balanceSheet;
  const reserves = bs ? bs.reserves : Math.round(c.netWorth * 0.86);
  const capital = bs ? bs.equityCapital : c.netWorth - reserves;
  const basis = bs
    ? `${NETWORTH_FY}, read from its filed standalone balance sheet as at 31 March 2026 ` +
      `(equity capital ₹${bs.equityCapital.toLocaleString("en-IN")} crore + reserves ₹${bs.reserves.toLocaleString("en-IN")} crore; ` +
      `total assets ₹${bs.totalAssets.toLocaleString("en-IN")} crore; source: ${BALANCE_SHEET_SOURCE}). ` +
      `The statutory Rule 7 figure still needs the auditor's net-worth certificate, because reserves here are not split into free and revaluation reserves. It is computed`
    : `${NETWORTH_FY} as an illustrative prototype figure — a filed balance sheet is loaded only for the top 50 companies. It is computed`;
  return (
    `Audited net worth for ${c.name} is stated at ₹${c.netWorth.toLocaleString("en-IN")} crore for ` +
    `${basis} the way section 2(57) of the Companies ` +
    `Act 2013 requires and the way Rule 7 of the Foreign Exchange Management (Overseas Investment) ` +
    `Rules 2022 reads it: paid-up share capital of about ₹${capital.toLocaleString("en-IN")} crore, ` +
    `plus all free reserves and securities premium of about ₹${reserves.toLocaleString("en-IN")} crore, ` +
    `less accumulated losses, less deferred revenue expenditure and miscellaneous expenditure not ` +
    `written off. Revaluation reserves, write-back of depreciation and amalgamation reserves are ` +
    `excluded, because they are book gains rather than money the company has actually earned or raised. ` +
    `In plain words: this is the company's own money — what shareholders put in plus what the business ` +
    `has kept — and nothing that only exists because an asset was revalued upwards. ` +
    `The Rule 7 ceiling for total financial commitment is 400% of that figure, so ` +
    `₹${c.ceiling.toLocaleString("en-IN")} crore, of which ₹${c.used.toLocaleString("en-IN")} crore is ` +
    `already committed, leaving ₹${(c.ceiling - c.used).toLocaleString("en-IN")} crore of headroom. ` +
    `If the audited accounts for the following financial year are adopted before the remittance is made, ` +
    `the rail re-reads the ceiling from the newer balance sheet automatically.`
  );
}
