import { describe, expect, it } from "vitest";
import { allCases, bookCase, removeCase, type LedgerCase } from "@/lib/ledger";
import type { FxCapture } from "@/lib/fx-stream";

describe("shared demonstration ledger", () => {
  it("counts one manual booking once even when it also has an FX capture", () => {
    const row: LedgerCase = { id: "CV-audit", at: 1, iso: "2026-10-30T00:00:00Z", desk: "Treasury ledger", entity: "Infosys", hub: "London", country: "United Kingdom", code: "GBP", crore: 950, rateAt: 110, seq: 1, digest: "audit", route: "ODI", source: "booked" };
    const capture: FxCapture = { ...row, status: "indicative", trigger: "action", action: "Booking", rate: 110 };
    bookCase(row);
    const matching = allCases([capture]).filter((r) => r.digest === "audit");
    expect(matching).toHaveLength(1);
    expect(matching[0]?.entity).toBe("Infosys");
    removeCase(row.id);
  });
});