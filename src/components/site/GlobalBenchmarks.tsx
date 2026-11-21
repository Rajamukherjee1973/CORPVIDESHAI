import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { ArrowDownRight, ArrowUpRight, ArrowRight, RefreshCw, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GLOBAL_BENCHMARKS } from '@/lib/global-benchmarks';
import { readGlobalBenchmarks } from '@/lib/global-benchmarks.functions';

export function GlobalBenchmarks() {
  const read = useServerFn(readGlobalBenchmarks);
  const query = useQuery({ queryKey: ['global-benchmarks'], queryFn: () => read(), refetchInterval: 60000, staleTime: 30000, retry: 1 });
  const [selected, setSelected] = useState<string>('^FTSE');
  const quotes = (query.data?.quotes ?? []).filter((q) => GLOBAL_BENCHMARKS.some((b) => b.symbol === q.symbol));
  const selectedBenchmark = GLOBAL_BENCHMARKS.find((b) => b.symbol === selected);
  const comparable = quotes.filter((q) => q.changePct !== null);
  const rising = comparable.filter((q) => (q.changePct ?? 0) > 0).length;
  const falling = comparable.filter((q) => (q.changePct ?? 0) < 0).length;
  return <section aria-label="Global equity benchmarks" className="border-b border-rule/20 bg-background">
    <div className="mx-auto max-w-[1400px] px-6 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-mono-ui text-[10px] uppercase text-primary">Global market pulse · auto-refresh 60s</p><h2 className="font-display mt-1 text-2xl">London · New York · Shanghai · Hong Kong · global benchmarks</h2></div>
        <Button variant="outline" size="icon" title="Refresh global benchmarks" aria-label="Refresh global benchmarks" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} /></Button>
      </div>
      <div className="grid grid-cols-2 gap-px border border-rule/15 bg-rule/15 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9">
        {GLOBAL_BENCHMARKS.map((b) => {
          const q = quotes.find((v) => v.symbol === b.symbol);
          const change = q?.changePct;
          const Icon = change == null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
          return <Button key={b.symbol} variant="ghost" aria-pressed={selected === b.symbol} onClick={() => setSelected(b.symbol)} className={`block h-auto min-h-[140px] min-w-0 whitespace-normal rounded-none bg-background px-3 py-3 text-left ${selected === b.symbol ? 'border-t-2 border-primary bg-secondary' : 'border-t-2 border-transparent'}`}>
            <span className="block min-h-8 text-[10px] leading-tight text-muted-foreground">{b.venue}</span>
            <span className="font-display block text-xl">{b.name}</span>
            <span className="tnum mt-2 block text-lg">{q ? q.price.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : query.isPending ? 'Loading…' : 'Unavailable'}</span>
            <span className={`tnum mt-1 flex items-center gap-1 text-xs ${change != null && change > 0 ? 'text-chart-2' : change != null && change < 0 ? 'text-destructive' : 'text-muted-foreground'}`}><Icon size={14} />{change == null ? 'Change unavailable' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}% vs prior close`}</span>
            <span className="font-mono-ui mt-2 block text-[9px] text-muted-foreground">{q ? new Date(q.timestamp).toISOString().replace('T', ' ').slice(0,16) + ' UTC' : 'No source print'}</span>
          </Button>;
        })}
      </div>
      <div className="mt-3 grid gap-3 text-xs md:grid-cols-[1fr_auto]">
        <div><p><span className="font-medium">Latest-session breadth:</span> {rising} rising / {falling} falling · {comparable.length}/{GLOBAL_BENCHMARKS.length} comparable. Sessions differ; this is not a synchronized global return.</p>
        <p className="mt-2 text-muted-foreground">{selectedBenchmark?.name} · {selectedBenchmark?.note} {quotes.find((q) => q.symbol === selected)?.delayMinutes != null ? `Provider delay: ${quotes.find((q) => q.symbol === selected)?.delayMinutes} min.` : 'Delay not specified by provider.'}</p></div>
        <Button asChild variant="outline" size="sm"><Link to="/markets">Compare 52 hub markets <ArrowRight /></Link></Button>
      </div>
      {query.isError && <p role="alert" className="mt-3 text-xs text-destructive">Refresh failed. Any retained quotes keep their original timestamps; retry above.</p>}
      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Yahoo Finance public observations · indicative and potentially delayed, not licensed exchange-direct streaming. Closed markets show their latest session. Index points are not currency prices; percentage moves do not include INR FX effects. No synthetic ticks or investment recommendations.</p>
    </div>
  </section>;
}