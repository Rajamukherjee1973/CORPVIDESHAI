import { z } from "zod";
import { FX_RISK_METHOD, FX_RISK_SOURCE, measureFromSnapshots, snapshotDates, type FxRiskPayload } from "@/lib/fx-risk";

const Snapshot = z.object({ inr: z.record(z.string(), z.number()) });
const TTL_MS = 60 * 60 * 1000;
let cache: { at: number; snaps: { date: string; perInr: Record<string, number> }[] } | null = null;

async function fetchSnapshot(date: string) {
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/inr.min.json`,
    `https://${date}.currency-api.pages.dev/v1/currencies/inr.min.json`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const parsed = Snapshot.safeParse(await res.json());
      if (parsed.success) return { date, perInr: parsed.data.inr };
    } catch { /* try the mirror */ }
  }
  return null;
}

/** Fetch snapshots six at a time (runtime outbound limit), newest day first tolerated as missing. */
async function loadSnapshots() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.snaps;
  const end = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dates = snapshotDates(end);
  const snaps: { date: string; perInr: Record<string, number> }[] = [];
  for (let k = 0; k < dates.length; k += 6) {
    const chunk = await Promise.all(dates.slice(k, k + 6).map(fetchSnapshot));
    for (const s of chunk) if (s) snaps.push(s);
  }
  if (snaps.length >= 27) cache = { at: Date.now(), snaps };
  return snaps;
}

export async function readFxRisk(codes: string[]): Promise<FxRiskPayload> {
  const fetchedAt = new Date().toISOString();
  const base = { source: FX_RISK_SOURCE, method: FX_RISK_METHOD, fetchedAt };
  try {
    const snaps = await loadSnapshots();
    const { vols, missing } = measureFromSnapshots(codes, snaps);
    const asOf = snaps.reduce<string | null>((m, s) => (m === null || s.date > m ? s.date : m), null);
    return { ...base, vols, missing, asOf, error: Object.keys(vols).length === 0 ? "Measured exchange-rate history is unavailable right now." : null };
  } catch {
    return { ...base, vols: {}, missing: codes, asOf: null, error: "Measured exchange-rate history is unavailable right now." };
  }
}
