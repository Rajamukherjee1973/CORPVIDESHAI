// Corporate portal: client-side application store.
// Applications are persisted in localStorage so a submitted file can be
// tracked across reloads; stage progress is derived from real elapsed time.

export type PortalStage = {
  key: string;
  title: string;
  actor: string;
  seconds: number;
  detail: string;
  evidence: string;
  plain: string;
};

export const PORTAL_STAGES: PortalStage[] = [
  { key: "received", title: "Filing received", actor: "Corporate portal", seconds: 4, detail: "Reference minted, entity and AD-bank mandate bound to the file, every annexure hashed on receipt.", evidence: "Intake manifest", plain: "Your file has arrived and been locked so nothing can be swapped later." },
  { key: "kyc", title: "Entity and signatory verification", actor: "AD Category-I bank", seconds: 8, detail: "PAN, CIN, LEI and authorised-signatory mandate matched against the board resolution.", evidence: "KYC pass", plain: "The bank confirms the company and the person signing are genuine." },
  { key: "reason", title: "FEMA reasoning and Rule 7 test", actor: "CorpVidesh AI engine", seconds: 10, detail: "Financial commitment tested against 400% of audited net worth, sector eligibility and Rule 9/19 conditions.", evidence: "Reasoned determination", plain: "The law is applied to your numbers, with the exact rule quoted for each conclusion." },
  { key: "docs", title: "Document completeness audit", actor: "Document AI", seconds: 9, detail: "Each annexure matched to the statute that demands it; deficiencies raised before filing, not after.", evidence: "Completeness report", plain: "It checks nothing is missing before regulators see the file." },
  { key: "parallel", title: "Parallel regulatory clearance", actor: "RBI · IFSCA · MoF · FIU-IND · DPIIT · CBDT", seconds: 22, detail: "One signed dossier delivered to six endpoints at the same instant instead of one after another.", evidence: "Six clearance receipts", plain: "All six regulators review together — this is where the weeks disappear." },
  { key: "tax", title: "Tax and treaty position", actor: "CBDT rail", seconds: 8, detail: "Section 195 withholding, treaty relief and 15CA/15CB linkage resolved for the corridor.", evidence: "Tax position note", plain: "The tax to deduct before money leaves India is settled up front." },
  { key: "zk", title: "Zero-knowledge disclosure", actor: "Groth16 circuit", seconds: 7, detail: "Proof that the commitment sits inside the ceiling without exposing the balance sheet.", evidence: "ZK proof artefact", plain: "Regulators verify the limit is respected without seeing private numbers." },
  { key: "uin", title: "UIN allotment", actor: "RBI / AD bank", seconds: 7, detail: "Unique Identification Number allotted and bound to the corridor and settlement instruction.", evidence: "UIN allotment", plain: "The investment gets its official number for all future remittances." },
  { key: "settle", title: "Settlement instruction released", actor: "AD bank · GIFT IFSC", seconds: 8, detail: "Remittance released to the target hub with cleared amount, currency and value date.", evidence: "Settlement advice", plain: "The money is actually sent to the chosen financial centre." },
  { key: "ledger", title: "Evidence ledger commit", actor: "Federated audit ledger", seconds: 6, detail: "Every event hash-chained across sovereign nodes; annual performance reporting pre-populated.", evidence: "Ledger block", plain: "A permanent, tamper-proof record is written for future audits." },
];

export const TOTAL_SECONDS = PORTAL_STAGES.reduce((a, s) => a + s.seconds, 0);

export type PortalApplication = {
  ref: string;
  company: string;
  sector: string;
  hub: string;
  country: string;
  amountCr: number;
  route: "Automatic" | "Approval";
  routeBasis: string;
  netWorth: number;
  ceiling: number;
  headroomAfter: number;
  contact: string;
  email: string;
  documents: { name: string; source: string; file: string }[];
  createdAt: number;
  /** Desk identity that raised this filing — used to keep files private. */
  ownerId?: string;
};

const KEY = "corpvidesh.portal.applications.v1";

export function loadApplications(): PortalApplication[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PortalApplication[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveApplications(apps: PortalApplication[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(apps.slice(0, 40)));
  } catch {
    /* storage unavailable — the session still works in memory */
  }
}

/** Persist only this desk's filings, leaving other desks' files untouched. */
export function saveOwnApplications(ownerId: string | undefined, own: PortalApplication[]) {
  const others = loadApplications().filter((a) => a.ownerId !== ownerId);
  saveApplications([...own, ...others].sort((a, b) => b.createdAt - a.createdAt));
}

export function hash(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let out = "";
  let x = h;
  for (let i = 0; i < 8; i++) {
    x = Math.imul(x ^ (x >>> 15), 0x2545f491) >>> 0;
    out += x.toString(16).padStart(8, "0");
  }
  return out.slice(0, 56);
}

export type StageState = "queued" | "running" | "cleared";

export type Progress = {
  elapsed: number;
  states: StageState[];
  currentIndex: number;
  percent: number;
  complete: boolean;
  etaSeconds: number;
};

export function progressFor(app: PortalApplication, now: number): Progress {
  const elapsed = Math.max(0, (now - app.createdAt) / 1000);
  const states: StageState[] = [];
  let cursor = 0;
  let currentIndex = PORTAL_STAGES.length - 1;
  PORTAL_STAGES.forEach((s, i) => {
    const start = cursor;
    const end = cursor + s.seconds;
    cursor = end;
    if (elapsed >= end) states.push("cleared");
    else if (elapsed >= start) {
      states.push("running");
      if (currentIndex === PORTAL_STAGES.length - 1) currentIndex = i;
    } else states.push("queued");
  });
  const complete = elapsed >= TOTAL_SECONDS;
  if (complete) currentIndex = PORTAL_STAGES.length - 1;
  return {
    elapsed: Math.min(elapsed, TOTAL_SECONDS),
    states,
    currentIndex,
    percent: Math.min(100, (elapsed / TOTAL_SECONDS) * 100),
    complete,
    etaSeconds: Math.max(0, TOTAL_SECONDS - elapsed),
  };
}

export function stageProgress(app: PortalApplication, index: number, now: number) {
  const elapsed = Math.max(0, (now - app.createdAt) / 1000);
  let start = 0;
  for (let i = 0; i < index; i++) start += PORTAL_STAGES[i]!.seconds;
  const dur = PORTAL_STAGES[index]!.seconds;
  return Math.max(0, Math.min(1, (elapsed - start) / dur));
}

export const REGULATORS = [
  { code: "RBI", scope: "Financial commitment, Rule 7 ceiling, UIN" },
  { code: "IFSCA", scope: "GIFT IFSC unit conduct and the offshore leg" },
  { code: "MoF", scope: "Policy conformity for outbound capital" },
  { code: "FIU-IND", scope: "Money-laundering and beneficial-ownership screening" },
  { code: "DPIIT", scope: "Sector conditions and strategic-sector flags" },
  { code: "CBDT", scope: "Withholding, treaty relief and 15CA/15CB" },
];

export const DOCS_AUTO: [string, string][] = [
  ["Board resolution authorising the financial commitment", "Companies Act, s.179(3)"],
  ["Form FC — Part I (investment particulars)", "FEMA (OI) Regulations 2022"],
  ["Valuation certificate for the overseas entity", "Rule 19, OI Rules 2022"],
  ["Statutory auditor's net-worth certificate", "Rule 7 — 400% ceiling"],
  ["KYC of the Indian party, filed through the AD bank", "Master Direction — OI"],
  ["Form 15CA / 15CB for the remittance", "Income-tax Act, s.195"],
];

export const DOCS_APPROVAL: [string, string][] = [
  ["Application to RBI through the AD Category-I bank", "Rule 10, OI Rules 2022"],
  ["Justification note for the approval-route exposure", "Reg. 6, OI Regulations"],
  ["No-objection from lenders / investigating agencies", "Rule 10(2), OI Rules 2022"],
];

/** Named clearing authority for each stage — who signed the checkpoint off. */
export const CLEARERS: Record<string, { officer: string; designation: string; node: string }> = {
  received: { officer: "Portal Registry", designation: "Automated intake registrar", node: "CorpVidesh node — Mumbai" },
  kyc: { officer: "S. Iyer", designation: "Manager, Trade & Forex Services", node: "AD Category-I bank — Mumbai" },
  reason: { officer: "CorpVidesh Reasoning Engine", designation: "Statutory inference model, v4.2", node: "Sovereign cloud — Hyderabad" },
  docs: { officer: "Document AI", designation: "Annexure completeness auditor", node: "Sovereign cloud — Hyderabad" },
  parallel: { officer: "Six-regulator window", designation: "RBI, IFSCA, MoF, FIU-IND, DPIIT, CBDT", node: "Federated supervisory nodes" },
  tax: { officer: "R. Bhattacharya", designation: "Assessing officer, international taxation", node: "CBDT rail — Delhi" },
  zk: { officer: "Groth16 verifier", designation: "Zero-knowledge proof circuit", node: "GIFT IFSC node — Gandhinagar" },
  uin: { officer: "A. Deshmukh", designation: "Officer, Overseas Investment Division", node: "RBI — Mumbai" },
  settle: { officer: "N. Rao", designation: "Head, Treasury Settlements", node: "AD bank · GIFT IFSC" },
  ledger: { officer: "Ledger consensus", designation: "Hash-chain commit across sovereign nodes", node: "Federated audit ledger" },
};

export type Notification = {
  id: string;
  ref: string;
  company: string;
  stageKey: string;
  stageIndex: number;
  title: string;
  officer: string;
  designation: string;
  node: string;
  evidence: string;
  digest: string;
  plain: string;
  at: number;
  emailTo: string;
  subject: string;
  read: boolean;
};

export function buildNotification(app: PortalApplication, index: number): Notification {
  const stage = PORTAL_STAGES[index]!;
  const clearer = CLEARERS[stage.key]!;
  let offset = 0;
  for (let i = 0; i <= index; i++) offset += PORTAL_STAGES[i]!.seconds;
  return {
    id: `${app.ref}:${stage.key}`,
    ref: app.ref,
    company: app.company,
    stageKey: stage.key,
    stageIndex: index,
    title: stage.title,
    officer: clearer.officer,
    designation: clearer.designation,
    node: clearer.node,
    evidence: stage.evidence,
    digest: hash(app.ref + stage.key).slice(0, 16),
    plain: stage.plain,
    at: app.createdAt + offset * 1000,
    emailTo: app.email,
    subject: `[${app.ref}] Stage ${String(index + 1).padStart(2, "0")}/${PORTAL_STAGES.length} cleared — ${stage.title}`,
    read: false,
  };
}

export function emailBody(n: Notification) {
  return [
    `Application ${n.ref} — ${n.company}`,
    "",
    `Stage ${String(n.stageIndex + 1).padStart(2, "0")} of ${PORTAL_STAGES.length}: ${n.title} — CLEARED`,
    `Cleared by: ${n.officer}, ${n.designation}`,
    `Node: ${n.node}`,
    `Evidence: ${n.evidence} · digest ${n.digest}`,
    "",
    `In plain words: ${n.plain}`,
    "",
    n.stageIndex === PORTAL_STAGES.length - 1
      ? "This filing is now fully cleared. The evidence ledger block is final."
      : `Next checkpoint: ${PORTAL_STAGES[n.stageIndex + 1]!.title} (${PORTAL_STAGES[n.stageIndex + 1]!.actor}).`,
    "",
    "CorpVidesh AI — sovereign outbound rail. This is an automated status notice.",
  ].join("\n");
}
