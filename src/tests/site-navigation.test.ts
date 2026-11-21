import { describe, expect, it } from "vitest";
import { DIRECTORY, PUBLIC_NAV, isGroup, searchGroups } from "@/components/site/nav-data";

describe("site navigation", () => {
  it("lets search reach every menu and directory page", () => {
    const searchable = new Set(searchGroups().flatMap((g) => g.items.map((i) => i.to)));
    const menu = PUBLIC_NAV.flatMap((n) => (isGroup(n) ? n.items.map((i) => i.to) : [n.to]));
    for (const to of [...menu, ...DIRECTORY.map((d) => d.to)]) expect(searchable.has(to)).toBe(true);
  });
  it("lists the African hubs page once in the Intelligence menu", () => {
    const intel = PUBLIC_NAV.find((n) => isGroup(n) && n.label === "Intelligence");
    const items = intel && isGroup(intel) ? intel.items : [];
    expect(items.filter((i) => i.to === "/africa-hubs")).toHaveLength(1);
  });
  it("keeps About as the first menu", () => {
    expect(PUBLIC_NAV[0] && isGroup(PUBLIC_NAV[0]) ? PUBLIC_NAV[0].label : "").toBe("About");
  });
});
