import { describe, expect, it } from "vitest";
import {
  INDIA_PAIRS,
  LONDON_PAIRS,
  changePct,
  crossRate,
  direction,
  formatRate,
  pairKey,
  pairsFor,
  venueOpen,
} from "@/lib/fx";

const RATES = { INR: 88, EUR: 0.92, GBP: 0.78, JPY: 152, CHF: 0.88 };

describe("fx cross rates", () => {
  it("returns 1:1 legs against the table base", () => {
    expect(crossRate(RATES, "USD", "INR", "USD")).toBe(88);
  });

  it("computes a non-USD cross", () => {
    const v = crossRate(RATES, "GBP", "INR", "USD");
    expect(v).not.toBeNull();
    expect(v!).toBeCloseTo(88 / 0.78, 6);
  });

  it("returns null when a leg is missing or invalid", () => {
    expect(crossRate(RATES, "AED", "INR", "USD")).toBeNull();
    expect(crossRate({ ...RATES, GBP: 0 }, "GBP", "INR", "USD")).toBeNull();
  });

  it("formats to the conventional precision", () => {
    expect(formatRate(88.12345, { base: "USD", quote: "INR", note: "" })).toBe("88.1235");
    expect(formatRate(1.234567, { base: "GBP", quote: "USD", note: "" })).toBe("1.23457");
  });
});

describe("fx tick direction", () => {
  it("flags up, down and flat", () => {
    expect(direction(89, 88)).toBe("up");
    expect(direction(87, 88)).toBe("down");
    expect(direction(88, 88)).toBe("flat");
    expect(direction(88, undefined)).toBe("flat");
  });

  it("renders a signed percentage move", () => {
    expect(changePct(101, 100)).toBe("+1.00%");
    expect(changePct(99, 100)).toBe("-1.00%");
    expect(changePct(99, undefined)).toBe("0.00%");
  });
});

describe("fx venues", () => {
  it("exposes distinct London and India tapes", () => {
    expect(pairsFor("london")).toBe(LONDON_PAIRS);
    expect(pairsFor("india")).toBe(INDIA_PAIRS);
    expect(INDIA_PAIRS.every((p) => p.quote === "INR")).toBe(true);
    expect(new Set(LONDON_PAIRS.map(pairKey)).size).toBe(LONDON_PAIRS.length);
  });

  it("knows the trading windows", () => {
    const wedMorning = new Date("2026-08-12T09:00:00Z"); // 14:30 IST
    expect(venueOpen("london", wedMorning)).toBe(true);
    expect(venueOpen("india", wedMorning)).toBe(true);
    const wedEvening = new Date("2026-08-12T15:00:00Z"); // 20:30 IST
    expect(venueOpen("india", wedEvening)).toBe(false);
    expect(venueOpen("london", wedEvening)).toBe(true);
    const sunday = new Date("2026-08-09T09:00:00Z");
    expect(venueOpen("london", sunday)).toBe(false);
    expect(venueOpen("india", sunday)).toBe(false);
  });
});
