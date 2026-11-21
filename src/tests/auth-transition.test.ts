import { describe, expect, it } from "vitest";
import { createAuthTransitionGuard } from "@/lib/auth-transition";

describe("portal initial-session ordering", () => {
  it("accepts the initial lookup before any session transition", () => {
    expect(createAuthTransitionGuard().initialIsCurrent()).toBe(true);
  });
  it("rejects a delayed lookup after sign-out", () => {
    const guard = createAuthTransitionGuard();
    guard.observe();
    expect(guard.initialIsCurrent()).toBe(false);
  });
});