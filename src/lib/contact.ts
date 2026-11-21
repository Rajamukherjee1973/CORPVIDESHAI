import { z } from "zod";

/** Public contact details shown on /contact — update here when they change. */
export const CONTACT = {
  email: "team@corpvideshai.com",
  phone: "+91 87776 99902",
  phoneHref: "+918777699902",
  addressLines: ["Team Quantum Leap · CorpVidesh AI", "Department of Law, Brainware University", "Barasat, Kolkata, West Bengal, India"],
  hours: "Monday–Saturday, 10:00–18:00 IST",
} as const;

/** Who is writing in — routes the reply to the right team member. */
export const CONTACT_AUDIENCES = [
  "Venture capital / investor",
  "Regulator or government body",
  "Corporate treasury / CFO office",
  "AD Category-I bank",
  "GIFT IFSC entity",
  "Academic or jury",
  "Other",
] as const;

export const CONTACT_TOPICS = [
  "Investment or funding conversation",
  "Regulatory demonstration or guidance",
  "Pilot with our treasury / bank",
  "Technical or architecture question",
  "Media, speaking or academic",
  "Something else",
] as const;

export function contactMessageSchema() {
  return z.object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100),
    workEmail: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
    organisation: z.string().trim().max(150).optional().default(""),
    audience: z.enum(CONTACT_AUDIENCES, { errorMap: () => ({ message: "Choose who you represent" }) }),
    topic: z.enum(CONTACT_TOPICS, { errorMap: () => ({ message: "Choose a topic" }) }),
    message: z.string().trim().min(10, "Write at least a sentence so we can route your message").max(2000),
    /** Hidden field; people never fill it, automated spam usually does. */
    website: z.string().max(0, "Rejected").optional().default(""),
  });
}

export type ContactMessageInput = z.input<ReturnType<typeof contactMessageSchema>>;
export type ContactMessage = z.output<ReturnType<typeof contactMessageSchema>>;

/** A repeat message from the same email inside this window returns the earlier reference instead of a duplicate. */
export const CONTACT_DUPLICATE_WINDOW_MS = 10 * 60_000;
