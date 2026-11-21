import { describe, expect, it } from 'vitest';
import { GLOBAL_BENCHMARKS, parseBenchmarkQuote } from '@/lib/global-benchmarks';

describe('Observed global benchmarks', () => {
  it('covers London, NYSE, Shanghai, Hong Kong and other benchmarks', () => {
    expect(GLOBAL_BENCHMARKS.map((b) => b.symbol)).toEqual(['^FTSE', '^NYA', '^GSPC', '^IXIC', '^DJI', '^GDAXI', '000001.SS', '^HSI', '^N225']);
  });
  it('computes prior-session change from observed values', () => {
    const quote = parseBenchmarkQuote('^FTSE', { chart: { result: [{ meta: { regularMarketPrice: 101, previousClose: 100, regularMarketTime: 1000, exchangeDataDelayedBy: 15 } }] } });
    expect(quote?.changePct).toBeCloseTo(1);
    expect(quote?.timestamp).toBe(1000000);
    expect(quote?.delayMinutes).toBe(15);
  });
  it('does not invent a flat change when previous close is unavailable', () => {
    expect(parseBenchmarkQuote('^NYA', { chart: { result: [{ meta: { regularMarketPrice: 100, regularMarketTime: 1000 } }] } })?.changePct).toBeNull();
  });
  it('rejects missing source timestamps and invalid levels', () => {
    expect(parseBenchmarkQuote('^NYA', { chart: { result: [{ meta: { regularMarketPrice: 100 } }] } })).toBeNull();
    expect(parseBenchmarkQuote('^NYA', { chart: { result: [{ meta: { regularMarketPrice: -1, regularMarketTime: 1000 } }] } })).toBeNull();
  });
  it('rejects future-dated provider observations', () => {
    expect(parseBenchmarkQuote('^NYA', { chart: { result: [{ meta: { regularMarketPrice: 100, regularMarketTime: (Date.now() + 120000) / 1000 } }] } })).toBeNull();
  });
});