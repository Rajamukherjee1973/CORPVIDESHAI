import { describe, expect, it } from "vitest";
import { CONTACT, CONTACT_DUPLICATE_WINDOW_MS, contactMessageSchema } from "@/lib/contact";

const valid = {
  fullName: "Ananya Rao",
  workEmail: "Ananya.Rao@Example.com",
  organisation: "Example Capital LLP",
  audience: "Venture capital / investor",
  topic: "Investment or funding conversation",
  message: "We would like to explore a pilot conversation with the team.",
};

describe("contact message rules", () => {
  it("accepts a complete message and lower-cases the email", () => {
    const r = contactMessageSchema().parse(valid);
    expect(r.workEmail).toBe("ananya.rao@example.com");
  });

  it("allows an empty organisation", () => {
    const r = contactMessageSchema().parse({ ...valid, organisation: "" });
    expect(r.organisation).toBe("");
  });

  it("rejects a message shorter than one sentence", () => {
    expect(contactMessageSchema().safeParse({ ...valid, message: "hi" }).success).toBe(false);
  });

  it("rejects a filled hidden spam field", () => {
    expect(contactMessageSchema().safeParse({ ...valid, website: "http://spam" }).success).toBe(false);
  });

  it("treats repeats within ten minutes as the same message", () => {
    expect(CONTACT_DUPLICATE_WINDOW_MS).toBe(600_000);
  });

  it("shows the confirmed public contact details", () => {
    expect(CONTACT.email).toBe("team@corpvideshai.com");
    expect(CONTACT.phoneHref).toBe("+918777699902");
    expect(CONTACT.addressLines.join(" ")).toContain("Brainware University");
  });
});
