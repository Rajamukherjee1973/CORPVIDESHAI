import { describe, expect, it } from "vitest";
import { PRESENTATIONS } from "../data/presentations";

describe("dated presentation editions", () => {
  it("publishes the current synopsis, architecture and investor editions", () => {
    const current = PRESENTATIONS.filter((p) => !p.edition.startsWith("Archive"));
    expect(current.map((p) => [p.id, p.pages, p.date])).toEqual([
      ["deck9", 9, "2026-11-13"],
      ["deck3", 3, "2026-11-13"],
      ["synopsis1", 1, "2026-11-13"],
      ["arch2", 2, "2026-10-31"],
      ["vc22", 22, "2026-10-31"],
    ]);
    expect(current.every((p) => p.url.startsWith("/__l5e/assets-v1/"))).toBe(true);
  });

  it("retains the replaced three editions and earlier dossiers as archives", () => {
    const archive = PRESENTATIONS.filter((p) => p.edition.startsWith("Archive"));
    expect(archive.map((p) => p.id)).toEqual(expect.arrayContaining([
      "archive-synopsis-20261031", "archive-synopsis-20261030", "archive-architecture-20261029", "archive-vc-20261030",
      "brief", "dossier17", "dossier24", "prior-synopsis1", "prior-vc22",
    ]));
    expect(new Set(PRESENTATIONS.map((p) => p.id)).size).toBe(PRESENTATIONS.length);
  });
});