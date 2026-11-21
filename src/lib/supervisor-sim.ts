// Supervisor simulation: turns any treasury dataset into the append-only
// ledger record that the six GIFT City regulators read while the
// transaction is still forming.

import { hash } from "@/lib/portal";
import {
  computeCase,
  crore,
  fx,
  inr,
  timelineFor,
  type CaseInput,
} from "@/lib/casefile";
import type { Engine } from "@/lib/regulator";

export type LedgerKind =
  | "seal"
  | "proof"
  | "screen"
  | "filing"
  | "dispatch"
  | "read"
  | "task"
  | "attest"
  | "anchor";

export type LedgerEntry = {
  seq: number;
  /** seconds from treasury submission */
  atS: number;
  who: string;
  what: string;
  plain: string;
  kind: LedgerKind;
  engine: Engine;
  /** the dataset value this entry commits, if any */
  value?: string;
  digest: string;
  prev: string;
};

const GENESIS = "0000000000000000";

export function buildLedger(input: CaseInput): LedgerEntry[] {
  const r = computeCase(input);
  const tl = timelineFor(input);

  type Raw = Omit<LedgerEntry, "seq" | "digest" | "prev">;
  const raw: Raw[] = [];

  raw.push({
    atS: 0,
    who: "Treasury",
    what: `Packet ${input.ref} sealed and signed — ${input.company}`,
    plain: "The finance team submits the file once, signed with its own key.",
    kind: "seal",
    engine: "manual",
    value: `${input.targetHub} · ${input.purpose.split("(")[0]!.trim()}`,
  });
  raw.push({
    atS: 6,
    who: "Ledger",
    what: `Rule 7 ceiling committed — net worth ${crore(input.netWorth)} × 400%`,
    plain: "The legal limit is calculated from the audited net worth and written to the record.",
    kind: "proof",
    engine: "qwen",
    value: crore(r.ceiling),
  });
  raw.push({
    atS: 13,
    who: "Ledger",
    what: `Headroom after this deal — ${r.utilisationPct.toFixed(1)}% of ceiling used`,
    plain:
      r.route === "Automatic"
        ? "The company stays under the limit, so no prior permission is needed."
        : "The company crosses the limit, so the Reserve Bank must approve before any rupee moves.",
    kind: "proof",
    engine: "qwen",
    value: `${crore(r.headroom)} · ${r.route} route`,
  });
  raw.push({
    atS: 21,
    who: "Ledger",
    what: "Beneficial ownership chain screened against UNSC / OFAC / MHA lists",
    plain: "Everyone behind the receiving company is checked against banned lists.",
    kind: "screen",
    engine: "alicloud",
    value: "0 hits",
  });
  raw.push({
    atS: 29,
    who: "Ledger",
    what: `Section 195 test written — income share ${(input.taxableShare * 100).toFixed(0)}%`,
    plain: "The system decides whether tax must be held back, and records why.",
    kind: "filing",
    engine: "qwen",
    value: inr(r.tds),
  });
  raw.push({
    atS: 35,
    who: "Ledger",
    what: `FX leg priced at ₹ ${r.dealtRate.toFixed(2)} / ${input.targetCurrency}`,
    plain: "The conversion rate is frozen into the record so it can be audited years later.",
    kind: "filing",
    engine: "alicloud",
    value: fx(r.grossFx, input.targetCurrency),
  });
  raw.push({
    atS: tl.dispatchS,
    who: "Gateway",
    what: `Record opened to ${tl.actors.length} supervisory nodes — GIFT IFSC, Gujarat`,
    plain: "The same record — not a copy, not a report — becomes readable by every regulator at once.",
    kind: "dispatch",
    engine: "fabric",
    value: `fan-out ×${tl.actors.length}`,
  });

  for (const a of tl.actors) {
    const pick = tl.dispatchS + a.pickupS;
    raw.push({
      atS: pick,
      who: a.code,
      what: `${a.desk} attached to the live record — ${a.officer}`,
      plain: `${a.authority} starts reading while the transaction is still forming.`,
      kind: "read",
      engine: a.mode === "manual" ? "manual" : "langchain",
      value: a.mandate,
    });
    for (const t of a.tasks) {
      raw.push({
        atS: pick + t.atS + t.durationS,
        who: a.code,
        what: `${t.label} — ${t.result}`,
        plain: "A single check inside this regulator's mandate, run in parallel with the others.",
        kind: "task",
        engine: t.engine,
        value: `${t.durationS}s`,
      });
    }
    raw.push({
      atS: pick + a.durationS,
      who: a.code,
      what: a.outcome,
      plain: a.plain,
      kind: "attest",
      engine: a.mode === "manual" ? "manual" : "fabric",
      value: a.mode === "manual" ? "signed by officer" : "machine attested",
    });
  }

  raw.push({
    atS: tl.totalS + 6,
    who: "Ledger",
    what: `Debit ${inr(r.debitToAccount)} · credited ${fx(r.netCredited, input.targetCurrency)} — block anchored`,
    plain: "The final numbers are locked into a block every regulator node holds a copy of.",
    kind: "anchor",
    engine: "fabric",
    value: `block ${4_821_306 + (parseInt(hash(input.ref).slice(0, 4), 16) % 9000)}`,
  });

  raw.sort((a, b) => a.atS - b.atS);

  let prev = GENESIS;
  return raw.map((e, i) => {
    const digest = hash(`${prev}|${e.atS}|${e.who}|${e.what}|${e.value ?? ""}`).slice(0, 16);
    const entry: LedgerEntry = { ...e, seq: i + 1, prev, digest };
    prev = digest;
    return entry;
  });
}

/** Re-walk the chain; returns the first sequence number that fails, or null. */
export function verifyChain(entries: LedgerEntry[]): number | null {
  let prev = GENESIS;
  for (const e of entries) {
    const expect = hash(`${prev}|${e.atS}|${e.who}|${e.what}|${e.value ?? ""}`).slice(0, 16);
    if (e.prev !== prev || e.digest !== expect) return e.seq;
    prev = e.digest;
  }
  return null;
}

export const clock = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};
