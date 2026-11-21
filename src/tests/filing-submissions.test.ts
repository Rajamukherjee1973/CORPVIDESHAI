import { describe, expect, it } from "vitest";
import { createSubmission, latestSubmission, submissionSchema } from "@/lib/filing-submissions";
import type { RegulatorSession } from "@/lib/session";

const officer: RegulatorSession = { role: "regulator", id: "reg:rbi", code: "RBI", officer: "Test officer", scope: "RBI" };
const input = { company: "A LTD", period: "August 2026", filedOn: "2026-09-22", officer: "Review officer", authority: "RBI" };
const now = new Date("2026-10-23T08:40:00Z");
describe("Form FC simulation submissions", () => {
  it("records filed date and officer details as simulation only", () => {
    expect(createSubmission(input, officer, now)).toMatchObject({ ...input, simulation: true, recordedAt: "2026-10-23T08:40:00.000Z" });
  });
  it("rejects non-regulator demonstration desks", () => {
    expect(() => createSubmission(input, null, now)).toThrow("regulator");
    expect(() => createSubmission(input, { role: "investor", id: "i", name: "x", fund: "x" }, now)).toThrow("regulator");
  });
  it("scopes status to the company and reporting month", () => {
    const record = createSubmission(input, officer, now);
    expect(latestSubmission([record], "A LTD", "August 2026")?.filedOn).toBe("2026-09-22");
    expect(latestSubmission([record], "B LTD", "August 2026")).toBeUndefined();
    expect(latestSubmission([record], "A LTD", "September 2026")).toBeUndefined();
  });
  it("retains history and uses the newest dated entry", () => {
    const first = createSubmission(input, officer, now);
    const second = createSubmission({ ...input, filedOn: "2026-09-23" }, officer, now);
    expect(latestSubmission([first, second], input.company, input.period)?.filedOn).toBe("2026-09-23");
  });
  it("rejects impossible and future dates", () => {
    expect(submissionSchema.safeParse({ ...input, filedOn: "2026-02-30" }).success).toBe(false);
    expect(() => createSubmission({ ...input, filedOn: "2026-10-24" }, officer, now)).toThrow("future");
  });
});