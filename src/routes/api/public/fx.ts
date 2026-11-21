import { createFileRoute } from "@tanstack/react-router";
import { getOfficial, getRates } from "@/lib/fx-sources";

/**
 * Round-the-clock USD-base FX feed for the London interbank and Indian market
 * tapes. Licensed terminal feeds (Bloomberg, Reuters/LSEG) are used first when
 * their credentials are present; public interbank composites keep the tape
 * printing otherwise. The RBI reference rate rides alongside as the official
 * Indian benchmark.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export const Route = createFileRoute("/api/public/fx")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const [res, official] = await Promise.all([getRates(), getOfficial()]);
        if (!res) {
          return new Response(JSON.stringify({ error: "no feed available" }), {
            status: 503,
            headers: { ...CORS, "content-type": "application/json" },
          });
        }
        return Response.json(
          {
            rates: res.payload.rates,
            source: res.payload.source,
            tier: res.payload.tier,
            stamp: res.payload.stamp,
            at: res.payload.at,
            cached: res.cached,
            stale: res.stale,
            official: official
              ? { inrPer: official.inrPer, source: official.source, stamp: official.stamp }
              : null,
          },
          { headers: { ...CORS, "cache-control": "no-store" } },
        );
      },
    },
  },
});
