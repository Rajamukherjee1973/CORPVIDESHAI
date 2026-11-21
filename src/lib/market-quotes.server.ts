import { MARKET_SYMBOLS } from "@/data/exchanges";

export type MarketQuote = { symbol: string; price: number; prevClose: number; currency: string; venue: string; ts: number };

export async function pullMarketQuote(symbol: string): Promise<MarketQuote | null> {
  if (!MARKET_SYMBOLS.includes(symbol)) return null;
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`, {
      headers: { "user-agent": "Mozilla/5.0 (CorpVidesh market board)" },
    });
    if (!response.ok) return null;
    const data = await response.json() as { chart?: { result?: { meta?: Record<string, unknown> }[] } };
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = Number(meta["regularMarketPrice"]);
    const prev = Number(meta["chartPreviousClose"] ?? meta["previousClose"] ?? price);
    if (!Number.isFinite(price) || price <= 0) return null;
    return { symbol, price, prevClose: Number.isFinite(prev) && prev > 0 ? prev : price,
      currency: String(meta["currency"] ?? ""), venue: String(meta["fullExchangeName"] ?? meta["exchangeName"] ?? ""), ts: Number(meta["regularMarketTime"] ?? 0) * 1000 };
  } catch { return null; }
}