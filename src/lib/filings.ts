import type { RbiFlow } from "@/lib/frontier";

export type Filing = { form: string; part: "equity" | "loan" | "guarantee" | "annual"; usdMn: number; due: string; basis: string };
export type CompanyFilings = { party: string; rows: RbiFlow[]; totalUsdMn: number; countries: string[]; filings: Filing[] };

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Last calendar day of the reporting month, e.g. "August 2026" → 2026-08-31. */
export function monthEnd(period: string): Date {
  const start = new Date(`1 ${period} UTC`);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
}

/** Form FC is due within 30 days of the commitment; RBI publishes only the month, so we use the latest possible date. */
export function formFcDue(period: string): string {
  const d = monthEnd(period);
  d.setUTCDate(d.getUTCDate() + 30);
  return iso(d);
}

/** Annual Performance Report is due by 31 December each year for every overseas entity. */
export function aprDue(period: string): string {
  return `${monthEnd(period).getUTCFullYear()}-12-31`;
}

export function filingsFor(r: RbiFlow, period: string): Filing[] {
  const due = formFcDue(period);
  const out: Filing[] = [];
  if (r.equity > 0) out.push({ form: "Form FC — equity", part: "equity", usdMn: r.equity, due, basis: "OI Directions 2022, para 3 (Form FC within 30 days)" });
  if (r.loan > 0) out.push({ form: "Form FC — debt", part: "loan", usdMn: r.loan, due, basis: "OI Rules 2022, Sch. I; OI Directions para 3" });
  if (r.guarantee > 0) out.push({ form: "Form FC — guarantee", part: "guarantee", usdMn: r.guarantee, due, basis: "OI Rules 2022, Sch. I para 1(4); OI Directions para 3" });
  out.push({ form: "Annual Performance Report", part: "annual", usdMn: 0, due: aprDue(period), basis: "OI Regulations 2022, reg. 10(4)" });
  return out;
}

export function groupByCompany(rows: RbiFlow[], period: string): CompanyFilings[] {
  const map = new Map<string, RbiFlow[]>();
  for (const r of rows) map.set(r.party, [...(map.get(r.party) ?? []), r]);
  return [...map].map(([party, rs]) => ({
    party,
    rows: rs,
    totalUsdMn: Math.round(rs.reduce((s, r) => s + r.total, 0) * 100) / 100,
    countries: [...new Set(rs.map((r) => r.country))],
    filings: rs.flatMap((r) => filingsFor(r, period)),
  })).sort((a, b) => b.totalUsdMn - a.totalUsdMn);
}
