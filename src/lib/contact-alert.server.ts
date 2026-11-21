import type { ContactMessage } from "./contact";

/**
 * Owner inbox for new contact messages. Leave empty to store messages without emailing.
 * Set to the owner's address once confirmed (e.g. "team@corpvideshai.com").
 */
export const CONTACT_ALERT_TO = "";

export async function sendContactAlert(message: ContactMessage, reference: string) {
  if (!CONTACT_ALERT_TO) return { sent: false as const, reason: "no_recipient" as const };
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  try {
    return await sendTemplateEmail("contact-message-alert", CONTACT_ALERT_TO, {
      templateData: { reference, ...message, organisation: message.organisation || undefined },
      idempotencyKey: `contact-message-alert-${reference}`,
      replyTo: message.workEmail,
    });
  } catch (error) {
    // The message is already stored; an email failure must not lose or fail the enquiry.
    console.warn(JSON.stringify({ event: "contact-alert-failed", reference, code: (error as { code?: string })?.code ?? "unknown" }));
    return { sent: false as const, reason: "send_failed" as const };
  }
}
