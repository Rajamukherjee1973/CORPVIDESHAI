/**
 * Six-regulator desk demonstration: what each desk checks, how a file is routed
 * and signed, how its number is formed, and which security layer stops each
 * attack. Pure policy plus WebCrypto hashing. This is a proposed supervisory
 * model: under current law the AD Category-I bank processes Automatic-route
 * ODI and RBI decides Approval-route cases; the file number here is a
 * CorpVidesh demo reference, not an RBI UIN.
 */

export type DeskCode = "RBI" | "IFSCA" | "MoF" | "FIU-IND" | "DPIIT" | "CBDT";
export const DESK_ORDER: DeskCode[] = ["RBI", "IFSCA", "FIU-IND", "CBDT", "MoF", "DPIIT"];

export type Fault = "tamper" | "beneficiary" | "sanctions" | "ceiling" | "tax" | "ibu" | "sector" | "impersonation";

export const FAULTS: { id: Fault; label: string; plain: string; caughtBy: DeskCode | "Security"; layer: string }[] = [
  { id: "tamper", label: "Edit the amount after sealing", plain: "Someone changes the amount once the file is sealed.", caughtBy: "Security", layer: "SHA-256 seal mismatch — rejected before any desk reads it" },
  { id: "beneficiary", label: "Swap the overseas bank account", plain: "The receiving account is replaced after approval was sought.", caughtBy: "FIU-IND", layer: "Beneficiary lock hash differs — payment frozen, AML query" },
  { id: "impersonation", label: "Sign from the wrong desk", plain: "An officer of one authority tries to sign for another.", caughtBy: "Security", layer: "Desk-bound signing key — signature refused and logged" },
  { id: "ceiling", label: "Exceed the net-worth ceiling", plain: "The total going abroad is more than the normal limit.", caughtBy: "RBI", layer: "Route engine moves the file to the Approval route" },
  { id: "sanctions", label: "Hidden owner on a watch list", plain: "A person behind the overseas company is on a sanctions list.", caughtBy: "FIU-IND", layer: "Beneficial-owner screening — file held" },
  { id: "tax", label: "Missing tax residency papers", plain: "The treaty tax certificate (TRC / Form 10F) is not attached.", caughtBy: "CBDT", layer: "Section 195 evidence check — query raised" },
  { id: "ibu", label: "No GIFT IBU settlement mandate", plain: "The GIFT City bank unit has no instruction to settle.", caughtBy: "IFSCA", layer: "IFSC perimeter check — query raised" },
  { id: "sector", label: "Prohibited activity abroad", plain: "The overseas company is in real estate or gambling.", caughtBy: "DPIIT", layer: "Sector rules — file held (Rule 19 review)" },
];

export type DeskCheck = { id: string; label: string; reads: string; kind: "machine" | "officer"; fault?: Fault };

export const DESKS: Record<DeskCode, { name: string; standing: "Statutory today" | "Proposed lens"; today: string; sla: string; checks: DeskCheck[] }> = {
  RBI: {
    name: "Reserve Bank of India · Foreign Exchange Dept.",
    standing: "Statutory today",
    today: "Writes the FEMA overseas-investment regulations; decides Approval-route cases through the AD bank and issues the UIN on reported ODI.",
    sla: "Automatic: noted same day · Approval: officer decision",
    checks: [
      { id: "route", label: "Route: within 400% of audited net worth (ODI) / 50% (OPI)?", reads: "Net-worth certificate · exposure schedule", kind: "machine", fault: "ceiling" },
      { id: "form", label: "Form FC complete and consistent", reads: "Form FC · board resolution", kind: "machine" },
      { id: "valuation", label: "Arm's-length pricing / valuation", reads: "Valuation report", kind: "officer" },
      { id: "activity", label: "No prohibited activity (Rule 19)", reads: "Business plan of foreign entity", kind: "machine", fault: "sector" },
    ],
  },
  IFSCA: {
    name: "International Financial Services Centres Authority",
    standing: "Statutory today",
    today: "Regulates GIFT IFSC banking units and funds; relevant only when the money settles through GIFT City.",
    sla: "Same day when routed via an IBU",
    checks: [
      { id: "unit", label: "IFSC banking unit licensed and in perimeter", reads: "IBU licence register", kind: "machine" },
      { id: "mandate", label: "Settlement mandate on file", reads: "IBU mandate · account details", kind: "machine", fault: "ibu" },
      { id: "conduct", label: "Offshore leg conduct", reads: "Fund-flow map", kind: "officer" },
    ],
  },
  "FIU-IND": {
    name: "Financial Intelligence Unit — India",
    standing: "Proposed lens",
    today: "Receives suspicious-transaction reports from banks under PMLA; it does not approve investments.",
    sla: "Machine screening in seconds",
    checks: [
      { id: "kyc", label: "KYC and source of funds", reads: "Bank KYC file", kind: "machine" },
      { id: "ubo", label: "Beneficial owners vs sanctions / PEP lists", reads: "Ownership chain", kind: "machine", fault: "sanctions" },
      { id: "beneficiary", label: "Beneficiary account matches the sealed file", reads: "Beneficiary lock hash", kind: "machine", fault: "beneficiary" },
    ],
  },
  CBDT: {
    name: "Central Board of Direct Taxes",
    standing: "Proposed lens",
    today: "Administers Section 195 withholding and Forms 15CA/15CB; it does not approve investments.",
    sla: "Officer review of tax evidence",
    checks: [
      { id: "chargeable", label: "Is the payment chargeable to tax in India?", reads: "Payment purpose code", kind: "machine" },
      { id: "treaty", label: "TRC and Form 10F for treaty relief", reads: "TRC · Form 10F", kind: "officer", fault: "tax" },
      { id: "forms", label: "15CA / 15CB filed where applicable", reads: "15CA acknowledgement", kind: "machine" },
    ],
  },
  MoF: {
    name: "Ministry of Finance · Dept. of Economic Affairs",
    standing: "Proposed lens",
    today: "Frames the Overseas Investment Rules; it does not approve individual cases.",
    sla: "Dashboard note, no hold",
    checks: [
      { id: "corridor", label: "Corridor and size on the policy dashboard", reads: "Aggregated corridor data", kind: "machine" },
      { id: "strategic", label: "Strategic-sector or large-ticket flag", reads: "Sector code · amount", kind: "officer" },
    ],
  },
  DPIIT: {
    name: "Dept. for Promotion of Industry & Internal Trade",
    standing: "Proposed lens",
    today: "Sets industrial and FDI policy; it does not approve outbound investments.",
    sla: "Machine rules in seconds",
    checks: [
      { id: "sector", label: "Activity is not real estate / gambling", reads: "NIC code of foreign entity", kind: "machine", fault: "sector" },
      { id: "rationale", label: "Business rationale matches the sector", reads: "Investment rationale", kind: "machine" },
    ],
  },
};

/** Desks whose officer must sign on an Approval-route file in this model. */
export const SIGNERS: DeskCode[] = ["RBI", "IFSCA", "MoF", "CBDT"];

export type DeskFacts = { investment: "ODI" | "OPI"; amountCr: number; netWorthCr: number; existingCr: number };
export type DeskStatus = "clear" | "refer" | "query" | "hold" | "blocked";
export type DeskVerdict = { code: DeskCode; status: DeskStatus; note: string; failed: string[] };
export type DeskOutcome = "rejected-at-intake" | "held" | "queried" | "awaiting-signatures" | "noted";

export function ceilingFor(f: DeskFacts): number {
  return f.netWorthCr * (f.investment === "ODI" ? 4 : 0.5);
}

export function evaluateDesks(f: DeskFacts, faults: Fault[]) {
  const has = (x: Fault) => faults.includes(x);
  const ceiling = ceilingFor(f);
  const overCeiling = has("ceiling") || f.existingCr + f.amountCr > ceiling;
  if (has("tamper")) {
    return {
      integrity: "broken" as const,
      route: overCeiling ? ("Approval" as const) : ("Automatic" as const),
      ceiling,
      outcome: "rejected-at-intake" as DeskOutcome,
      verdicts: DESK_ORDER.map((code): DeskVerdict => ({ code, status: "blocked", note: "Seal mismatch — file never reached this desk.", failed: [] })),
    };
  }
  const v = (code: DeskCode, status: DeskStatus, note: string, failed: string[] = []): DeskVerdict => ({ code, status, note, failed });
  const verdicts: DeskVerdict[] = DESK_ORDER.map((code) => {
    switch (code) {
      case "RBI":
        if (has("sector")) return v(code, "hold", "Prohibited activity under Rule 19 — file held for review.", ["activity"]);
        return overCeiling
          ? v(code, "refer", `Total exceeds the ₹${Math.round(ceiling).toLocaleString("en-IN")} cr reference ceiling — Approval route, officer signature needed.`, ["route"])
          : v(code, "clear", "Within the reference ceiling — Automatic route, noted on the record.");
      case "IFSCA":
        return has("ibu") ? v(code, "query", "No IBU settlement mandate — query to the applicant.", ["mandate"]) : v(code, "clear", "IBU perimeter and mandate verified.");
      case "FIU-IND":
        if (has("sanctions")) return v(code, "hold", "Beneficial owner matched a watch list — file held.", ["ubo", ...(has("beneficiary") ? ["beneficiary"] : [])]);
        if (has("beneficiary")) return v(code, "query", "Beneficiary account differs from the sealed lock — payment frozen.", ["beneficiary"]);
        return v(code, "clear", "Screening clean; beneficiary lock matches.");
      case "CBDT":
        return has("tax") ? v(code, "query", "TRC / Form 10F missing — treaty relief cannot be confirmed.", ["treaty"]) : v(code, "clear", "Tax evidence consistent; no generic withholding on principal.");
      case "MoF":
        return v(code, "clear", f.amountCr >= 5000 ? "Large-ticket corridor noted on the policy dashboard." : "Noted on the corridor dashboard.");
      case "DPIIT":
        return has("sector") ? v(code, "hold", "Activity code is real estate / gambling — held.", ["sector"]) : v(code, "clear", "Sector rules satisfied.");
    }
  });
  const outcome: DeskOutcome = verdicts.some((x) => x.status === "hold") ? "held"
    : verdicts.some((x) => x.status === "query") ? "queried"
    : overCeiling ? "awaiting-signatures" : "noted";
  return { integrity: "intact" as const, route: overCeiling ? ("Approval" as const) : ("Automatic" as const), ceiling, outcome, verdicts };
}

/** A signing key is bound to one desk; any other desk's signature is refused. */
export function canSign(actingDesk: DeskCode, targetDesk: DeskCode): boolean {
  return actingDesk === targetDesk && SIGNERS.includes(targetDesk);
}

/* ---------------------------- File numbering ---------------------------- */

export function hubCode(city: string): string {
  const letters = city.replace(/\(.*?\)/g, "").replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters + "XXX").slice(0, 3);
}

export type FileSegment = { key: string; value: string; meaning: string };

/** CVA/ODI/AP/SIN/2026/000042-7F3A — namespace/type/route/hub/year/sequence-check. */
export function buildFileNumber(p: { investment: "ODI" | "OPI"; route: "Automatic" | "Approval"; hub: string; year: number; seq: number; hash: string }) {
  const segments: FileSegment[] = [
    { key: "Namespace", value: "CVA", meaning: "CorpVidesh demo register — not an RBI UIN" },
    { key: "Type", value: p.investment, meaning: p.investment === "ODI" ? "Overseas direct investment" : "Overseas portfolio investment" },
    { key: "Route", value: p.route === "Approval" ? "AP" : "AU", meaning: p.route === "Approval" ? "Approval route — officer signatures" : "Automatic route — AD bank, noted" },
    { key: "Hub", value: hubCode(p.hub), meaning: `Destination hub: ${p.hub}` },
    { key: "Year", value: String(p.year), meaning: "Calendar year of sealing" },
    { key: "Sequence", value: String(Math.max(1, Math.floor(p.seq))).padStart(6, "0"), meaning: "Next number in this register, never reused" },
    { key: "Check", value: p.hash.slice(0, 4).toUpperCase(), meaning: "First 4 characters of the file's SHA-256 seal" },
  ];
  const [ns, type, route, hub, year, seq, check] = segments.map((s) => s.value);
  return { full: `${ns}/${type}/${route}/${hub}/${year}/${seq}-${check}`, segments };
}

const FILE_RE = /^CVA\/(ODI|OPI)\/(AP|AU)\/([A-Z]{3})\/(\d{4})\/(\d{6})-([0-9A-F]{4})$/;

/** Checks the number's shape and that its check segment matches the sealed hash. */
export function checkFileNumber(full: string, hash: string): { ok: boolean; reason: string } {
  const m = FILE_RE.exec(full.trim().toUpperCase());
  if (!m) return { ok: false, reason: "Not a valid CorpVidesh file number shape." };
  if (m[6] !== hash.slice(0, 4).toUpperCase()) return { ok: false, reason: `Check segment ${m[6]} does not match the seal (${hash.slice(0, 4).toUpperCase()}).` };
  return { ok: true, reason: "Shape valid and check segment matches the sealed file." };
}

/** Each desk's action gets a sub-reference under the file: …-7F3A·RBI-1. */
export function deskRef(file: string, code: DeskCode, n: number): string {
  return `${file}·${code}-${n}`;
}

/* ------------------------------ Hash chain ------------------------------ */

export async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Stable JSON with sorted keys so the same facts always produce the same seal. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(value);
}

export type DeskBlock = { index: number; desk: string; action: string; ref: string; prev: string; hash: string };

const blockBody = (b: Omit<DeskBlock, "hash">) => canonical({ index: b.index, desk: b.desk, action: b.action, ref: b.ref, prev: b.prev });

export async function appendBlock(chain: DeskBlock[], entry: { desk: string; action: string; ref: string }): Promise<DeskBlock[]> {
  const base = { index: chain.length, ...entry, prev: chain.at(-1)?.hash ?? "GENESIS" };
  return [...chain, { ...base, hash: await sha256Hex(blockBody(base)) }];
}

/** Index of the first block whose content or link no longer matches, or -1 when intact. */
export async function firstBrokenBlock(chain: DeskBlock[]): Promise<number> {
  for (const [i, b] of chain.entries()) {
    if (b.index !== i || b.prev !== (chain[i - 1]?.hash ?? "GENESIS") || b.hash !== (await sha256Hex(blockBody(b)))) return i;
  }
  return -1;
}
