/**
 * RBI monthly Overseas Direct Investment (OFDI) release — pure parsing helpers
 * shared by the monthly auto-load job and tests.
 */
import type { RbiFlow } from "@/lib/frontier";

export const RBI_LIST_URL = "https://www.rbi.org.in/Scripts/Data_Overseas_Investment.aspx";

/** Latest "Overseas Direct Investment for <Month YYYY>" link on RBI's list page. */
export function findLatestRelease(html: string): { period: string; prid: string } | null {
  const m = /href=['"]?BS_PressReleaseDisplay\.aspx\?prid=(\d+)['"]?>\s*Overseas Direct Investment for ([A-Za-z]+ \d{4})/i.exec(html);
  return m ? { prid: m[1]!, period: m[2]! } : null;
}

/** OFDI spreadsheet link on a release page. */
export function findOfdiFile(html: string): string | null {
  const m = /https?:\/\/rbidocs\.rbi\.org\.in\/[^"'\s>]*OFDI[^"'\s>]*\.xlsx/i.exec(html);
  return m ? m[0] : null;
}

/** An .xlsx is a zip file: it starts with "PK". RBI's bot check returns HTML instead. */
export function isXlsx(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** Turn the Annex 2 sheet (array of rows) into scored-ready flows. */
export function parseOfdiMatrix(matrix: unknown[][]): RbiFlow[] {
  const base = matrix
    .filter((r) => r && Number.isFinite(Number(r[0])) && String(r[0]).trim() !== "" && r[1])
    .map((r) => ({
      party: String(r[1]).trim(),
      jv: String(r[2] ?? "").trim(),
      kind: String(r[3] ?? "").trim(),
      country: title(String(r[4] ?? "").trim()),
      activity: (() => { const a = String(r[5] ?? "").trim().toLowerCase(); return a.charAt(0).toUpperCase() + a.slice(1); })(),
      equity: num(r[6]),
      loan: num(r[7]),
      guarantee: num(r[8]),
      total: num(r[9]),
    }));
  const partyCount = new Map<string, number>();
  const partyTotal = new Map<string, number>();
  const jvParties = new Map<string, Set<string>>();
  for (const f of base) {
    partyCount.set(f.party, (partyCount.get(f.party) ?? 0) + 1);
    partyTotal.set(f.party, (partyTotal.get(f.party) ?? 0) + f.total);
    const k = f.jv.toUpperCase();
    if (!jvParties.has(k)) jvParties.set(k, new Set());
    jvParties.get(k)!.add(f.party);
  }
  return base.map((f) => ({
    ...f,
    partyCount: partyCount.get(f.party)!,
    partyTotal: Math.round(partyTotal.get(f.party)! * 10000) / 10000,
    sharedJv: jvParties.get(f.jv.toUpperCase())!.size,
  }));
}

/** Keep the rows the radar shows: $1m+, or linked by party or overseas entity. */
export function keepForRadar(rows: RbiFlow[]): RbiFlow[] {
  return rows.filter((r) => r.total >= 1 || r.sharedJv > 1 || r.partyCount >= 4).sort((a, b) => b.total - a.total);
}
