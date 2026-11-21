/** Treaty ceilings are conditional reference rates, not a chargeability determination. */
export type LedgerIncome = "capital" | "interest" | "royalty" | "equipment" | "unknown";
export const TREATY_SOURCE = "https://incometaxindia.gov.in/Pages/International-Taxation/DTAA.aspx";
export const LEDGER_INCOME_LABELS: Record<LedgerIncome, string> = {
  capital: "ODI / OPI investment principal",
  interest: "Chargeable interest — general treaty category",
  royalty: "Chargeable IP royalty — general treaty category",
  equipment: "Chargeable equipment royalty",
  unknown: "Unclassified captured payment — review required",
};

export type LedgerTaxInput = { income: LedgerIncome; taxableCr: number; treatyEligible: boolean };

// Deliberately bounded coverage: uncatalogued countries never inherit a generic hub rate.
const RATES: Record<string, { interest: number; royalty: number; equipment: number; article: string; source: string }> = {
  Singapore: { interest: 15, royalty: 10, equipment: 10, article: "Articles 11 / 12, first protocol Article 4; qualifying bank interest may be 10%", source: "https://www.iras.gov.sg/docs/default-source/dtas/protocol-amending-singapore-india-dta-(ratified)(mli)(1-oct-2019).pdf?sfvrsn=dd28a790_7" },
  "United Kingdom": { interest: 15, royalty: 15, equipment: 10, article: "Articles 12 / 13; qualifying bank interest may be 10%", source: "https://assets.publishing.service.gov.uk/media/5b853e67e5274a4a8fbf169d/1993_India_-_UK_Double_Taxation_Agreement__as_amended_in_2013_-_in_force.pdf" },
  "United States": { interest: 15, royalty: 15, equipment: 10, article: "Articles 11 / 12; qualifying bank interest may be 10%", source: "https://www.irs.gov/pub/irs-trty/india.pdf" },
};

export function ledgerTax(country: string, principalCr: number, input?: LedgerTaxInput) {
  const income = input?.income ?? "capital";
  const reference = RATES[country];
  const referencePct = income === "capital" || income === "unknown" ? null : reference?.[income] ?? null;
  const taxableCr = income === "capital" ? 0 : Math.min(Math.max(0, input?.taxableCr ?? 0), Math.max(0, principalCr));
  const priced = income === "capital" || (taxableCr > 0 && input?.treatyEligible === true && referencePct !== null);
  return {
    income, taxableCr, referencePct, priced,
    appliedPct: income === "capital" ? 0 : priced ? referencePct : null,
    withholdingInr: priced && referencePct !== null ? taxableCr * 1e7 * referencePct / 100 : 0,
    basis: income === "capital" ? "Investment principal: no generic Section 195 deduction; separate chargeability review required."
      : !reference ? "Country/category not catalogued — tax review required."
      : !input?.treatyEligible ? "Treaty entitlement not confirmed — domestic-law / treaty review required."
      : taxableCr <= 0 ? "Enter the separately identified chargeable income component."
      : `Conditional treaty ceiling · ${reference.article}`,
    source: reference?.source ?? TREATY_SOURCE,
  };
}