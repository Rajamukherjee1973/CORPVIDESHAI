import { describe, expect, it } from "vitest";
import { PUBLIC_NAV, isGroup } from "@/components/site/nav-data";
import { SOURCE_REPO, parseRepoStatus } from "@/lib/source-repo";

const SHA = "0123456789abcdef0123456789abcdef01234567";

describe("GitHub source tab", () => {
  it("points at the team's public repository", () => {
    expect(SOURCE_REPO.url).toBe("https://github.com/Rajamukherjee1973/CORPVIDESHAI");
  });
  it("is its own top-level tab in the header", () => {
    expect(PUBLIC_NAV.some((n) => !isGroup(n) && n.to === "/source" && n.label === "GitHub")).toBe(true);
  });
  it("reads the first line of the latest commit", () => {
    const s = parseRepoStatus({ sha: SHA, commit: { message: "Add GitHub tab\n\nbody", committer: { date: "2026-11-21T21:40:00Z" } } }, { stargazers_count: 3, default_branch: "main" });
    expect(s.ok && s.message).toBe("Add GitHub tab");
    expect(s.ok && s.shortSha).toBe("0123456");
    expect(s.ok && s.stars).toBe(3);
  });
  it("fails closed on a malformed payload", () => {
    expect(parseRepoStatus({ sha: "nope" }, null).ok).toBe(false);
  });
});
