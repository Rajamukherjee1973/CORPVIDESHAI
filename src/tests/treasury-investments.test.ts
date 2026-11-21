import { expect, it } from "vitest";
import { TREASURY_INVESTMENTS } from "@/data/treasury-investments";
it("provides over 200 distinct ODI / OPI investment scenarios", () => {
  expect(TREASURY_INVESTMENTS.length).toBeGreaterThan(200);
  expect(new Set(TREASURY_INVESTMENTS.map((p) => p.code)).size).toBe(TREASURY_INVESTMENTS.length);
  expect(TREASURY_INVESTMENTS.some((p) => p.kind === "ODI")).toBe(true);
  expect(TREASURY_INVESTMENTS.some((p) => p.kind === "OPI")).toBe(true);
});