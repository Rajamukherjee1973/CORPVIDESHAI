import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/rbi-odi-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        try {
          const { syncRbiOdi } = await import("@/lib/rbi-odi.server");
          return Response.json(await syncRbiOdi());
        } catch (e) {
          console.error("RBI ODI sync failed", e);
          return Response.json({ status: "error", note: e instanceof Error ? e.message : String(e) }, { status: 502 });
        }
      },
    },
  },
});
