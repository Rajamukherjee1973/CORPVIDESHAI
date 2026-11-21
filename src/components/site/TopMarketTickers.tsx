import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { readGlobalBenchmarks } from '@/lib/global-benchmarks.functions';

const TOP3 = [
  { symbol: '^BSESN', name: 'BSE Sensex', venue: 'Bombay Stock Exchange' },
  { symbol: '^NSEI', name: 'NIFTY 50', venue: 'National Stock Exchange' },
  { symbol: '^GSPC', name: 'S&P 500', venue: 'New York · US large caps' },
  { symbol: '^FTSE', name: 'FTSE 100', venue: 'London Stock Exchange' },
  { symbol: '000001.SS', name: 'SSE Composite', venue: 'Shanghai Stock Exchange' },
  { symbol: '^HSI', name: 'Hang Seng', venue: 'Hong Kong Stock Exchange' },
];

export function TopMarketTickers() {
  const read = useServerFn(readGlobalBenchmarks);
  const q = useQuery({ queryKey: ['global-benchmarks'], queryFn: () => read(), refetchInterval: 60000, staleTime: 30000, retry: 1 });
  const quotes = q.data?.quotes ?? [];
  return (
    <section aria-label="Top three market tickers" className="border-b-4 border-primary bg-foreground text-background">
      <div className="mx-auto grid max-w-[1400px] gap-px px-6 py-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-[auto_repeat(6,1fr)] sm:items-center">
        <div className="col-span-2 flex items-center justify-between pb-2 sm:col-span-3 xl:col-span-1 xl:block xl:pb-0 xl:pr-6">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">Live markets</p>
          <p className="flex items-center gap-2 font-mono-ui text-[10px] opacity-70"><span className="size-2 animate-pulse bg-primary motion-reduce:animate-none" />auto-refresh 60s</p>
        </div>
        {TOP3.map((b) => {
          const x = quotes.find((v) => v.symbol === b.symbol);
          const c = x?.changePct;
          const Icon = c == null || c === 0 ? Minus : c > 0 ? ArrowUpRight : ArrowDownRight;
          return (
            <div key={b.symbol} className="border-l border-t border-background/20 px-4 py-2 xl:border-t-0">
              <p className="font-mono-ui text-[10px] uppercase opacity-70">{b.venue}</p>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-display text-lg">{b.name}</span>
                <span className="tnum text-lg">{x ? x.price.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : q.isPending ? 'Loading…' : 'Unavailable'}</span>
                <span className={`tnum flex items-center text-sm ${c != null && c > 0 ? 'text-chart-2' : c != null && c < 0 ? 'text-primary' : 'opacity-70'}`}><Icon size={14} />{c == null ? '—' : `${c >= 0 ? '+' : ''}${c.toFixed(2)}%`}</span>
              </div>
              <p className="font-mono-ui text-[9px] opacity-60">{x ? `${new Date(x.timestamp).toISOString().slice(11, 16)} UTC · ${x.marketState === 'Not supplied' ? 'latest print' : x.marketState.toLowerCase()}` : 'No source print'}</p>
            </div>
          );
        })}
      </div>
      <p className="mx-auto max-w-[1400px] px-6 pb-2 text-[9px] opacity-60">Yahoo Finance public observations · indicative, possibly delayed; not licensed exchange data.</p>
    </section>
  );
}
