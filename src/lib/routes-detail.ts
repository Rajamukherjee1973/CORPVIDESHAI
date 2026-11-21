// Automatic route vs Approval route: the full statutory execution detail,
// the manual input points, and what each regulator actually does.

export type RouteKey = "Automatic" | "Approval";

export type Actor = "Corporate" | "AD bank" | "Engine" | "Regulator" | "Ledger";

export type RouteStep = {
  id: string;
  title: string;
  /** Seconds consumed on the automated rail, per route. */
  seconds: Record<RouteKey, number>;
  /** Which routes execute this step at all. */
  routes: RouteKey[];
  actor: Actor;
  basis: string;
  automated: string;
  manual: string;
  evidence: string;
  plain: string;
  /** Manual field the human must supply before the step can clear. */
  input?: { key: string; label: string; hint: string; kind: "text" | "number" | "select"; options?: string[] };
};

export const ROUTE_STEPS: RouteStep[] = [
  {
    id: "identity",
    title: "Identity and mandate capture",
    seconds: { Automatic: 20, Approval: 20 },
    routes: ["Automatic", "Approval"],
    actor: "Corporate",
    basis: "Companies Act s.179(3); Master Direction — Overseas Investment",
    automated: "PAN, CIN and LEI resolved from the registry; the board resolution is parsed and the authorised signatory matched automatically.",
    manual: "Treasury types the entity name and uploads the signed board resolution; the AD bank officer eyeballs the signatory list.",
    evidence: "Intake manifest hash",
    plain: "We confirm which company is sending money and who is allowed to sign for it.",
    input: { key: "entity", label: "Indian party (entity name)", hint: "The listed or unlisted company making the commitment.", kind: "text" },
  },
  {
    id: "target",
    title: "Target entity and corridor",
    seconds: { Automatic: 25, Approval: 25 },
    routes: ["Automatic", "Approval"],
    actor: "Corporate",
    basis: "Rule 9, FEM (Overseas Investment) Rules 2022",
    automated: "The hub is matched to its regulator, currency and treaty position; the corridor's standing conditions load themselves.",
    manual: "Treasury names the overseas entity, its country and the activity code, and counsel writes a corridor note by hand.",
    evidence: "Corridor determination",
    plain: "We record where the money is going and which country's rules also apply.",
    input: { key: "hub", label: "Target financial hub", hint: "One of the 52 hubs served by the rail.", kind: "select", options: ["Singapore", "Dubai (DIFC)", "London", "New York", "Mauritius", "Amsterdam", "Zurich", "Tokyo"] },
  },
  {
    id: "amount",
    title: "Financial commitment stated",
    seconds: { Automatic: 20, Approval: 20 },
    routes: ["Automatic", "Approval"],
    actor: "Corporate",
    basis: "Rule 2(g) — definition of financial commitment",
    automated: "Equity, debt, guarantees and pledges are aggregated at group level from the ledger, not re-keyed.",
    manual: "Each limb of the commitment is typed into a spreadsheet and reconciled against the group treasury file.",
    evidence: "Commitment schedule",
    plain: "We add up everything the company is putting at risk abroad, not just the shares it buys.",
    input: { key: "amount", label: "Amount to be sent (INR crore)", hint: "Equity plus debt plus guarantees.", kind: "number" },
  },
  {
    id: "networth",
    title: "Audited net worth ingested",
    seconds: { Automatic: 20, Approval: 20 },
    routes: ["Automatic", "Approval"],
    actor: "Engine",
    basis: "Rule 7 — 400% of audited net worth",
    automated: "The statutory auditor's certificate is read, the figure extracted and cross-checked against the last filed balance sheet.",
    manual: "The auditor issues a certificate on letterhead; the bank re-types the number and checks it twice.",
    evidence: "Net-worth certificate lineage",
    plain: "The law lets a company commit up to four times its own audited net worth. First we need that number.",
    input: { key: "networth", label: "Audited net worth (INR crore)", hint: "As certified by the statutory auditor.", kind: "number" },
  },
  {
    id: "rule7",
    title: "Rule 7 ceiling test — the route is decided here",
    seconds: { Automatic: 35, Approval: 35 },
    routes: ["Automatic", "Approval"],
    actor: "Engine",
    basis: "Rule 7 read with Rule 10, OI Rules 2022",
    automated: "Deterministic rule code computes the ceiling and the headroom, then declares Automatic or Approval with the provision quoted.",
    manual: "A partner at a law firm opines in a memo, usually after a week and often with a hedged conclusion.",
    evidence: "Reasoned route determination",
    plain: "Inside four times net worth and in a permitted activity: Automatic. Outside it: the RBI must say yes first.",
  },
  {
    id: "docs",
    title: "Annexure completeness audit",
    seconds: { Automatic: 40, Approval: 55 },
    routes: ["Automatic", "Approval"],
    actor: "Engine",
    basis: "Master Direction — OI, annexure schedule",
    automated: "Each annexure is matched to the statute that demands it; a missing paper is raised before a regulator ever sees the file.",
    manual: "A checklist is printed and ticked by hand; deficiencies surface weeks later as a query letter.",
    evidence: "Completeness report",
    plain: "Nothing is submitted half-finished, which is what normally causes the long delays.",
  },
  {
    id: "aml",
    title: "Beneficial ownership and AML screening",
    seconds: { Automatic: 35, Approval: 45 },
    routes: ["Automatic", "Approval"],
    actor: "AD bank",
    basis: "PMLA 2002; FIU-IND reporting obligations",
    automated: "The step-down chain is walked to ultimate beneficial owners and screened against sanctions and PEP lists in one pass.",
    manual: "The bank's compliance desk runs names one at a time through separate subscription terminals.",
    evidence: "UBO attestation",
    plain: "We check who really owns the overseas company and that nobody on it is sanctioned.",
  },
  {
    id: "valuation",
    title: "Valuation certificate cross-check",
    seconds: { Automatic: 30, Approval: 40 },
    routes: ["Automatic", "Approval"],
    actor: "Engine",
    basis: "Rule 19, OI Rules 2022",
    automated: "The valuer's certificate is bound to the price actually paid; any gap is flagged with its magnitude.",
    manual: "The certificate is filed in a folder and only compared to the price if a query is raised.",
    evidence: "Certificate lineage hash",
    plain: "We confirm the price paid abroad is a fair one, so value is not being shifted out of India.",
  },
  {
    id: "tax",
    title: "Section 195 and treaty position",
    seconds: { Automatic: 35, Approval: 40 },
    routes: ["Automatic", "Approval"],
    actor: "Engine",
    basis: "Income-tax Act s.195 read with the applicable DTAA article",
    automated: "Withholding, treaty relief and the 15CA/15CB pair are resolved and pre-validated for the corridor.",
    manual: "A chartered accountant prepares 15CB, the treasury files 15CA, and the pair is reconciled by hand.",
    evidence: "15CA/15CB pair",
    plain: "The tax to be deducted before money leaves India is settled up front, not argued about later.",
  },
  {
    id: "zk",
    title: "Zero-knowledge headroom proof",
    seconds: { Automatic: 30, Approval: 30 },
    routes: ["Automatic", "Approval"],
    actor: "Engine",
    basis: "Rule 7 ceiling, proved without disclosure",
    automated: "A Groth16 circuit proves the commitment sits inside the ceiling without revealing the balance sheet.",
    manual: "The company hands over its full accounts to every party that asks.",
    evidence: "ZK proof artefact",
    plain: "Regulators can verify the limit is respected without seeing the company's private numbers.",
  },
  {
    id: "adbank",
    title: "AD Category-I bank certification",
    seconds: { Automatic: 45, Approval: 60 },
    routes: ["Automatic", "Approval"],
    actor: "AD bank",
    basis: "Master Direction — OI, AD bank due diligence",
    automated: "The bank receives a complete, hash-sealed bundle and certifies in a single pass; nothing is re-keyed.",
    manual: "The bank rebuilds the file from scratch, raises queries, and waits for replies by email.",
    evidence: "AD bank certificate",
    plain: "Your bank is the gatekeeper for every rupee leaving India. It signs once, on a complete file.",
    input: { key: "adbank", label: "AD Category-I bank", hint: "The authorised dealer handling the remittance.", kind: "select", options: ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank"] },
  },
  {
    id: "window",
    title: "Six-regulator parallel window",
    seconds: { Automatic: 60, Approval: 95 },
    routes: ["Automatic", "Approval"],
    actor: "Regulator",
    basis: "Federated supervisory access to one signed dossier",
    automated: "One dossier is delivered to six endpoints at the same instant; each authority reads only its own scope.",
    manual: "The same file is posted to six desks one after another, each waiting on the last.",
    evidence: "Six clearance receipts",
    plain: "All six authorities look at the file together instead of in a queue. This is where the weeks disappear.",
  },
  {
    id: "rbi",
    title: "RBI approval-route adjudication",
    seconds: { Automatic: 0, Approval: 120 },
    routes: ["Approval"],
    actor: "Regulator",
    basis: "Rule 10, OI Rules 2022",
    automated: "The Overseas Investment Division receives the justification note, the lender no-objections and the exposure analytics on one screen and records a reasoned order.",
    manual: "A physical application travels through the AD bank to RBI; officers request clarifications in writing over several weeks.",
    evidence: "Reasoned approval order",
    plain: "Only on the Approval route: a human officer at the Reserve Bank must be persuaded before the money may leave.",
    input: { key: "justification", label: "Justification for the approval-route exposure", hint: "Why the commitment should be allowed beyond the ordinary limit.", kind: "text" },
  },
  {
    id: "uin",
    title: "UIN allotment",
    seconds: { Automatic: 30, Approval: 40 },
    routes: ["Automatic", "Approval"],
    actor: "Regulator",
    basis: "Master Direction — OI, UIN framework",
    automated: "The Unique Identification Number is allotted and bound to the corridor and settlement instruction.",
    manual: "UIN is requested by form and returned by email days later.",
    evidence: "UIN allotment record",
    plain: "The investment gets its permanent official number, used for every future remittance and report.",
  },
  {
    id: "settle",
    title: "Settlement instruction released",
    seconds: { Automatic: 30, Approval: 35 },
    routes: ["Automatic", "Approval"],
    actor: "AD bank",
    basis: "FEMA s.5 — current and capital account transactions",
    automated: "Amount, currency and value date are released to the hub with the cleared bundle attached.",
    manual: "SWIFT instruction typed manually; FIRC chased afterwards.",
    evidence: "Settlement advice · FIRC",
    plain: "The money actually leaves for the chosen financial centre.",
  },
  {
    id: "ledger",
    title: "Evidence ledger commit and APR calendar",
    seconds: { Automatic: 25, Approval: 30 },
    routes: ["Automatic", "Approval"],
    actor: "Ledger",
    basis: "Annual Performance Report obligations, OI Rules 2022",
    automated: "Every event is hash-chained across sovereign nodes and the annual reporting calendar is seeded automatically.",
    manual: "Compliance diarises the APR date in a spreadsheet and hopes it is not missed.",
    evidence: "Ledger block",
    plain: "A permanent, tamper-proof record is written, and next year's filings are already scheduled.",
  },
];

export function stepsFor(route: RouteKey) {
  return ROUTE_STEPS.filter((s) => s.routes.includes(route));
}

export function totalSeconds(route: RouteKey) {
  return stepsFor(route).reduce((a, s) => a + s.seconds[route], 0);
}

export function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export const MANUAL_DAYS: Record<RouteKey, number> = { Automatic: 28, Approval: 74 };

export type RegulatorAction = {
  code: string;
  name: string;
  scope: string;
  automatic: string;
  approval: string;
  manualAct: string;
  automatedAct: string;
  seconds: number;
};

export const REGULATOR_ACTIONS: RegulatorAction[] = [
  {
    code: "RBI",
    name: "Reserve Bank of India — Overseas Investment Division",
    scope: "Financial commitment, Rule 7 ceiling, UIN allotment",
    automatic: "Receives the filing for record, verifies the ceiling proof and allots the UIN. It does not need to consent.",
    approval: "Adjudicates. An officer reads the justification, tests the exposure against policy and records a reasoned order allowing or refusing the commitment.",
    manualAct: "Officer reads the dossier, may raise written queries, signs the order.",
    automatedAct: "Ceiling proof verified by circuit; exposure analytics and precedent orders assembled for the officer.",
    seconds: 120,
  },
  {
    code: "IFSCA",
    name: "International Financial Services Centres Authority",
    scope: "GIFT IFSC conduct and the offshore leg",
    automatic: "Confirms the GIFT unit is in good standing and the offshore leg is within its licence.",
    approval: "Same check, plus a conduct opinion on whether the structure is consistent with IFSC policy.",
    manualAct: "Licensing desk confirms unit status and signs the conduct note.",
    automatedAct: "Licence register queried live; unit standing attached to the dossier.",
    seconds: 45,
  },
  {
    code: "MoF",
    name: "Ministry of Finance — Department of Economic Affairs",
    scope: "Policy conformity for outbound capital",
    automatic: "Sees the flow in aggregate for policy monitoring; no case-by-case act.",
    approval: "Confirms the exposure does not conflict with a standing policy direction on the destination or sector.",
    manualAct: "Policy desk reviews destination and sector flags.",
    automatedAct: "Flow tagged against live policy directions; conflicts surfaced automatically.",
    seconds: 40,
  },
  {
    code: "FIU-IND",
    name: "Financial Intelligence Unit — India",
    scope: "Money-laundering and beneficial ownership",
    automatic: "Screens ultimate beneficial owners against sanctions and PEP lists and records the clearance.",
    approval: "Same screening at a deeper tier, including step-down entities and adverse-media review.",
    manualAct: "Analyst reviews any hit and clears or escalates it.",
    automatedAct: "UBO chain walked and screened; only genuine hits reach a human.",
    seconds: 50,
  },
  {
    code: "DPIIT",
    name: "Department for Promotion of Industry and Internal Trade",
    scope: "Sector conditions and strategic-sector flags",
    automatic: "Confirms the overseas activity is not in a restricted or strategic sector.",
    approval: "Applies the sector condition in detail and may attach conditions to the approval.",
    manualAct: "Sector desk classifies the activity and records conditions.",
    automatedAct: "Activity code mapped to the sector schedule with the provision cited.",
    seconds: 40,
  },
  {
    code: "CBDT",
    name: "Central Board of Direct Taxes",
    scope: "Withholding, treaty relief, 15CA/15CB",
    automatic: "Validates the 15CA/15CB pair and the treaty article claimed.",
    approval: "Same validation, plus a transfer-pricing look at the valuation on large exposures.",
    manualAct: "Assessing officer confirms the withholding position.",
    automatedAct: "Treaty article resolved and the form pair pre-validated before submission.",
    seconds: 45,
  },
];

/** Narration languages offered on the voice guide. */
export const LANGUAGES: { code: string; label: string; native: string }[] = [
  { code: "en-IN", label: "English (India)", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "ur", label: "Urdu", native: "اردو" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "or", label: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "as", label: "Assamese", native: "অসমীয়া" },
  { code: "ne", label: "Nepali", native: "नेपाली" },
  { code: "si", label: "Sinhala", native: "සිංහල" },
  { code: "de-CH", label: "Swiss German", native: "Schwiizerdütsch" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "fr", label: "French", native: "Français" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "rm", label: "Romansh", native: "Rumantsch" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "nl", label: "Dutch", native: "Nederlands" },
  { code: "sv", label: "Swedish", native: "Svenska" },
  { code: "no", label: "Norwegian", native: "Norsk" },
  { code: "da", label: "Danish", native: "Dansk" },
  { code: "fi", label: "Finnish", native: "Suomi" },
  { code: "pl", label: "Polish", native: "Polski" },
  { code: "cs", label: "Czech", native: "Čeština" },
  { code: "el", label: "Greek", native: "Ελληνικά" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "uk", label: "Ukrainian", native: "Українська" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "he", label: "Hebrew", native: "עברית" },
  { code: "fa", label: "Persian", native: "فارسی" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
  { code: "zh", label: "Mandarin Chinese", native: "中文" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", label: "Thai", native: "ไทย" },
];

/** The script the voice guide reads for a given step. */
export function narrationFor(route: RouteKey, step: RouteStep, index: number, count: number) {
  return [
    `${route} route. Step ${index + 1} of ${count}: ${step.title}.`,
    `What happens: ${step.automated}`,
    `Statutory basis: ${step.basis}.`,
    `In plain words: ${step.plain}`,
  ].join(" ");
}

/** One document line on the regulator-facing evidence checklist for a step. */
export type EvidenceItem = {
  /** The document or artefact itself. */
  document: string;
  /** Who must produce it. */
  supplier: Actor | "Statutory auditor" | "Registered valuer" | "Chartered accountant" | "Overseas entity";
  /** Which authority (or the AD bank) reads it. */
  reviewer: string;
  /** What that reviewer actually tests when they read it. */
  reviews: string;
  /** Routes on which the document is demanded. */
  routes: RouteKey[];
};

/** Regulator-specific evidence checklist, keyed by RouteStep.id. */
export const STEP_EVIDENCE: Record<string, EvidenceItem[]> = {
  identity: [
    { document: "Certified board resolution authorising the commitment", supplier: "Corporate", reviewer: "AD Category-I bank", reviews: "That the resolution is validly passed under s.179(3) and names the signatory who executes the filing.", routes: ["Automatic", "Approval"] },
    { document: "PAN, CIN and LEI of the Indian party", supplier: "Corporate", reviewer: "AD Category-I bank", reviews: "Registry match, active status and that the LEI has not lapsed.", routes: ["Automatic", "Approval"] },
    { document: "Specimen signature and KYC of the authorised signatory", supplier: "Corporate", reviewer: "AD Category-I bank", reviews: "Signatory identity against bank KYC records before any instruction is accepted.", routes: ["Automatic", "Approval"] },
  ],
  target: [
    { document: "Incorporation certificate of the overseas entity", supplier: "Overseas entity", reviewer: "RBI · DPIIT", reviews: "Legal existence in the host jurisdiction and the form of the entity.", routes: ["Automatic", "Approval"] },
    { document: "Activity / NIC-equivalent code and business description", supplier: "Corporate", reviewer: "DPIIT", reviews: "Whether the activity is permitted, restricted or strategic under the sector schedule.", routes: ["Automatic", "Approval"] },
    { document: "Host-regulator standing or licence note for the hub", supplier: "Overseas entity", reviewer: "IFSCA", reviews: "That the offshore leg sits inside the licence held in that financial centre.", routes: ["Automatic", "Approval"] },
  ],
  amount: [
    { document: "Financial commitment schedule — equity, debt, guarantees, pledges", supplier: "Corporate", reviewer: "RBI · AD Category-I bank", reviews: "That every limb of Rule 2(g) is captured, not only the equity subscription.", routes: ["Automatic", "Approval"] },
    { document: "Board-approved funding plan and source of funds", supplier: "Corporate", reviewer: "AD Category-I bank", reviews: "That the rupee source is legitimate and matches the remittance sought.", routes: ["Automatic", "Approval"] },
    { document: "Group exposure statement across existing UINs", supplier: "Corporate", reviewer: "RBI", reviews: "Aggregate outstanding commitment before the fresh commitment is added.", routes: ["Approval"] },
  ],
  networth: [
    { document: "Statutory auditor's net-worth certificate", supplier: "Statutory auditor", reviewer: "RBI · AD Category-I bank", reviews: "That the figure is certified, dated and drawn from the last audited balance sheet.", routes: ["Automatic", "Approval"] },
    { document: "Latest audited financial statements", supplier: "Corporate", reviewer: "AD Category-I bank", reviews: "Consistency between the certificate and the filed accounts.", routes: ["Automatic", "Approval"] },
  ],
  rule7: [
    { document: "Rule 7 ceiling computation with headroom", supplier: "Engine", reviewer: "RBI", reviews: "Whether the commitment sits inside 400% of audited net worth, and therefore which route applies.", routes: ["Automatic", "Approval"] },
    { document: "Reasoned route determination citing the provision", supplier: "Engine", reviewer: "RBI", reviews: "That the conclusion is traceable to Rule 7 read with Rule 10, not to discretion.", routes: ["Automatic", "Approval"] },
  ],
  docs: [
    { document: "Form FC (Part I) and annexure index", supplier: "Corporate", reviewer: "RBI · AD Category-I bank", reviews: "Completeness against the annexure schedule before the file is accepted.", routes: ["Automatic", "Approval"] },
    { document: "Deficiency report with the statute demanding each missing paper", supplier: "Engine", reviewer: "AD Category-I bank", reviews: "That no gap remains open at submission — the usual cause of query letters.", routes: ["Automatic", "Approval"] },
  ],
  aml: [
    { document: "Ultimate beneficial ownership chart to natural persons", supplier: "Corporate", reviewer: "FIU-IND", reviews: "Whether the step-down chain conceals a controlling person.", routes: ["Automatic", "Approval"] },
    { document: "Sanctions, PEP and adverse-media screening report", supplier: "AD bank", reviewer: "FIU-IND", reviews: "Every hit, cleared or escalated, with the analyst's reason recorded.", routes: ["Automatic", "Approval"] },
    { document: "Enhanced due-diligence note on step-down entities", supplier: "AD bank", reviewer: "FIU-IND", reviews: "Deeper tier review demanded where the exposure runs on the approval route.", routes: ["Approval"] },
  ],
  valuation: [
    { document: "Registered valuer's certificate under Rule 19", supplier: "Registered valuer", reviewer: "RBI · CBDT", reviews: "Methodology, valuation date and the valuer's eligibility.", routes: ["Automatic", "Approval"] },
    { document: "Share purchase or subscription agreement showing the price paid", supplier: "Corporate", reviewer: "RBI", reviews: "Any gap between certified fair value and the price actually paid.", routes: ["Automatic", "Approval"] },
    { document: "Transfer-pricing note on the valuation", supplier: "Chartered accountant", reviewer: "CBDT", reviews: "Arm's-length support on large exposures cleared through the approval route.", routes: ["Approval"] },
  ],
  tax: [
    { document: "Form 15CB certificate", supplier: "Chartered accountant", reviewer: "CBDT", reviews: "Withholding rate applied and the treaty article claimed.", routes: ["Automatic", "Approval"] },
    { document: "Form 15CA declaration", supplier: "Corporate", reviewer: "CBDT", reviews: "That the declaration matches 15CB and the remittance particulars.", routes: ["Automatic", "Approval"] },
    { document: "Tax residency certificate and Form 10F of the recipient", supplier: "Overseas entity", reviewer: "CBDT", reviews: "Entitlement to the DTAA relief being claimed.", routes: ["Automatic", "Approval"] },
  ],
  zk: [
    { document: "Groth16 headroom proof artefact and verification key", supplier: "Engine", reviewer: "RBI", reviews: "That the proof verifies against the ceiling without the balance sheet being disclosed.", routes: ["Automatic", "Approval"] },
  ],
  adbank: [
    { document: "AD Category-I bank certification of the complete file", supplier: "AD bank", reviewer: "RBI", reviews: "That the bank has satisfied itself on FEMA compliance before remittance.", routes: ["Automatic", "Approval"] },
    { document: "Remittance instruction with corridor and currency", supplier: "Corporate", reviewer: "AD Category-I bank", reviews: "That the instruction matches the certified commitment schedule exactly.", routes: ["Automatic", "Approval"] },
  ],
  window: [
    { document: "Hash-sealed dossier delivered to six endpoints", supplier: "Engine", reviewer: "RBI · IFSCA · MoF · FIU-IND · DPIIT · CBDT", reviews: "Each authority reads only its own scope of the same signed bundle.", routes: ["Automatic", "Approval"] },
    { document: "Six clearance receipts with officer identity", supplier: "Regulator", reviewer: "Ledger", reviews: "That every authority in scope has recorded a decision, none skipped.", routes: ["Automatic", "Approval"] },
  ],
  rbi: [
    { document: "Justification note for the exposure beyond the ordinary limit", supplier: "Corporate", reviewer: "RBI — Overseas Investment Division", reviews: "Commercial rationale, repayment capacity and policy fit of the excess commitment.", routes: ["Approval"] },
    { document: "No-objection letters from Indian lenders", supplier: "Corporate", reviewer: "RBI", reviews: "That domestic creditors do not object to the outbound exposure.", routes: ["Approval"] },
    { document: "Statement of no default and no adverse regulatory action", supplier: "Corporate", reviewer: "RBI", reviews: "Eligibility of the Indian party to access the approval route at all.", routes: ["Approval"] },
    { document: "Reasoned approval order", supplier: "Regulator", reviewer: "AD Category-I bank", reviews: "The conditions attached, which the bank must enforce at remittance.", routes: ["Approval"] },
  ],
  uin: [
    { document: "UIN allotment record bound to the corridor", supplier: "Regulator", reviewer: "AD Category-I bank", reviews: "That the number is quoted on every future remittance and report.", routes: ["Automatic", "Approval"] },
  ],
  settle: [
    { document: "SWIFT settlement advice", supplier: "AD bank", reviewer: "RBI", reviews: "Amount, currency and value date against the cleared bundle.", routes: ["Automatic", "Approval"] },
    { document: "Foreign Inward/Outward Remittance Certificate", supplier: "AD bank", reviewer: "RBI", reviews: "Proof the funds left India on the terms cleared.", routes: ["Automatic", "Approval"] },
  ],
  ledger: [
    { document: "Hash-chained evidence ledger block", supplier: "Ledger", reviewer: "RBI · FIU-IND", reviews: "Tamper-evidence of the whole file, checkpoint by checkpoint.", routes: ["Automatic", "Approval"] },
    { document: "Seeded Annual Performance Report calendar", supplier: "Ledger", reviewer: "RBI", reviews: "That continuing obligations are diarised against the UIN.", routes: ["Automatic", "Approval"] },
  ],
};

export function evidenceFor(stepId: string, route: RouteKey): EvidenceItem[] {
  return (STEP_EVIDENCE[stepId] ?? []).filter((e) => e.routes.includes(route));
}
