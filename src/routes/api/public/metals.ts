import { createFileRoute } from "@tanstack/react-router";

/**
 * Public precious-metals spot feed (USD per troy ounce). Cached for 20 seconds
 * per worker so the desk polling never hammers the upstream composite.
 * This is a public spot composite — not the LBMA auction benchmark.
 */
const METALS = ["XAU", "XAG", "XPT", "XPD"] as const;
let cache: { at: number; body: unknown } | null = null;

export const Route = createFileRoute("/api/public/metals")({
  server: {
    handlers: {
      GET: async () => {
        if (cache && Date.now() - cache.at < 20_000) {
          return Response.json(cache.body, { headers: { "cache-control": "no-store" } });
        }
        const rows = await Promise.all(
          METALS.map(async (m) => {
            try {
              const r = await fetch(`https://api.gold-api.com/price/${m}`, {
                signal: AbortSignal.timeout(6000),
              });
              if (!r.ok) return null;
              const j = (await r.json()) as { price?: number; updatedAt?: string };
              if (typeof j.price !== "number" || !(j.price > 0)) return null;
              return { symbol: m, usdPerOz: j.price, updatedAt: j.updatedAt ?? null };
            } catch {
              return null;
            }
          }),
        );
        const metals = rows.filter(Boolean);
        if (metals.length === 0) {
          if (cache) {
            return Response.json({ ...(cache.body as object), stale: true }, { headers: { "cache-control": "no-store" } });
          }
          return Response.json({ error: "metals feed unavailable" }, { status: 503 });
        }
        const body = { metals, source: "gold-api.com spot composite", at: new Date().toISOString(), stale: false };
        cache = { at: Date.now(), body };
        return Response.json(body, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
