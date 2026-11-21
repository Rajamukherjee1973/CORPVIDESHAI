// Regulator quorum model — what each of the six authorities actually has to
// approve on an outbound filing, how long its automated queue takes, and how
// much of that queue still needs a human hand on it.
//
// One shared model drives the 3D quorum canvas, the regulator console
// dropdown on /routes and the desk-access demonstration.

import type { RouteKey } from "@/lib/routes-detail";

export type QueueItem = {
  id: string;
  title: string;
  basis: string;
  plain: string;
  /** Seconds the automated queue needs for this item. */
  sec: Record<RouteKey, number>;
  mode: "automated" | "manual";
};

export type RegulatorLane = {
  code: string;
  authority: string;
  scope: string;
  officer: string;
  seat: string;
  engine: string;
  /** Offset in seconds from the moment the packet is dispatched. */
  start: Record<RouteKey, number>;
  /** What this same desk takes today, off-rail, in minutes of real-world turnaround. */
  legacyMin: Record<RouteKey, number>;
  items: QueueItem[];
};

export const QUORUM_LANES: RegulatorLane[] = [
  {
    code: "RBI",
    authority: "Reserve Bank of India",
    scope: "Overseas Investment Division",
    officer: "A. Deshmukh",
    seat: "Mumbai node",
    engine: "Qwen statutory reasoning + named officer sign-off",
    start: { Automatic: 2, Approval: 4 },
    legacyMin: { Automatic: 2880, Approval: 30240 },
    items: [
      {
        id: "rbi-ceiling",
        title: "Rule 7 financial-commitment ceiling",
        basis: "Rule 7, OI Rules 2022 — 400% of audited net worth",
        plain: "Checks the company has not gone past the amount it is allowed to send abroad.",
        sec: { Automatic: 4, Approval: 7 },
        mode: "automated",
      },
      {
        id: "rbi-uin",
        title: "UIN allotment for the overseas entity",
        basis: "Master Direction — Overseas Investment, para 8",
        plain: "Issues the identity number every overseas investment must carry.",
        sec: { Automatic: 6, Approval: 9 },
        mode: "automated",
      },
      {
        id: "rbi-route",
        title: "Route classification and, on approval route, sanction",
        basis: "Rule 9 / Rule 10, OI Rules 2022",
        plain: "Decides whether the company may simply file, or needs express permission.",
        sec: { Automatic: 5, Approval: 42 },
        mode: "manual",
      },
    ],
  },
  {
    code: "IFSCA",
    authority: "International Financial Services Centres Authority",
    scope: "GIFT IFSC conduct",
    officer: "M. Shah",
    seat: "Gandhinagar node",
    engine: "LangChain orchestration + conduct officer",
    start: { Automatic: 3, Approval: 5 },
    legacyMin: { Automatic: 1440, Approval: 7200 },
    items: [
      {
        id: "ifsca-unit",
        title: "IFSC banking-unit conduct check",
        basis: "IFSCA (Banking) Regulations 2020",
        plain: "Confirms the GIFT City bank handling the money is running the account properly.",
        sec: { Automatic: 5, Approval: 8 },
        mode: "automated",
      },
      {
        id: "ifsca-flow",
        title: "Offshore leg and fund-flow route",
        basis: "IFSCA circular on outbound fund flows",
        plain: "Traces the path the money takes once it leaves the country.",
        sec: { Automatic: 6, Approval: 11 },
        mode: "automated",
      },
      {
        id: "ifsca-report",
        title: "Unit reporting obligations tagged",
        basis: "IFSCA reporting handbook",
        plain: "Marks what the GIFT City unit must report afterwards.",
        sec: { Automatic: 4, Approval: 6 },
        mode: "automated",
      },
    ],
  },
  {
    code: "MoF",
    authority: "Ministry of Finance",
    scope: "Department of Economic Affairs",
    officer: "V. Krishnan",
    seat: "New Delhi node",
    engine: "Policy corpus retrieval + desk officer",
    start: { Automatic: 4, Approval: 6 },
    legacyMin: { Automatic: 2880, Approval: 20160 },
    items: [
      {
        id: "mof-policy",
        title: "Policy conformity for outbound capital of this size",
        basis: "FEMA s.6(3) policy directions",
        plain: "Checks the deal fits national policy on money leaving India.",
        sec: { Automatic: 7, Approval: 38 },
        mode: "manual",
      },
      {
        id: "mof-corridor",
        title: "Corridor and jurisdiction risk rating",
        basis: "DEA corridor risk schedule",
        plain: "Rates the destination country for risk.",
        sec: { Automatic: 5, Approval: 9 },
        mode: "automated",
      },
    ],
  },
  {
    code: "FIU-IND",
    authority: "Financial Intelligence Unit — India",
    scope: "Screening and beneficial ownership",
    officer: "Screening engine",
    seat: "New Delhi node",
    engine: "Alibaba Cloud screening cluster (India-resident)",
    start: { Automatic: 2, Approval: 3 },
    legacyMin: { Automatic: 720, Approval: 2880 },
    items: [
      {
        id: "fiu-ubo",
        title: "Beneficial ownership chain resolved",
        basis: "PMLA Rules, r.9",
        plain: "Works out who really owns the company at the other end.",
        sec: { Automatic: 4, Approval: 6 },
        mode: "automated",
      },
      {
        id: "fiu-sanctions",
        title: "Sanctions and PEP screening",
        basis: "UNSC lists · MHA UAPA orders",
        plain: "Confirms nobody involved is on a watch list.",
        sec: { Automatic: 3, Approval: 5 },
        mode: "automated",
      },
      {
        id: "fiu-pattern",
        title: "Structuring and layering pattern test",
        basis: "FIU typology library",
        plain: "Looks for money being broken up to hide its trail.",
        sec: { Automatic: 5, Approval: 7 },
        mode: "automated",
      },
    ],
  },
  {
    code: "DPIIT",
    authority: "Dept. for Promotion of Industry and Internal Trade",
    scope: "Sector conditions",
    officer: "Sector rules engine",
    seat: "New Delhi node",
    engine: "LangChain sector-condition graph",
    start: { Automatic: 3, Approval: 4 },
    legacyMin: { Automatic: 1440, Approval: 10080 },
    items: [
      {
        id: "dpiit-sector",
        title: "Target activity mapped to the sector schedule",
        basis: "Consolidated FDI/ODI sector conditions",
        plain: "Finds the rules that apply to this particular industry.",
        sec: { Automatic: 4, Approval: 6 },
        mode: "automated",
      },
      {
        id: "dpiit-strategic",
        title: "Strategic-sector and land-border flags",
        basis: "Press Note 3 (2020) analogue for outbound",
        plain: "Flags sensitive industries and neighbouring-country links.",
        sec: { Automatic: 5, Approval: 8 },
        mode: "automated",
      },
    ],
  },
  {
    code: "CBDT",
    authority: "Central Board of Direct Taxes",
    scope: "International taxation",
    officer: "R. Bhattacharya",
    seat: "New Delhi node",
    engine: "Qwen s.195 reasoning + assessing officer",
    start: { Automatic: 4, Approval: 6 },
    legacyMin: { Automatic: 2160, Approval: 8640 },
    items: [
      {
        id: "cbdt-195",
        title: "Section 195 chargeability and withholding rate",
        basis: "Income-tax Act s.195 · applicable DTAA",
        plain: "Fixes how much tax must be held back before the money leaves.",
        sec: { Automatic: 6, Approval: 10 },
        mode: "automated",
      },
      {
        id: "cbdt-trc",
        title: "TRC and Form 10F validity on the non-resident",
        basis: "Rule 21AB · s.90(4)",
        plain: "Checks the foreign party's tax papers are real and current.",
        sec: { Automatic: 4, Approval: 6 },
        mode: "automated",
      },
      {
        id: "cbdt-15ca",
        title: "Form 15CA/15CB pair reconciled",
        basis: "Rule 37BB",
        plain: "Matches the two tax forms that must agree before remittance.",
        sec: { Automatic: 5, Approval: 26 },
        mode: "manual",
      },
    ],
  },
];

export type ItemState = "queued" | "running" | "cleared";

export type LaneProgress = {
  lane: RegulatorLane;
  start: number;
  end: number;
  states: ItemState[];
  cleared: number;
  /** 0 → 1 across this lane's own queue. */
  progress: number;
  done: boolean;
  active: boolean;
  manualCount: number;
  autoCount: number;
};

export function laneProgress(lane: RegulatorLane, route: RouteKey, t: number): LaneProgress {
  const start = lane.start[route];
  let cursor = start;
  const states: ItemState[] = [];
  for (const it of lane.items) {
    const a = cursor;
    const b = cursor + it.sec[route];
    cursor = b;
    states.push(t >= b ? "cleared" : t > a ? "running" : "queued");
  }
  const cleared = states.filter((s) => s === "cleared").length;
  return {
    lane,
    start,
    end: cursor,
    states,
    cleared,
    progress: Math.max(0, Math.min(1, (t - start) / Math.max(1, cursor - start))),
    done: cleared === lane.items.length,
    active: t > start && cleared < lane.items.length,
    manualCount: lane.items.filter((i) => i.mode === "manual").length,
    autoCount: lane.items.filter((i) => i.mode === "automated").length,
  };
}

export function quorumFor(route: RouteKey, t: number): LaneProgress[] {
  return QUORUM_LANES.map((l) => laneProgress(l, route, t));
}

export function quorumWindow(route: RouteKey) {
  const ends = QUORUM_LANES.map((l) => laneProgress(l, route, Number.MAX_SAFE_INTEGER).end);
  const starts = QUORUM_LANES.map((l) => l.start[route]);
  const serial = QUORUM_LANES.reduce(
    (a, l) => a + l.items.reduce((s, i) => s + i.sec[route], 0),
    0,
  );
  return {
    open: Math.min(...starts),
    close: Math.max(...ends),
    serial,
    parallelSaving: serial - (Math.max(...ends) - Math.min(...starts)),
  };
}

export function quorumTotals(route: RouteKey) {
  const items = QUORUM_LANES.flatMap((l) => l.items);
  const manual = items.filter((i) => i.mode === "manual");
  const secAll = items.reduce((a, i) => a + i.sec[route], 0);
  const secManual = manual.reduce((a, i) => a + i.sec[route], 0);
  return {
    checks: items.length,
    manual: manual.length,
    automated: items.length - manual.length,
    autoShare: Math.round(((items.length - manual.length) / items.length) * 100),
    secAll,
    secManual,
    manualTimeShare: Math.round((secManual / secAll) * 100),
  };
}

/** Per-regulator approval ETA: what the engine needs now, against the desk's legacy turnaround. */
export type LaneEta = {
  code: string;
  /** Seconds from dispatch until this desk's last item is signed. */
  etaSec: number;
  /** Seconds of queue work owned by this desk. */
  queueSec: number;
  /** "seconds" when the whole desk closes inside a minute, else "minutes". */
  unit: "seconds" | "minutes";
  label: string;
  legacyMin: number;
  legacyLabel: string;
  /** How many times faster the rail is than the legacy desk. */
  speedup: number;
};

export function fmtEta(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const r = Math.round(sec % 60);
  return `${m}m ${String(r).padStart(2, "0")}s`;
}

export function fmtLegacy(min: number): string {
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} working days`;
}

export function laneEta(lane: RegulatorLane, route: RouteKey): LaneEta {
  const queueSec = lane.items.reduce((a, i) => a + i.sec[route], 0);
  const etaSec = lane.start[route] + queueSec;
  const legacy = lane.legacyMin[route];
  return {
    code: lane.code,
    etaSec,
    queueSec,
    unit: etaSec < 60 ? "seconds" : "minutes",
    label: fmtEta(etaSec),
    legacyMin: legacy,
    legacyLabel: fmtLegacy(legacy),
    speedup: Math.round((legacy * 60) / Math.max(1, etaSec)),
  };
}

export function quorumEtas(route: RouteKey): LaneEta[] {
  return QUORUM_LANES.map((l) => laneEta(l, route));
}
