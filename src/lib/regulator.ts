// Regulator approval desk + AD-bank processing rail.
// Everything here is derived from the same PortalApplication records the
// corporate portal writes, so both surfaces read one shared state.

import { PORTAL_STAGES, hash, progressFor, type PortalApplication } from "@/lib/portal";

/** AI/cloud layer labels shown on each machine-run step. */
export type Engine = "qwen" | "langchain" | "alicloud" | "fabric" | "manual";

export const ENGINE_META: Record<Engine, { label: string; note: string }> = {
  qwen: {
    label: "Qwen · reasoning",
    note: "Statutory reasoning model reads the rule and the filing together, and writes the conclusion with the rule quoted.",
  },
  langchain: {
    label: "LangChain · orchestration",
    note: "Chains the retrieval, tool calls and checks in a fixed order so every filing is examined the same way.",
  },
  alicloud: {
    label: "Alibaba Cloud · compute",
    note: "Runs the heavy document and screening workloads in an India-resident region.",
  },
  fabric: {
    label: "Federated ledger",
    note: "Each result is hash-chained into a block every regulator node holds a copy of.",
  },
  manual: {
    label: "Human desk",
    note: "A named officer signs this off. The machine only prepares the file.",
  },
};

/* ------------------------------------------------------------------ */
/* AD bank processing rail                                             */
/* ------------------------------------------------------------------ */

export type AdEvent = {
  id: string;
  at: number;
  ref: string;
  company: string;
  bank: string;
  desk: string;
  action: string;
  engine: Engine;
  digest: string;
};

const BANKS = [
  "HDFC Bank — AD Cat-I",
  "ICICI Bank — AD Cat-I",
  "State Bank of India — AD Cat-I",
  "Axis Bank — AD Cat-I",
  "Kotak Mahindra Bank — AD Cat-I",
];

export function bankFor(app: PortalApplication) {
  const h = parseInt(hash(app.company).slice(0, 6), 16);
  return BANKS[h % BANKS.length]!;
}

const AD_STEPS: { desk: string; action: string; engine: Engine }[] = [
  { desk: "Trade & Forex intake", action: "Mandate and signatory list bound to the reference", engine: "manual" },
  { desk: "KYC / AML", action: "Entity, UBO chain and sanctions screening cleared", engine: "alicloud" },
  { desk: "FEMA reasoning", action: "Rule 7 headroom tested against audited net worth", engine: "qwen" },
  { desk: "Annexure audit", action: "Every annexure matched to the statute demanding it", engine: "langchain" },
  { desk: "Regulatory dispatch", action: "Signed dossier pushed to the supervisory window", engine: "fabric" },
  { desk: "Taxation", action: "Section 195 withholding and 15CA/15CB pair validated", engine: "qwen" },
  { desk: "Disclosure", action: "Ceiling proof accepted without balance-sheet disclosure", engine: "fabric" },
  { desk: "UIN desk", action: "UIN request lodged and allotment received", engine: "manual" },
  { desk: "Treasury settlement", action: "Remittance released with value date confirmed", engine: "manual" },
  { desk: "Records", action: "Evidence bundle committed to the federated ledger", engine: "fabric" },
];

/** AD-bank events for one filing, up to the checkpoint reached at `now`. */
export function adEventsFor(app: PortalApplication, now: number): AdEvent[] {
  const p = progressFor(app, now);
  const bank = bankFor(app);
  const out: AdEvent[] = [];
  let offset = 0;
  PORTAL_STAGES.forEach((s, i) => {
    offset += s.seconds;
    const step = AD_STEPS[i]!;
    if (p.states[i] === "queued") return;
    out.push({
      id: `${app.ref}:ad:${i}`,
      at: app.createdAt + offset * 1000,
      ref: app.ref,
      company: app.company,
      bank,
      desk: step.desk,
      action: p.states[i] === "cleared" ? step.action : `${step.action} — in progress`,
      engine: step.engine,
      digest: hash(app.ref + "ad" + i).slice(0, 12),
    });
  });
  return out;
}

export function adTape(apps: PortalApplication[], now: number): AdEvent[] {
  return apps
    .flatMap((a) => adEventsFor(a, now))
    .sort((a, b) => b.at - a.at)
    .slice(0, 60);
}

/* ------------------------------------------------------------------ */
/* Regulator approval desk (Approval route)                            */
/* ------------------------------------------------------------------ */

export type RegulatorTask = {
  code: string;
  scope: string;
  officer: string;
  mode: "automated" | "manual";
  engine: Engine;
  test: string;
  plain: string;
};

export const REG_TASKS: RegulatorTask[] = [
  {
    code: "RBI",
    scope: "Overseas Investment Division",
    officer: "A. Deshmukh",
    mode: "manual",
    engine: "manual",
    test: "Rule 10 justification for exceeding the 400% ceiling; UIN allotment held until signed.",
    plain: "The central bank decides whether the company may send more than the normal limit allows.",
  },
  {
    code: "IFSCA",
    scope: "GIFT IFSC conduct",
    officer: "M. Shah",
    mode: "manual",
    engine: "manual",
    test: "Unit conduct, offshore leg and fund-flow route through the IFSC verified.",
    plain: "The GIFT City authority checks the offshore side of the deal is properly run.",
  },
  {
    code: "MoF",
    scope: "Department of Economic Affairs",
    officer: "V. Krishnan",
    mode: "manual",
    engine: "manual",
    test: "Policy conformity for outbound capital of this size and corridor.",
    plain: "The finance ministry checks the deal fits national policy on money leaving India.",
  },
  {
    code: "FIU-IND",
    scope: "Financial Intelligence Unit",
    officer: "Screening engine",
    mode: "automated",
    engine: "alicloud",
    test: "Beneficial ownership, PEP and sanctions screening across the step-down chain.",
    plain: "An automated check confirms nobody behind the deal is on a watch list.",
  },
  {
    code: "DPIIT",
    scope: "Sector conditions",
    officer: "Sector rules engine",
    mode: "automated",
    engine: "langchain",
    test: "Strategic-sector flags and sectoral conditions applied to the target activity.",
    plain: "The rules for this particular industry are applied automatically.",
  },
  {
    code: "CBDT",
    scope: "International taxation",
    officer: "R. Bhattacharya",
    mode: "manual",
    engine: "qwen",
    test: "Section 195 withholding and treaty relief confirmed before release.",
    plain: "The tax office confirms the right tax is held back before money leaves.",
  },
];

export type Decision = { status: "approved" | "queried"; officer: string; at: number; note: string };
export type DecisionMap = Record<string, Record<string, Decision>>;

const DKEY = "corpvidesh.regulator.decisions.v1";

export function loadDecisions(): DecisionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DKEY);
    return raw ? (JSON.parse(raw) as DecisionMap) : {};
  } catch {
    return {};
  }
}

export function saveDecisions(d: DecisionMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DKEY, JSON.stringify(d));
  } catch {
    /* storage unavailable */
  }
}

/** Automated desks clear themselves once the parallel window opens. */
export function autoDecisions(app: PortalApplication, now: number): Record<string, Decision> {
  const p = progressFor(app, now);
  const idx = PORTAL_STAGES.findIndex((s) => s.key === "parallel");
  if (p.states[idx] !== "cleared") return {};
  const at = app.createdAt + PORTAL_STAGES.slice(0, idx + 1).reduce((a, s) => a + s.seconds, 0) * 1000;
  const out: Record<string, Decision> = {};
  for (const t of REG_TASKS) {
    if (t.mode !== "automated") continue;
    out[t.code] = { status: "approved", officer: t.officer, at, note: "Cleared by rule engine — no exception raised." };
  }
  return out;
}

/** For Automatic-route filings every desk is machine-cleared, post-facto. */
export function automaticRouteDecisions(app: PortalApplication, now: number): Record<string, Decision> {
  const p = progressFor(app, now);
  const idx = PORTAL_STAGES.findIndex((s) => s.key === "parallel");
  if (p.states[idx] === "queued") return {};
  const at = app.createdAt + PORTAL_STAGES.slice(0, idx + 1).reduce((a, s) => a + s.seconds, 0) * 1000;
  const out: Record<string, Decision> = {};
  for (const t of REG_TASKS) {
    out[t.code] = {
      status: "approved",
      officer: t.officer,
      at,
      note: "Automatic route — noted on the record, no prior permission required.",
    };
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Federated blockchain view                                           */
/* ------------------------------------------------------------------ */

export type Block = {
  height: number;
  at: number;
  ref: string;
  node: string;
  payload: string;
  mode: "automated" | "manual";
  prev: string;
  digest: string;
};

const NODES = ["RBI node — Mumbai", "IFSCA node — Gandhinagar", "CBDT node — Delhi", "AD-bank node — Mumbai", "FIU node — Delhi"];

export function chainFor(apps: PortalApplication[], now: number, decisions: DecisionMap): Block[] {
  type Raw = { at: number; ref: string; payload: string; mode: "automated" | "manual"; node: string };
  const raw: Raw[] = [];
  for (const app of apps) {
    const p = progressFor(app, now);
    let offset = 0;
    PORTAL_STAGES.forEach((s, i) => {
      offset += s.seconds;
      if (p.states[i] !== "cleared") return;
      raw.push({
        at: app.createdAt + offset * 1000,
        ref: app.ref,
        payload: `${s.title} — ${s.evidence}`,
        mode: AD_STEPS[i]!.engine === "manual" ? "manual" : "automated",
        node: NODES[i % NODES.length]!,
      });
    });
    const d = decisions[app.ref] ?? {};
    for (const [code, dec] of Object.entries(d)) {
      raw.push({
        at: dec.at,
        ref: app.ref,
        payload: `${code} ${dec.status === "approved" ? "approval" : "query"} — ${dec.officer}`,
        mode: REG_TASKS.find((t) => t.code === code)?.mode ?? "manual",
        node: `${code} node`,
      });
    }
  }
  raw.sort((a, b) => a.at - b.at);
  let prev = "genesis0000";
  const blocks: Block[] = raw.map((r, i) => {
    const digest = hash(prev + r.ref + r.payload).slice(0, 16);
    const b: Block = {
      height: 4821306 + i,
      at: r.at,
      ref: r.ref,
      node: r.node,
      payload: r.payload,
      mode: r.mode,
      prev: prev.slice(0, 12),
      digest,
    };
    prev = digest;
    return b;
  });
  return blocks.reverse().slice(0, 80);
}
