import { createFileRoute } from "@tanstack/react-router";
import { getOfficial } from "@/lib/fx-sources";

/**
 * The Reserve Bank of India reference rate — the official onshore benchmark an
 * AD Category-I bank prices against and a FIRMS filing is read against.
 * Published daily; cached for 30 minutes.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export const Route = createFileRoute("/api/public/rbi")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const o = await getOfficial();
        if (!o) {
          return new Response(JSON.stringify({ error: "reference rate unavailable" }), {
            status: 503,
            headers: { ...CORS, "content-type": "application/json" },
          });
        }
        return Response.json(o, { headers: { ...CORS, "cache-control": "no-store" } });
      },
    },
  },
});
