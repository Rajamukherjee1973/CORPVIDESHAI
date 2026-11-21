/**
 * Shareable proof-desk state: scenario, assumptions and the clicked step
 * encoded into the URL fragment so a reviewer opens the exact same setup.
 */

import { DEFAULT_ASSUMPTIONS, type Assumptions } from "@/lib/proof-assumptions";

export type ProofShare = {
  scenario: string;
  step: number;
  assumptions: Assumptions;
};

const PREFIX = "#proof=";

const FLAGS: Array<keyof Assumptions> = [
  "approvalRoute",
  "s195",
  "firstTime",
  "calendar",
  "quorumLive",
];

export function encodeProofShare(s: ProofShare): string {
  const a = s.assumptions;
  const flags = FLAGS.map((f) => (a[f] ? "1" : "0")).join("");
  return [
    `k=${encodeURIComponent(s.scenario)}`,
    `s=${s.step}`,
    `t=${a.ticket}`,
    `r=${a.readiness}`,
    `x=${a.risk}`,
    `f=${flags}`,
  ].join("&");
}

function num(v: string | undefined, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function decodeProofShare(raw: string): ProofShare | null {
  if (!raw) return null;
  const q = new URLSearchParams(raw);
  const key = q.get("k");
  if (!key) return null;
  const flags = q.get("f") ?? "";
  const assumptions: Assumptions = { ...DEFAULT_ASSUMPTIONS };
  FLAGS.forEach((f, i) => {
    if (flags[i] === "0" || flags[i] === "1") {
      (assumptions[f] as boolean) = flags[i] === "1";
    }
  });
  assumptions.ticket = num(q.get("t") ?? undefined, DEFAULT_ASSUMPTIONS.ticket, 5, 5000);
  assumptions.readiness = num(q.get("r") ?? undefined, DEFAULT_ASSUMPTIONS.readiness, 0, 100);
  assumptions.risk = num(q.get("x") ?? undefined, DEFAULT_ASSUMPTIONS.risk, 0, 100);
  return {
    scenario: key,
    step: Math.max(0, Math.round(num(q.get("s") ?? undefined, 0, 0, 999))),
    assumptions,
  };
}

/** Read a shared proof view out of the current URL fragment, if any. */
export function readProofShareFromUrl(): ProofShare | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hash;
  if (!h.startsWith(PREFIX)) return null;
  return decodeProofShare(h.slice(PREFIX.length));
}

export function proofShareUrl(state: ProofShare): string {
  if (typeof window === "undefined") return "";
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${PREFIX}${encodeProofShare(state)}`;
}

/** Keep the address bar in sync without adding history entries. */
export function writeProofShareToUrl(state: ProofShare) {
  if (typeof window === "undefined") return;
  const next = `${PREFIX}${encodeProofShare(state)}`;
  if (window.location.hash === next) return;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
}
