import { COUNTRY_META } from "@/data/currencies";
import { RATE_SOURCE, ratesFromObservations, type PolicyRatesPayload } from "@/lib/forward-pricing";

const URL_ = "https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/D.?lastNObservations=1&format=csv";
const TTL_MS = 6 * 60 * 60 * 1000;
let cache: { at: number; payload: PolicyRatesPayload } | null = null;

/** Minimal RFC-4180 line splitter (BIS titles contain quoted commas). */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function areaMap(): Record<string, string> {
  const m: Record<string, string> = {};
  for (const meta of Object.values(COUNTRY_META)) if (meta.iso2 && meta.currency && meta.currency !== "EUR") m[meta.iso2] = meta.currency;
  for (const [a, c] of Object.entries({ GB: "GBP", JP: "JPY", CH: "CHF", AU: "AUD", CA: "CAD", CN: "CNY", HK: "HKD", KR: "KRW", ZA: "ZAR", BR: "BRL", MX: "MXN", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", NZ: "NZD", SA: "SAR", IL: "ILS", ID: "IDR", MY: "MYR", TH: "THB", CL: "CLP", CO: "COP", XM: "EUR", US: "USD", IN: "INR" })) m[a] = c;
  // GIFT IFSC entries list India with USD as unit currency; the RBI repo rate is always INR.
  return m;
}

export async function readPolicyRates(): Promise<PolicyRatesPayload> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.payload;
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(URL_, { signal: AbortSignal.timeout(15000), headers: { Accept: "text/csv" } });
    if (!res.ok) throw new Error(`BIS ${res.status}`);
    const lines = (await res.text()).split(/\r?\n/).filter(Boolean);
    const head = splitCsv(lines[0] ?? "");
    const ia = head.indexOf("REF_AREA"), id = head.indexOf("TIME_PERIOD"), iv = head.indexOf("OBS_VALUE");
    const rows = lines.slice(1).map(splitCsv).map((c) => ({ area: c[ia] ?? "", date: c[id] ?? "", value: Number(c[iv]) }));
    const rates = ratesFromObservations(rows, areaMap(), new Date());
    const payload: PolicyRatesPayload = { rates, source: RATE_SOURCE, fetchedAt, error: rates["INR"] ? null : "India's policy rate is unavailable from the source right now." };
    if (!payload.error) cache = { at: Date.now(), payload };
    return payload;
  } catch {
    return { rates: {}, source: RATE_SOURCE, fetchedAt, error: "Official interest rates are unavailable right now." };
  }
}
