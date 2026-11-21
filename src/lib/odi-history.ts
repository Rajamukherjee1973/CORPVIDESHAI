import { ODI_HISTORY, ODI_SECTORS, ODI_SOURCES, type OdiYear, type SectorKey } from "@/data/odi-sector-history";

export type OdiUnit = "inr" | "usd";

/** US$ million at a ₹/US$ rate → ₹ crore (1 crore = 10 million). */
export const toCrore = (usdMn: number, inrPerUsd: number) => (usdMn * inrPerUsd) / 10;

export const amountIn = (y: OdiYear, usdMn: number, unit: OdiUnit) => (unit === "usd" ? usdMn : toCrore(usdMn, y.inrPerUsd));

export const totalIn = (y: OdiYear, unit: OdiUnit) => amountIn(y, y.usdMn, unit);

export const sectorSum = (y: OdiYear) => (y.sectors ? ODI_SECTORS.reduce((a, s) => a + y.sectors![s.key], 0) : null);

/** Sector shares in % of the year's published sector rows (adds up to 100). */
export function sectorShares(y: OdiYear): Record<SectorKey, number> | null {
  const sum = sectorSum(y);
  if (!y.sectors || !sum) return null;
  return Object.fromEntries(ODI_SECTORS.map((s) => [s.key, (y.sectors![s.key] / sum) * 100])) as Record<SectorKey, number>;
}

export const cagr = (first: number, last: number, periods: number) => (first > 0 && periods > 0 ? (last / first) ** (1 / periods) - 1 : 0);

export const sectorYears = () => ODI_HISTORY.filter((y) => y.sectors);

export function fmtAmount(v: number, unit: OdiUnit): string {
  if (unit === "usd") return v >= 1000 ? `US$${(v / 1000).toFixed(1)} bn` : `US$${Math.round(v).toLocaleString("en-IN")} mn`;
  return v >= 100000 ? `₹${(v / 100000).toFixed(2)} lakh crore` : `₹${Math.round(v).toLocaleString("en-IN")} crore`;
}

export function fmtAxis(v: number, unit: OdiUnit): string {
  if (unit === "usd") return v === 0 ? "0" : `$${(v / 1000).toFixed(v % 1000 ? 1 : 0)}bn`;
  if (v === 0) return "0";
  return v >= 100000 ? `₹${(v / 100000).toFixed(1)}L cr` : `₹${Math.round(v / 1000)}k cr`;
}

/** Round an axis maximum up to a clean step (1–10 × 10ⁿ) for `ticks` gridlines. */
export function niceMax(max: number, ticks = 5): number {
  if (max <= 0) return 1;
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * mag).find((m) => m >= raw)!;
  return step * ticks;
}

export const fyShort = (fy: string) => `FY${fy.slice(5)}`;

export function odiCsv(): string {
  const head = ["financial_year", "actual_odi_outflow_usd_mn", "inr_per_usd_fy_avg", "actual_odi_outflow_inr_crore", ...ODI_SECTORS.map((s) => `${s.key}_usd_mn`), "source", "source_url"];
  const rows = ODI_HISTORY.map((y) => [
    y.fy,
    y.usdMn.toFixed(2),
    y.inrPerUsd.toFixed(4),
    toCrore(y.usdMn, y.inrPerUsd).toFixed(2),
    ...ODI_SECTORS.map((s) => (y.sectors ? y.sectors[s.key].toFixed(2) : "")),
    `"${ODI_SOURCES[y.source].label.replace(/"/g, "'")}"`,
    ODI_SOURCES[y.source].url,
  ]);
  return [head.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
