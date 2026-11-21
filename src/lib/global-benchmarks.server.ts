import { GLOBAL_BENCHMARKS, INDIA_BENCHMARKS, parseBenchmarkQuote } from './global-benchmarks';

export async function fetchGlobalBenchmarks() {
  const quotes = await Promise.all([...GLOBAL_BENCHMARKS, ...INDIA_BENCHMARKS].map(async ({ symbol }) => {
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`, {
        headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return null;
      return parseBenchmarkQuote(symbol, await response.json());
    } catch { return null; }
  }));
  return { quotes: quotes.filter((q) => q !== null), fetchedAt: Date.now(), source: 'Yahoo Finance public chart feed' };
}