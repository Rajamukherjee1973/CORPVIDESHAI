/**
 * Head-to-head benchmark of the CorpVidesh AI rail against the incumbent
 * systems an Indian treasury actually touches today. Every claim here is a
 * capability statement about the prototype, not a market forecast.
 */

export type Incumbent = {
  key: string;
  name: string;
  kind: string;
  /** What the system is genuinely excellent at — stated fairly. */
  strength: string;
  /** Where it stops, for an outbound Indian filing. */
  stops: string;
};

export const INCUMBENTS: Incumbent[] = [
  {
    key: "bloomberg",
    name: "Bloomberg Terminal / Entity Exchange",
    kind: "Market data and counterparty onboarding",
    strength: "Unmatched price discovery, FX depth and counterparty reference data.",
    stops:
      "It prices the corridor; it does not decide the statutory route. No Rule 7 ceiling test, no AD-bank filing, no Indian regulator on the record.",
  },
  {
    key: "reuters",
    name: "LSEG / Reuters Refinitiv World-Check",
    kind: "News, market data and screening",
    strength: "Global screening lists, sanction data and the fastest newsroom on the tape.",
    stops:
      "Screening is an input to a decision made elsewhere. It never produces Form A2, 15CA/15CB or a UIN, and the supervisor still receives a report after the fact.",
  },
  {
    key: "rbi",
    name: "RBI FIRMS / OID portal + AD-bank email",
    kind: "Statutory filing portal",
    strength: "The system of record for ODI/OPI reporting, and the only lawful destination of the filing.",
    stops:
      "It receives a finished file; it does not help build one. The reasoning, the annexures and the reconciliation all happen off-portal, in email and PDF, over weeks.",
  },
  {
    key: "cleartax",
    name: "ClearTax / Signzy / KPMG toolkits",
    kind: "Indian tax and KYC automation",
    strength: "Strong form automation for domestic tax filing and customer onboarding.",
    stops:
      "Single-statute tools. Section 195 chargeability, FEMA route logic and regulator quorum are not one workflow, so the treasury re-keys the same facts three times.",
  },
  {
    key: "swift",
    name: "SWIFT gpi + core banking",
    kind: "Payment messaging",
    strength: "Reliable settlement tracking once the money is already cleared to move.",
    stops:
      "gpi tracks the payment, not the permission. Everything expensive happens before the MT103 exists.",
  },
];

export type Capability = {
  key: string;
  label: string;
  note: string;
  /** true = present, false = absent, "partial" = partly present. */
  scores: Record<string, boolean | "partial">;
};

/** Column order for the matrix: our rail first, then the incumbents. */
export const MATRIX: Capability[] = [
  {
    key: "route",
    label: "Decides Automatic vs Approval route in-session",
    note: "Rule 7 of the FEM (Overseas Investment) Rules 2022 tested against audited net worth, with the provision quoted.",
    scores: { corpvidesh: true, bloomberg: false, reuters: false, rbi: false, cleartax: "partial", swift: false },
  },
  {
    key: "ceiling",
    label: "400% financial-commitment ceiling computed live",
    note: "Net worth, utilised commitment and headroom re-read from the latest adopted balance sheet.",
    scores: { corpvidesh: true, bloomberg: false, reuters: false, rbi: "partial", cleartax: false, swift: false },
  },
  {
    key: "s195",
    label: "Section 195 chargeability — Royalty vs FTS branch walk",
    note: "DTAA article, make-available test, TRC and Form 10F validity resolved before the remittance is priced.",
    scores: { corpvidesh: true, bloomberg: false, reuters: false, rbi: false, cleartax: "partial", swift: false },
  },
  {
    key: "forms",
    label: "15CA / 15CB and Form A2 generated and reconciled",
    note: "Rule 37BB part determined from the facts already on the file — not re-keyed by a consultant.",
    scores: { corpvidesh: true, bloomberg: false, reuters: false, rbi: "partial", cleartax: "partial", swift: false },
  },
  {
    key: "quorum",
    label: "Six regulators read the same record in parallel",
    note: "RBI, IFSCA, MoF, FIU-IND, DPIIT and CBDT attach to one dossier while the transaction is still forming.",
    scores: { corpvidesh: true, bloomberg: false, reuters: false, rbi: false, cleartax: false, swift: false },
  },
  {
    key: "ledger",
    label: "Append-only hash-chained evidence ledger",
    note: "Regulator is a channel member, not a recipient. No page can be swapped after filing.",
    scores: { corpvidesh: true, bloomberg: false, reuters: false, rbi: false, cleartax: false, swift: "partial" },
  },
  {
    key: "zkp",
    label: "Ceiling proved without disclosing the balance sheet",
    note: "Groth16 circuit proves compliance; the underlying figures never leave the filer.",
    scores: { corpvidesh: true, bloomberg: false, reuters: false, rbi: false, cleartax: false, swift: false },
  },
  {
    key: "voice",
    label: "38+ language voice narration with downloadable transcript",
    note: "A promoter in Surat hears the same statutory reasoning the AD bank reads.",
    scores: { corpvidesh: true, bloomberg: false, reuters: false, rbi: false, cleartax: false, swift: false },
  },
  {
    key: "breach",
    label: "Live breach containment with quorum-signed rollback",
    note: "Unauthorised access, ledger tamper, bulk exfiltration and payment hijack contained on the record.",
    scores: { corpvidesh: true, bloomberg: "partial", reuters: "partial", rbi: false, cleartax: false, swift: "partial" },
  },
  {
    key: "clock",
    label: "Clearance measured in minutes, not weeks",
    note: "Nine minutes on the demonstrated corridor against a 28-day median.",
    scores: { corpvidesh: true, bloomberg: false, reuters: false, rbi: false, cleartax: false, swift: "partial" },
  },
];

export const COLUMNS = [
  { key: "corpvidesh", label: "CorpVidesh AI", short: "CVAI" },
  { key: "bloomberg", label: "Bloomberg", short: "BBG" },
  { key: "reuters", label: "Reuters / LSEG", short: "LSEG" },
  { key: "rbi", label: "RBI FIRMS", short: "FIRMS" },
  { key: "cleartax", label: "ClearTax / Signzy", short: "IN-TOOLS" },
  { key: "swift", label: "SWIFT gpi", short: "GPI" },
];

/** Count of full capabilities held by each column, for the score strip. */
export function score(col: string): number {
  return MATRIX.filter((m) => m.scores[col] === true).length;
}

export const UNIQUE_CLAIMS = [
  {
    t: "It reasons in statute, not in data",
    d: "Bloomberg and Reuters are magnificent at telling you what a currency costs. Neither will tell you whether the law lets you send it. This rail starts at the provision and ends at the payment.",
  },
  {
    t: "The regulator sits inside the transaction",
    d: "Every incumbent posts a return to a supervisor after settlement. Here six Indian regulators are channel members on the same append-only ledger while the file is still being formed.",
  },
  {
    t: "One file, five statutes",
    d: "FEMA, the ODI/OPI Rules, the Income-tax Act s.195, the applicable DTAA and PMLA are answered from a single keyed intake. Nobody re-builds the document set five times.",
  },
  {
    t: "Proof without disclosure",
    d: "A zero-knowledge circuit proves the 400% ceiling is respected without handing the balance sheet to anyone. That is a posture no filing portal offers today.",
  },
  {
    t: "Sovereign by construction",
    d: "India-resident deployment inside the GIFT IFSC perimeter with AD-bank and regulator endpoints. No Indian statutory record crosses a border to be processed.",
  },
];
