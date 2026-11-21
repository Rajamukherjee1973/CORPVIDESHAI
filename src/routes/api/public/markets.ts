import { createFileRoute } from "@tanstack/react-router";
import { MARKET_SYMBOLS } from "@/data/exchanges";

/**
 * Round-the-clock benchmark-index feed for the 52 hub stock markets. Quotes are
 * pulled from the public reference chart feed, cached briefly in the worker so
 * every viewer shares one upstream call, and served with the previous close so
 * the board can print a session move.
 */

type Quote = {
  symbol: string;
  price: number;
  prevClose: number;
  currency: string;
  venue: string;
  ts: number;
};

type Payload = { quotes: Record<string, Quote>; at: number };

let cache: Payload | null = null;
const TTL_MS = 30_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export const Route = createFileRoute("/api/public/markets")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        if (cache && Date.now() - cache.at < TTL_MS) {
          return Response.json(
            { ...cache, cached: true },
            { headers: { ...CORS, "cache-control": "no-store" } },
          );
        }

        const { pullMarketQuote } = await import("@/lib/market-quotes.server");
        const settled = await Promise.all(MARKET_SYMBOLS.map((s) => pullMarketQuote(s)));
        const quotes: Record<string, Quote> = {};
        for (const q of settled) if (q) quotes[q.symbol] = q;

        if (!Object.keys(quotes).length) {
          if (cache) {
            return Response.json(
              { ...cache, cached: true, stale: true },
              { headers: { ...CORS, "cache-control": "no-store" } },
            );
          }
          return new Response(JSON.stringify({ error: "no market feed available" }), {
            status: 503,
            headers: { ...CORS, "content-type": "application/json" },
          });
        }

        // Keep the last good print for any symbol that failed this round.
        cache = { quotes: { ...(cache?.quotes ?? {}), ...quotes }, at: Date.now() };
        return Response.json(
          { ...cache, cached: false },
          { headers: { ...CORS, "cache-control": "no-store" } },
        );
      },
    },
  },
});
