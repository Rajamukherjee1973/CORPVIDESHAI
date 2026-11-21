// Encode / decode a presentable case-file view (dataset, baseline, clicked step)
// into a URL fragment so a treasurer can hand regulators the exact comparison.

import type { CaseInput } from "@/lib/casefile";

export type SharedDataset = { id: string; label: string; blurb: string; input: CaseInput };

export type ShareState = {
  active: string;
  baseline: string;
  step: string | null;
  actor: string | null;
  hidden: string[];
  datasets: SharedDataset[];
};

function toB64Url(s: string) {
  const b64 = typeof window === "undefined" ? "" : window.btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(window.atob(b64)));
}

export function encodeShare(state: ShareState): string {
  return toB64Url(JSON.stringify(state));
}

export function decodeShare(raw: string): ShareState | null {
  try {
    const parsed = JSON.parse(fromB64Url(raw)) as ShareState;
    if (!parsed || typeof parsed.active !== "string") return null;
    return {
      active: parsed.active,
      baseline: parsed.baseline,
      step: parsed.step ?? null,
      actor: parsed.actor ?? null,
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      datasets: Array.isArray(parsed.datasets) ? parsed.datasets.filter((d) => d && d.input) : [],
    };
  } catch {
    return null;
  }
}

const PREFIX = "#view=";

/** Read a shared view out of the current URL fragment, if any. */
export function readShareFromUrl(): ShareState | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hash;
  if (!h.startsWith(PREFIX)) return null;
  return decodeShare(h.slice(PREFIX.length));
}

export function shareUrl(state: ShareState): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}${PREFIX}${encodeShare(state)}`;
}
