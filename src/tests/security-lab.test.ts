import { describe, expect, it } from "vitest";
import { auditHeaders, chainHashes, firstBrokenLink, probePassed, quorumVerdict, sha256Hex, type LedgerRecord } from "@/lib/security-lab";

const recs: LedgerRecord[] = [
  { seq: 1, party: "Treasury", action: "File", beneficiary: "SG-DBS-001", amountCr: 475 },
  { seq: 2, party: "AD bank", action: "Verify", beneficiary: "SG-DBS-001", amountCr: 475 },
  { seq: 3, party: "RBI", action: "Acknowledge", beneficiary: "SG-DBS-001", amountCr: 475 },
];

describe("security lab", () => {
  it("uses real SHA-256 (known vector for 'abc')", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("an untouched chain verifies; editing record 2 breaks link 2 onward", async () => {
    const sealed = await chainHashes(recs);
    expect(await firstBrokenLink(recs, sealed)).toBe(-1);
    const edited = recs.map((r) => (r.seq === 2 ? { ...r, amountCr: 47.5 } : r));
    expect(await firstBrokenLink(edited, sealed)).toBe(1);
    const re = await chainHashes(edited);
    expect(re[2]).not.toBe(sealed[2]);
  });
  it("a re-hashed forgery on one copy is outvoted: 1 of 8 agree, 6 needed", () => {
    const v = quorumVerdict("forged", ["forged", ...Array(7).fill("true")], 6);
    expect(v).toEqual({ agree: 1, accepted: false });
  });
  it("header audit accepts CSP frame-ancestors as a clickjacking guard and flags missing headers", () => {
    const h: Record<string, string> = { "content-security-policy": "frame-ancestors 'self'" };
    const r = auditHeaders((n) => h[n] ?? null);
    expect(r.find((c) => c.header === "x-frame-options")!.present).toBe(true);
    expect(r.find((c) => c.header === "strict-transport-security")!.present).toBe(false);
  });
  it("protected probes pass only when nothing comes back; public probes need rows", () => {
    expect(probePassed("protected", { rows: 0, error: null })).toBe(true);
    expect(probePassed("protected", { rows: 0, error: "denied" })).toBe(true);
    expect(probePassed("protected", { rows: 3, error: null })).toBe(false);
    expect(probePassed("public", { rows: 5, error: null })).toBe(true);
  });
});
