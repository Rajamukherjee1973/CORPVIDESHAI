import { FBIL_SOURCE, curveFromRows, curveIsCurrent, type FbilPayload } from "@/lib/fbil-forward";

const URL_ = "https://www.fbil.org.in/wasdm/fwdpremia/fetch?authenticated=false";
const TTL_MS = 3 * 60 * 60 * 1000;
let cache: { at: number; payload: FbilPayload } | null = null;

/** Latest public FBIL USD/INR forward premia curve; fails visibly, never substitutes values. */
export async function readFbilForwardPremia(): Promise<FbilPayload> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.payload;
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(URL_, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json", Referer: "https://www.fbil.org.in/", "User-Agent": "Mozilla/5.0 (compatible; CorpVideshAI/1.0)" },
    });
    if (!res.ok) throw new Error(`FBIL ${res.status}`);
    const curve = curveFromRows(await res.json());
    if (!curve) return { curve: null, source: FBIL_SOURCE, fetchedAt, error: "FBIL returned no usable forward premia." };
    if (!curveIsCurrent(curve, fetchedAt.slice(0, 10))) return { curve: null, source: FBIL_SOURCE, fetchedAt, error: `FBIL's latest public premia (${curve.asOf}) are too old to use.` };
    const payload: FbilPayload = { curve, source: FBIL_SOURCE, fetchedAt, error: null };
    cache = { at: Date.now(), payload };
    return payload;
  } catch {
    return { curve: null, source: FBIL_SOURCE, fetchedAt, error: "FBIL forward premia are unavailable right now." };
  }
}
