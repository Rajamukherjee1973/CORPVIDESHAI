import { describe, expect, it } from "vitest";
import { appendBlock, buildFileNumber, canSign, checkFileNumber, evaluateDesks, firstBrokenBlock, hubCode, sha256Hex } from "@/lib/regulator-desk";

const facts = { investment: "ODI" as const, amountCr: 950, netWorthCr: 1000, existingCr: 0 };

describe("six-regulator desk", () => {
  it("notes a within-ceiling ODI on the Automatic route with no signatures", () => {
    const r = evaluateDesks(facts, []);
    expect(r.route).toBe("Automatic");
    expect(r.outcome).toBe("noted");
    expect(r.ceiling).toBe(4000);
  });

  it("sends an ODI above 400% of net worth to the Approval route for signatures", () => {
    const r = evaluateDesks({ ...facts, amountCr: 4500 }, []);
    expect(r.route).toBe("Approval");
    expect(r.outcome).toBe("awaiting-signatures");
    expect(r.verdicts.find((v) => v.code === "RBI")?.status).toBe("refer");
  });

  it("rejects a tampered file at intake before any desk reads it", () => {
    const r = evaluateDesks(facts, ["tamper"]);
    expect(r.outcome).toBe("rejected-at-intake");
    expect(r.verdicts.every((v) => v.status === "blocked")).toBe(true);
  });

  it("holds the file when a beneficial owner is on a watch list", () => {
    const r = evaluateDesks(facts, ["sanctions"]);
    expect(r.outcome).toBe("held");
    expect(r.verdicts.find((v) => v.code === "FIU-IND")?.status).toBe("hold");
  });

  it("queries missing treaty papers at CBDT", () => {
    expect(evaluateDesks(facts, ["tax"]).verdicts.find((v) => v.code === "CBDT")?.status).toBe("query");
  });

  it("refuses a signature from another desk's officer", () => {
    expect(canSign("RBI", "RBI")).toBe(true);
    expect(canSign("CBDT", "RBI")).toBe(false);
    expect(canSign("FIU-IND", "FIU-IND")).toBe(false); // machine desk, no officer signature
  });

  it("numbers files with route, hub, year, sequence and a seal check", async () => {
    const hash = await sha256Hex("packet");
    const f = buildFileNumber({ investment: "ODI", route: "Approval", hub: "Dubai (DIFC)", year: 2026, seq: 42, hash });
    expect(f.full).toBe(`CVA/ODI/AP/DUB/2026/000042-${hash.slice(0, 4).toUpperCase()}`);
    expect(checkFileNumber(f.full, hash).ok).toBe(true);
    expect(checkFileNumber(f.full.replace("000042", "000043"), await sha256Hex("other")).ok).toBe(false);
    expect(hubCode("GIFT IFSC")).toBe("GIF");
  });

  it("finds the first edited block in the signature chain", async () => {
    let chain = await appendBlock([], { desk: "Treasury", action: "sealed", ref: "a" });
    chain = await appendBlock(chain, { desk: "RBI", action: "signed", ref: "b" });
    chain = await appendBlock(chain, { desk: "CBDT", action: "signed", ref: "c" });
    expect(await firstBrokenBlock(chain)).toBe(-1);
    const forged = chain.map((b, i) => (i === 1 ? { ...b, action: "approved ₹10,000 cr" } : b));
    expect(await firstBrokenBlock(forged)).toBe(1);
  });
});
