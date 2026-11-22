/**
 * Bank forward rate sheet: the outright USD/INR forward buy/sell rates a bank
 * sends its corporate client each day, entered by an authorised rate desk.
 * Pure helpers only. Rates are scaled to live spot by the sheet's own spot mid,
 * so on the quote day at the sheet's spot they reproduce the bank's figures
 * exactly. A sheet is the bank's indicative quote for that day, not a dealt
 * trade; the dealer confirms the final rate when a contract is booked.
 */
import { z } from "zod";

/** A sheet older than this (calendar days, covers a long weekend) is not used. */
export const BANK_MAX_AGE_DAYS = 4;
/** How far past the last quoted tenor the sheet may be extended. */
export const BANK_EXTRAPOLATE_DAYS = 10;
export const BANK_TENORS = ["1M", "2M", "3M", "6M", "9M", "12M"] as const;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const utc = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Number.NaN;
};
const days = (a: string, b: string) => Math.round((utc(b) - utc(a)) / 86_400_000);

export type BankPoint = { tenor: string; settlementDate: string; bid: number; ask: number };
export type BankSheet = {
  id: string; bankName: string; quoteDate: string; spotDate: string; spotBid: number; spotAsk: number;
  points: (BankPoint & { days: number })[]; note: string; createdAt: string;
};

const rate = z.number().positive().max(10_000);
const pointSchema = z.object({
  tenor: z.string().regex(/^(?:[1-9]|1[0-2])M$/, "Tenor must be 1M to 12M."),
  settlementDate: z.string().regex(ISO),
  bid: rate,
  ask: rate,
});

export const saveBankSheetSchema = z.object({
  bankName: z.string().trim().min(2, "Enter the bank's name.").max(80),
  quoteDate: z.string().regex(ISO, "Enter the quote date."),
  spotDate: z.string().regex(ISO, "Enter the spot date."),
  spotBid: rate,
  spotAsk: rate,
  points: z.array(pointSchema).min(1, "Enter at least one forward tenor.").max(12),
  note: z.string().trim().max(280).default(""),
}).superRefine((s, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  const lag = days(s.quoteDate, s.spotDate);
  if (!(lag >= 0 && lag <= 5)) fail("The spot date must be 0 to 5 days after the quote date.");
  if (s.spotAsk < s.spotBid) fail("The spot sell rate can't be below the spot buy rate.");
  const mid = (s.spotBid + s.spotAsk) / 2;
  if (s.spotAsk / s.spotBid - 1 > 0.02) fail("The spot buy/sell gap is over 2% — please check the figures.");
  const seen = new Set<string>();
  let lastDays = 0;
  for (const p of s.points) {
    if (seen.has(p.tenor)) fail(`${p.tenor} is entered twice.`);
    seen.add(p.tenor);
    if (p.ask < p.bid) fail(`${p.tenor}: the sell rate can't be below the buy rate.`);
    if (Math.abs(p.bid / mid - 1) > 0.25 || Math.abs(p.ask / mid - 1) > 0.25) fail(`${p.tenor}: the rate is more than 25% away from spot — please check it.`);
    const d = days(s.spotDate, p.settlementDate);
    if (!(d > lastDays)) fail(`${p.tenor}: settlement dates must be after the spot date and in increasing order.`);
    if (d > 400) fail(`${p.tenor}: settlement is more than 13 months after spot.`);
    lastDays = d;
  }
});
export type SaveBankSheetInput = z.input<typeof saveBankSheetSchema>;
export type SaveBankSheetData = z.output<typeof saveBankSheetSchema>;

export type BankSheetRow = {
  id: string; bank_name: string; quote_date: string; spot_date: string; spot_bid: number | string; spot_ask: number | string;
  points: unknown; note: string; created_at: string;
};

/** A stored row as a usable sheet; invalid points are dropped and an unusable sheet is null. */
export function sheetFromRow(r: BankSheetRow): BankSheet | null {
  const spotBid = Number(r.spot_bid), spotAsk = Number(r.spot_ask);
  if (!(spotBid > 0) || !(spotAsk >= spotBid) || !ISO.test(r.spot_date) || !ISO.test(r.quote_date)) return null;
  const raw = Array.isArray(r.points) ? r.points : [];
  const points = raw.flatMap((p) => {
    const v = pointSchema.safeParse(p);
    if (!v.success || v.data.ask < v.data.bid) return [];
    const d = days(r.spot_date, v.data.settlementDate);
    return d > 0 ? [{ ...v.data, days: d }] : [];
  }).sort((a, b) => a.days - b.days);
  if (!points.length) return null;
  return { id: r.id, bankName: r.bank_name, quoteDate: r.quote_date, spotDate: r.spot_date, spotBid, spotAsk, points, note: r.note ?? "", createdAt: r.created_at };
}

export const sheetAgeDays = (s: Pick<BankSheet, "quoteDate">, today: string) => days(s.quoteDate, today);
export function sheetIsCurrent(s: Pick<BankSheet, "quoteDate">, today: string): boolean {
  const a = sheetAgeDays(s, today);
  return Number.isFinite(a) && a >= 0 && a <= BANK_MAX_AGE_DAYS;
}

/** Newest usable sheet: latest quote date, then latest entry (a correction replaces the earlier one). */
export function latestSheet(rows: BankSheetRow[]): BankSheet | null {
  const sheets = rows.map(sheetFromRow).filter((s): s is BankSheet => s !== null);
  sheets.sort((a, b) => (a.quoteDate === b.quoteDate ? b.createdAt.localeCompare(a.createdAt) : b.quoteDate.localeCompare(a.quoteDate)));
  return sheets[0] ?? null;
}

export const sheetMid = (s: Pick<BankSheet, "spotBid" | "spotAsk">) => (s.spotBid + s.spotAsk) / 2;

/**
 * Bank buy (bid), sell (ask) and mid forward for `d` days, scaled to live spot.
 * Linear between the spot point and quoted tenors; past the last tenor the last
 * segment's slope is carried for up to BANK_EXTRAPOLATE_DAYS, then null.
 */
export function bankForwardFor(s: BankSheet, liveSpot: number, d: number): { bid: number; ask: number; mid: number } | null {
  const last = s.points.at(-1);
  if (!last || !(liveSpot > 0) || !(d > 0) || d > last.days + BANK_EXTRAPOLATE_DAYS) return null;
  const m0 = sheetMid(s);
  const nodes = [{ days: 0, bid: s.spotBid / m0, ask: s.spotAsk / m0 }, ...s.points.map((p) => ({ days: p.days, bid: p.bid / m0, ask: p.ask / m0 }))];
  let i = nodes.findIndex((n, k) => k > 0 && d <= n.days);
  if (i < 0) i = nodes.length - 1;
  const a = nodes[i - 1]!, b = nodes[i]!;
  const t = (d - a.days) / (b.days - a.days);
  const bid = liveSpot * (a.bid + t * (b.bid - a.bid));
  const ask = liveSpot * (a.ask + t * (b.ask - a.ask));
  return { bid, ask, mid: (bid + ask) / 2 };
}

/** Default settlement date `months` after the spot date (same day of month, clamped). */
export function addMonths(iso: string, months: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const y = Number(m[1]), mo = Number(m[2]) - 1 + months, dd = Number(m[3]);
  const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, mo, Math.min(dd, lastDay))).toISOString().slice(0, 10);
}

/** Lines such as "3M 94.12 94.18" or "6M,94.80,94.88" pasted from the bank's email. */
export function parsePastedTenors(text: string): Record<string, { bid: number; ask: number }> {
  const out: Record<string, { bid: number; ask: number }> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(1[0-2]|[1-9])\s*M(?:onths?)?\b[^\d]*?(\d+(?:\.\d+)?)[\s,;/|-]+(\d+(?:\.\d+)?)/i.exec(line);
    if (!m) continue;
    const bid = Number(m[2]), ask = Number(m[3]);
    if (bid > 0 && ask > 0) out[`${m[1]}M`] = { bid: Math.min(bid, ask), ask: Math.max(bid, ask) };
  }
  return out;
}
