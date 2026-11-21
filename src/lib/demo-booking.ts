import { z } from "zod";

/** Who is asking for the walkthrough — drives which desks the demo opens with. */
export const DEMO_AUDIENCES = [
  "Corporate treasury / CFO office",
  "AD Category-I bank",
  "Regulator or government body",
  "GIFT IFSC entity",
  "Venture capital / investor",
  "Academic or jury",
  "Other",
] as const;

export const DEMO_SLOTS = ["10:00–11:00 IST", "12:00–13:00 IST", "15:00–16:00 IST", "17:00–18:00 IST"] as const;

export const DEMO_FOCUS = [
  "Treasury console & Form FC filings",
  "GIFT City nine-desk clearance",
  "Regulator portal actions",
  "AI agent desk",
  "52-hub FX & market intelligence",
  "Architecture & evidence studio",
] as const;

/** Earliest bookable date: the next calendar day in IST (yyyy-mm-dd). */
export function earliestDemoDate(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  ist.setUTCDate(ist.getUTCDate() + 1);
  return ist.toISOString().slice(0, 10);
}

export function demoBookingSchema(now: Date = new Date()) {
  const earliest = earliestDemoDate(now);
  return z.object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100),
    workEmail: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
    organisation: z.string().trim().min(2, "Enter your organisation").max(150),
    audience: z.enum(DEMO_AUDIENCES, { errorMap: () => ({ message: "Choose who you represent" }) }),
    preferredDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
      .refine((d) => d >= earliest, "Choose a date from tomorrow onwards"),
    timeSlot: z.enum(DEMO_SLOTS, { errorMap: () => ({ message: "Choose a time slot" }) }),
    focus: z.array(z.enum(DEMO_FOCUS)).min(1, "Pick at least one area").max(DEMO_FOCUS.length),
    message: z.string().trim().max(1000).optional().default(""),
    /** Hidden field; people never fill it, automated spam usually does. */
    website: z.string().max(0, "Rejected").optional().default(""),
  });
}

export type DemoBookingInput = z.input<ReturnType<typeof demoBookingSchema>>;
export type DemoBooking = z.output<ReturnType<typeof demoBookingSchema>>;

/** A repeat request from the same email inside this window returns the earlier reference instead of a duplicate. */
export const DEMO_DUPLICATE_WINDOW_MS = 10 * 60_000;
