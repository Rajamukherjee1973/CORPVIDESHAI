import { createServerFn } from "@tanstack/react-start";
import { DEMO_DUPLICATE_WINDOW_MS, demoBookingSchema } from "./demo-booking";

export const bookDemo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => demoBookingSchema().parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - DEMO_DUPLICATE_WINDOW_MS).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("demo_requests")
      .select("reference")
      .eq("work_email", data.workEmail)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent) return { reference: recent.reference, duplicate: true };

    const { data: row, error } = await supabaseAdmin
      .from("demo_requests")
      .insert({
        full_name: data.fullName,
        work_email: data.workEmail,
        organisation: data.organisation,
        audience: data.audience,
        preferred_date: data.preferredDate,
        time_slot: data.timeSlot,
        focus: data.focus,
        message: data.message || null,
      })
      .select("reference")
      .single();
    if (error || !row) throw new Error("We could not save your request. Please try again in a moment.");
    const { sendDemoAlert } = await import("./demo-alert.server");
    await sendDemoAlert(data, row.reference);
    return { reference: row.reference, duplicate: false };
  });
