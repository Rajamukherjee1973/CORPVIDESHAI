import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Daily scheduled job: records one profit/loss mark per live saved forward so investor history builds without a visit. */
export const Route = createFileRoute("/api/public/jobs/hedge-marks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        try {
          const today = new Date().toISOString().slice(0, 10);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { markHedgeRows } = await import("@/lib/saved-forwards.server");
          const { data, error } = await supabaseAdmin.from("hedge_contracts")
            .select("id,user_id,ref,code,side,notional,trade_date,maturity_date,margin_bp,rate,fair_at_trade,spot_at_trade,rate_overridden,booked_at")
            .lte("trade_date", today).gte("maturity_date", today).limit(5000);
          if (error) throw new Error(error.message);
          return Response.json(await markHedgeRows(supabaseAdmin, (data ?? []) as never, today));
        } catch (e) {
          console.error("Hedge marks job failed", e);
          return Response.json({ status: "error" }, { status: 502 });
        }
      },
    },
  },
});
