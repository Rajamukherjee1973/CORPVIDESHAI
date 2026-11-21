import { describe, expect, it } from "vitest";
import { DEMO_DUPLICATE_WINDOW_MS, demoBookingSchema, earliestDemoDate } from "@/lib/demo-booking";

const NOW = new Date("2026-11-18T07:40:00Z"); // 13:10 IST
const valid = {
  fullName: "Ananya Rao",
  workEmail: "Ananya.Rao@Example.com",
  organisation: "Example Industries Ltd",
  audience: "Corporate treasury / CFO office",
  preferredDate: "2026-11-19",
  timeSlot: "10:00–11:00 IST",
  focus: ["AI agent desk"],
};

describe("demo booking rules", () => {
  it("earliest bookable date is the next IST calendar day", () => {
    expect(earliestDemoDate(NOW)).toBe("2026-11-19");
    expect(earliestDemoDate(new Date("2026-11-18T19:00:00Z"))).toBe("2026-11-20"); // already 19 Nov in IST
  });

  it("accepts a complete request and lower-cases the email", () => {
    const r = demoBookingSchema(NOW).parse(valid);
    expect(r.workEmail).toBe("ananya.rao@example.com");
  });

  it("rejects today or past dates", () => {
    expect(demoBookingSchema(NOW).safeParse({ ...valid, preferredDate: "2026-11-18" }).success).toBe(false);
  });

  it("requires at least one demo area", () => {
    expect(demoBookingSchema(NOW).safeParse({ ...valid, focus: [] }).success).toBe(false);
  });

  it("rejects a filled hidden spam field", () => {
    expect(demoBookingSchema(NOW).safeParse({ ...valid, website: "http://spam" }).success).toBe(false);
  });

  it("treats repeats within ten minutes as the same request", () => {
    expect(DEMO_DUPLICATE_WINDOW_MS).toBe(600_000);
  });
});
