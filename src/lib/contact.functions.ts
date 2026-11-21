import { createServerFn } from "@tanstack/react-start";
import { CONTACT_DUPLICATE_WINDOW_MS, contactMessageSchema } from "./contact";

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactMessageSchema().parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - CONTACT_DUPLICATE_WINDOW_MS).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("contact_messages")
      .select("reference")
      .eq("work_email", data.workEmail)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent) return { reference: recent.reference, duplicate: true };

    const { data: row, error } = await supabaseAdmin
      .from("contact_messages")
      .insert({
        full_name: data.fullName,
        work_email: data.workEmail,
        organisation: data.organisation || null,
        audience: data.audience,
        topic: data.topic,
        message: data.message,
      })
      .select("reference")
      .single();
    if (error || !row) throw new Error("We could not save your message. Please try again in a moment.");
    const { sendContactAlert } = await import("./contact-alert.server");
    await sendContactAlert(data, row.reference);
    return { reference: row.reference, duplicate: false };
  });
