import type { DemoBooking } from "./demo-booking";

/**
 * Owner inbox for new demo requests. Leave empty to store requests without emailing.
 * Set to the owner's address once confirmed (e.g. "name@corpvideshai.com").
 */
export const DEMO_ALERT_TO = "";

export async function sendDemoAlert(booking: DemoBooking, reference: string) {
  if (!DEMO_ALERT_TO) return { sent: false as const, reason: "no_recipient" as const };
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  try {
    return await sendTemplateEmail("demo-request-alert", DEMO_ALERT_TO, {
      templateData: { reference, ...booking, message: booking.message || undefined },
      idempotencyKey: `demo-request-alert-${reference}`,
      replyTo: booking.workEmail,
    });
  } catch (error) {
    // The request is already stored; an email failure must not lose or fail the booking.
    console.warn(JSON.stringify({ event: "demo-alert-failed", reference, code: (error as { code?: string })?.code ?? "unknown" }));
    return { sent: false as const, reason: "send_failed" as const };
  }
}
