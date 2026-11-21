import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { appendCompanyFiling } from "@/lib/services/corporate-filings.server";
import { appendPortalFiling, readPortalFilings } from "@/lib/services/regulator-filings.server";

const clean = { company: "Assigned Company", period: "September 2026", filedOn: "2026-10-01", officer: "Demo Officer", authority: "Corporate officer" };
function fixture(options: { assigned?: boolean; insertError?: boolean; accessError?: boolean } = {}) {
  const saved: Record<string, unknown>[] = [];
  const query = (table: string) => {
    const result = table === "filing_company_memberships" ? { data: options.assigned === false ? [] : [{ company: clean.company }], error: null }
      : table === "filing_portal_roles" ? { data: { role: "demo_regulator" }, error: options.accessError ? { message: "offline" } : null }
      : { data: { rows: [{ party: clean.company, country: "Singapore", amount: 10 }, { party: "Other Company", country: "UK", amount: 20 }] }, error: null };
    const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), order: vi.fn(() => chain), maybeSingle: vi.fn(async () => result), then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve), insert: vi.fn((row: Record<string, unknown>) => { saved.push(row); return chain; }), single: vi.fn(async () => options.insertError ? { data: null, error: { message: "denied" } } : { data: { id: "saved", ...saved[0] }, error: null }) };
    return chain;
  };
  const from = vi.fn(query);
  return { saved, from, context: { userId: "user-one", supabase: { from } as unknown as SupabaseClient<Database> } };
}
describe("shared filing persistence", () => {
  it("corporate and regulator paths use the same owner-stamped append-only source snapshot", async () => {
    const corporate = fixture(); const regulator = fixture();
    await appendCompanyFiling(clean, corporate.context); await appendPortalFiling(clean, regulator.context);
    expect(corporate.saved).toEqual(regulator.saved); expect(corporate.saved).toHaveLength(1);
    expect(corporate.saved[0]).toMatchObject({ user_id: "user-one", simulation: true, officer: "Demo Officer", authority: "Corporate officer" });
    expect(corporate.saved[0]?.["transfer_snapshot"]).toEqual([{ party: clean.company, country: "Singapore", amount: 10 }]);
  });
  it("corporate access denial occurs before reading releases or writing records", async () => {
    const f = fixture({ assigned: false }); await expect(appendCompanyFiling(clean, f.context)).rejects.toThrow("not assigned");
    expect(f.saved).toHaveLength(0); expect(f.from.mock.calls.map(([table]) => table)).toEqual(["filing_company_memberships"]);
  });
  it("both entrypoints fail visibly on rejected storage writes without replay", async () => {
    for (const append of [appendCompanyFiling, appendPortalFiling]) {
      const f = fixture({ insertError: true }); await expect(append(clean, f.context)).rejects.toThrow("not saved"); expect(f.saved).toHaveLength(1);
    }
  });
  it("distinguishes a portal access-query outage from a definitive denial", async () => {
    const f = fixture({ accessError: true }); await expect(readPortalFilings(f.context)).rejects.toThrow("could not be checked");
    expect(f.from.mock.calls.map(([table]) => table)).toEqual(["filing_portal_roles"]);
  });
});