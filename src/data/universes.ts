// Three selectable dropdown universes for the corporate desk:
// NSE-listed, BSE-listed and unlisted-by-turnover.
import { COMPANIES, type Company } from "./companies";
import { UNLISTED } from "./unlisted";

export type UniverseKey = "NSE" | "BSE" | "UNLISTED";

const nse = COMPANIES.filter((c) => c.exchange.includes("NSE"))
  .slice(0, 500)
  .map((c, i) => ({ ...c, rank: i + 1 }));
const bse = COMPANIES.filter((c) => c.exchange.includes("BSE"))
  .slice(0, 500)
  .map((c, i) => ({ ...c, rank: i + 1 }));

export const UNIVERSES: Record<UniverseKey, { label: string; basis: string; list: Company[] }> = {
  NSE: {
    label: "Top listed companies — National Stock Exchange (NSE)",
    basis: "Ranked by audited net worth; Rule 7 ceiling is 400% of that net worth.",
    list: nse,
  },
  BSE: {
    label: "Top listed companies — Bombay Stock Exchange (BSE)",
    basis: "Ranked by audited net worth; Rule 7 ceiling is 400% of that net worth.",
    list: bse,
  },
  UNLISTED: {
    label: "Top unlisted companies — ranked by annual turnover",
    basis: "Ranked by turnover; the Rule 7 ceiling still runs off audited net worth.",
    list: UNLISTED,
  },
};

export const UNIVERSE_KEYS: UniverseKey[] = ["NSE", "BSE", "UNLISTED"];

export function findCompany(name: string): Company | undefined {
  return UNIVERSE_KEYS.map((k) => UNIVERSES[k].list.find((c) => c.name === name)).find(Boolean);
}