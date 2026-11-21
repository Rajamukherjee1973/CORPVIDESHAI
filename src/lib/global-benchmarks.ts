export const GLOBAL_BENCHMARKS = [
  { symbol: "^FTSE", name: "FTSE 100", venue: "London Stock Exchange", region: "United Kingdom", note: "UK large-cap benchmark; not all LSE listings." },
  { symbol: "^NYA", name: "NYSE Composite", venue: "New York Stock Exchange", region: "United States", note: "Broad benchmark of NYSE-listed equities." },
  { symbol: "^GSPC", name: "S&P 500", venue: "US large caps", region: "United States", note: "Large US companies across exchanges; not an NYSE-only index." },
  { symbol: "^IXIC", name: "Nasdaq Composite", venue: "Nasdaq", region: "United States", note: "Nasdaq-listed equities; technology-heavy exposure." },
  { symbol: "^DJI", name: "Dow Jones", venue: "US blue chips", region: "United States", note: "Price-weighted basket of 30 major US companies." },
  { symbol: "^GDAXI", name: "DAX", venue: "Xetra / Frankfurt", region: "Germany", note: "German large caps; performance-index returns include dividends." },
  { symbol: "000001.SS", name: "SSE Composite", venue: "Shanghai Stock Exchange", region: "China", note: "All A- and B-shares listed in Shanghai." },
  { symbol: "^HSI", name: "Hang Seng", venue: "Hong Kong Stock Exchange", region: "Hong Kong SAR", note: "Largest companies listed on HKEX." },
  { symbol: "^N225", name: "Nikkei 225", venue: "Tokyo Stock Exchange", region: "Japan", note: "Price-weighted basket of 225 Japanese companies." },
] as const;

export const INDIA_BENCHMARKS = [
  { symbol: "^BSESN", name: "BSE Sensex", venue: "BSE · Mumbai", region: "India", note: "30 large BSE-listed companies." },
  { symbol: "^NSEI", name: "NIFTY 50", venue: "NSE · Mumbai", region: "India", note: "50 large NSE-listed companies." },
] as const;

export type BenchmarkQuote = { symbol: string; price: number; previousClose: number | null; changePct: number | null; timestamp: number; delayMinutes: number | null; marketState: string };

export function parseBenchmarkQuote(symbol: string, raw: unknown): BenchmarkQuote | null {
  const data = raw as { chart?: { result?: { meta?: Record<string, unknown> }[] } } | null;
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const price = Number(meta['regularMarketPrice']);
  const timestamp = Number(meta['regularMarketTime']) * 1000;
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(timestamp) || timestamp <= 0) return null;
  if (timestamp > Date.now() + 60000) return null;
  // This parser is used with range=1d: chartPreviousClose is the prior session,
  // not the start of a multi-day chart window.
  const previous = Number(meta['previousClose'] ?? meta['chartPreviousClose']);
  const previousClose = Number.isFinite(previous) && previous > 0 ? previous : null;
  const delay = meta['exchangeDataDelayedBy'];
  return { symbol, price, timestamp, previousClose,
    changePct: previousClose ? (price / previousClose - 1) * 100 : null,
    delayMinutes: typeof delay === 'number' && Number.isFinite(delay) ? delay : null,
    marketState: typeof meta['marketState'] === 'string' ? meta['marketState'] : 'Not supplied' };
}