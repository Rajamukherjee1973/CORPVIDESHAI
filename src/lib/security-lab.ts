/**
 * Verifiable security lab: pure helpers behind the live checks on /security.
 * Hashing uses real SHA-256 (WebCrypto); header and access results come from
 * the visitor's own browser requests. Nothing here certifies the platform.
 */

export type LedgerRecord = { seq: number; party: string; action: string; beneficiary: string; amountCr: number };

export const GENESIS = "0".repeat(64);

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function canonical(r: LedgerRecord): string {
  return JSON.stringify([r.seq, r.party, r.action, r.beneficiary, r.amountCr]);
}

/** Each link commits to the previous link and the record: h_i = SHA-256(h_{i-1} | record_i). */
export async function chainHashes(records: LedgerRecord[]): Promise<string[]> {
  const out: string[] = [];
  let prev = GENESIS;
  for (const r of records) {
    prev = await sha256Hex(`${prev}|${canonical(r)}`);
    out.push(prev);
  }
  return out;
}

/** Index of the first record whose recomputed link differs from the sealed one; -1 when intact. */
export async function firstBrokenLink(records: LedgerRecord[], sealed: string[]): Promise<number> {
  const now = await chainHashes(records);
  for (let i = 0; i < records.length; i++) if (now[i] !== sealed[i]) return i;
  return -1;
}

/** A head hash is accepted only when at least `need` independent copies hold the same value. */
export function quorumVerdict(head: string, copies: string[], need: number): { agree: number; accepted: boolean } {
  const agree = copies.filter((c) => c === head).length;
  return { agree, accepted: agree >= need };
}

export type HeaderCheck = { header: string; label: string; present: boolean; value: string | null; why: string };

const EXPECTED: { header: string; label: string; why: string }[] = [
  { header: "strict-transport-security", label: "Forces encrypted connections (HSTS)", why: "Browsers refuse to fall back to unencrypted http." },
  { header: "content-security-policy", label: "Content security policy", why: "Limits which scripts may run, blunting injected code." },
  { header: "x-content-type-options", label: "No content sniffing", why: "Stops files being run as a different type." },
  { header: "x-frame-options", label: "Clickjacking guard", why: "Stops the site being framed by another page." },
  { header: "referrer-policy", label: "Referrer policy", why: "Limits what addresses leak to other sites." },
  { header: "permissions-policy", label: "Device permissions policy", why: "Turns off camera, microphone and similar by default." },
];

export function auditHeaders(get: (name: string) => string | null): HeaderCheck[] {
  return EXPECTED.map((e) => {
    let value = get(e.header);
    if (e.header === "x-frame-options" && !value) {
      const csp = get("content-security-policy");
      if (csp && /frame-ancestors/i.test(csp)) value = "via CSP frame-ancestors";
    }
    return { ...e, present: Boolean(value), value };
  });
}

export type ProbeOutcome = { rows: number; error: string | null };
/** For a protected table, an anonymous read passes when nothing comes back (empty or refused). */
export function probePassed(kind: "protected" | "public", o: ProbeOutcome): boolean {
  return kind === "protected" ? o.rows === 0 : o.error === null && o.rows > 0;
}

export type ControlStatus = "Enforced" | "Simulated" | "Not built";
export type StrideRow = { cat: string; threat: string; asset: string; control: string; status: ControlStatus; check: string };

export const STRIDE: StrideRow[] = [
  { cat: "Spoofing", threat: "Stolen or guessed login used as a regulator or treasurer", asset: "Portal accounts", control: "Email sign-in, server-assigned roles; a role picked in the browser never grants access", status: "Enforced", check: "Live checks: anonymous reads return nothing" },
  { cat: "Tampering", threat: "Someone edits a filed amount or beneficiary afterwards", asset: "Case and Form FC records", control: "Append-only tables with a per-case SHA-256 chain checked by the database", status: "Enforced", check: "Live checks tab: tamper lab" },
  { cat: "Repudiation", threat: "A reviewer denies having approved or queried a case", asset: "Review trail", control: "Every action is an appended, signed-in event with time and actor", status: "Enforced", check: "GIFT and Form FC portals" },
  { cat: "Information disclosure", threat: "One company or desk reads another's filings", asset: "Filings, proposals, contact messages", control: "Row-level access rules per company, desk and owner", status: "Enforced", check: "Live checks: protected tables" },
  { cat: "Denial of service", threat: "Flooding forms or the rail to block filings", asset: "Public forms, rail", control: "Input validation and duplicate suppression; no dedicated rate limiter yet", status: "Simulated", check: "Breach theatre models quorum stalls" },
  { cat: "Elevation of privilege", threat: "A demo or corporate user acts as a regulator", asset: "Review actions", control: "Role-checked database functions; showcase desks isolated from private records", status: "Enforced", check: "Regulator portal demo desks" },
  { cat: "Tampering", threat: "Beneficiary account swapped before money is released", asset: "Release instruction", control: "Release compared with the beneficiary hash sealed at clearance", status: "Simulated", check: "Live checks tab: payee lock" },
  { cat: "Information disclosure", threat: "Keys or secrets extracted from the server", asset: "Service credentials", control: "Server-only secrets; hardware key storage and rotation drills not provisioned", status: "Not built", check: "Requires production infrastructure" },
];
