/**
 * Proof scenarios: one real outbound situation per incumbent system, walked
 * step by step on both rails so a viewer can see exactly where the incumbent
 * stops and what CorpVidesh AI does instead.
 */

export type Lane = "rival" | "cvai";

export type ProofStep = {
  /** Clock offset on each rail, human readable. */
  rival: { at: string; actor: string; act: string; artefact: string; blocked?: boolean };
  cvai: { at: string; actor: string; act: string; artefact: string; statute?: string };
  /** One-line reading of the gap this step opens. */
  gap: string;
};

export type ProofScenario = {
  key: string;
  rival: string;
  rivalShort: string;
  /** The concrete case being walked. */
  title: string;
  brief: string;
  /** Fair statement of what the incumbent is genuinely best at. */
  fair: string;
  /** The structural stopping point. */
  stop: string;
  totals: { rivalTime: string; cvaiTime: string; rivalTouches: number; cvaiTouches: number };
  steps: ProofStep[];
  verdict: string;
};

export const PROOF_SCENARIOS: ProofScenario[] = [
  {
    key: "bloomberg",
    rival: "Bloomberg Terminal / Entity Exchange",
    rivalShort: "BBG",
    title: "₹475 cr equity infusion into a Singapore WOS",
    brief:
      "A listed Indian manufacturer funds its wholly-owned Singapore subsidiary. The treasury has a terminal on the desk and an AD Category-1 relationship.",
    fair: "Unmatched USD/INR price discovery, forward curves and counterparty reference data.",
    stop:
      "The terminal prices the corridor. It never tests Rule 7, never produces Form A2, and no Indian regulator is on the other side of the screen.",
    totals: { rivalTime: "26 days", cvaiTime: "9 min 12 s", rivalTouches: 11, cvaiTouches: 2 },
    steps: [
      {
        rival: { at: "Day 0", actor: "Treasury", act: "Pulls USD/INR spot and 3-month forward on the terminal.", artefact: "Screen capture pasted into a board note." },
        cvai: { at: "00:00", actor: "Intake", act: "Entity keyed once; audited net worth, utilised commitment and headroom read from the adopted balance sheet.", artefact: "Sealed intake record, hash 0x8f31…", statute: "FEM (OI) Rules 2022, r.7" },
        gap: "The terminal knows the price of the money. It does not know whether the law permits the transfer.",
      },
      {
        rival: { at: "Day 1-4", actor: "External counsel", act: "Opinion sought on Automatic vs Approval route.", artefact: "PDF opinion, ₹6-9 lakh fee." },
        cvai: { at: "00:41", actor: "Rule engine", act: "400% ceiling computed live; route resolved as Automatic with the provision quoted inline.", artefact: "Route determination + citation", statute: "r.9(1) read with r.7" },
        gap: "Four days and a fee for a determination the rail settles deterministically in under a minute.",
      },
      {
        rival: { at: "Day 5-9", actor: "Tax advisor", act: "Section 195 chargeability reviewed separately; TRC and Form 10F chased by email.", artefact: "Email chain, draft 15CB." },
        cvai: { at: "02:10", actor: "s.195 engine", act: "Royalty/FTS branch walked, DTAA article fixed, TRC and 10F validity checked against the file already keyed.", artefact: "15CA Part D + 15CB pack", statute: "IT Act s.195; r.37BB" },
        gap: "Same facts, re-keyed by a third party on the incumbent path; read once here.",
      },
      {
        rival: { at: "Day 10-22", actor: "AD Category-1 bank", act: "Document set reviewed, queried twice, resubmitted.", artefact: "Form A2 typed by the bank desk.", blocked: true },
        cvai: { at: "05:35", actor: "AD bank lane", act: "Bank attaches to the same record; nothing re-keyed, queries raised against sealed fields.", artefact: "Form A2 reconciled, UIN requested" },
        gap: "Query loops exist because each party holds a different copy. One record removes the loop.",
      },
      {
        rival: { at: "Day 23-26", actor: "RBI FIRMS", act: "Filing uploaded after settlement; supervisor reads a report.", artefact: "ODI return, post-facto." },
        cvai: { at: "09:12", actor: "Six-regulator quorum", act: "RBI, IFSCA, MoF, FIU-IND, DPIIT and CBDT read the forming record in parallel and sign.", artefact: "Quorum-signed ledger block" },
        gap: "The supervisor moves from recipient of a report to member of the record.",
      },
    ],
    verdict:
      "Bloomberg answers 'what does this cost?'. This rail answers 'may it lawfully move, on what authority, and who signed?' — and then moves it.",
  },
  {
    key: "reuters",
    rival: "LSEG / Reuters Refinitiv World-Check",
    rivalShort: "LSEG",
    title: "Screening a Mauritius intermediary on a ₹120 cr OPI ticket",
    brief:
      "An unlisted Indian party takes a sub-10% portfolio stake abroad through an intermediary flagged in an adverse-media hit.",
    fair: "Global sanctions, PEP and adverse-media coverage with the fastest newsroom on the tape.",
    stop:
      "Screening is an input to a decision taken somewhere else. It never yields a route, a form, or a regulator signature.",
    totals: { rivalTime: "17 days", cvaiTime: "7 min 04 s", rivalTouches: 8, cvaiTouches: 2 },
    steps: [
      {
        rival: { at: "Day 0", actor: "Compliance", act: "Name screened; three possible matches returned.", artefact: "Screening PDF." },
        cvai: { at: "00:00", actor: "Intake", act: "Counterparty keyed with hub, instrument and holding percentage.", artefact: "Sealed intake", statute: "FEM (OI) Rules 2022, r.2(1)(q)" },
        gap: "A hit list is not a disposition. Someone still has to decide.",
      },
      {
        rival: { at: "Day 1-3", actor: "Analyst", act: "Manual disambiguation of the three matches.", artefact: "Memo to file." },
        cvai: { at: "01:12", actor: "FIU-IND lane", act: "Screening result bound to the transaction record with the officer's disposition captured as a ledger entry.", artefact: "Signed disposition", statute: "PMLA r.9" },
        gap: "On the incumbent path the reasoning lives in a memo nobody can verify later.",
      },
      {
        rival: { at: "Day 4-9", actor: "Counsel + treasury", act: "OPI eligibility and the 50% cap tested by hand in a spreadsheet.", artefact: "Excel model.", blocked: true },
        cvai: { at: "03:20", actor: "Rule engine", act: "OPI 50% cap and listed-entity eligibility computed from audited figures already on the file.", artefact: "Eligibility determination", statute: "r.13, OI Rules" },
        gap: "Spreadsheets are the single largest source of outbound filing error in practice.",
      },
      {
        rival: { at: "Day 10-17", actor: "AD bank", act: "Whole pack re-reviewed; screening evidence re-requested in the bank's own format.", artefact: "Second screening run." },
        cvai: { at: "07:04", actor: "Quorum", act: "Bank and regulators read the one screening artefact anchored in the chain; no second run.", artefact: "Quorum-signed block" },
        gap: "Evidence proved once, read by everyone, is the whole point of an append-only ledger.",
      },
    ],
    verdict:
      "Reuters tells you who the counterparty might be. This rail records who decided, on what statute, at what second — and cannot be edited afterwards.",
  },
  {
    key: "rbi",
    rival: "RBI FIRMS / OID portal + AD-bank email",
    rivalShort: "FIRMS",
    title: "Filing an ODI Part I for a ₹310 cr Dubai JV",
    brief:
      "The statutory destination of the filing. The question is not whether the portal works — it is what happens in the weeks before anything reaches it.",
    fair: "The lawful system of record for ODI/OPI reporting, and the only valid destination for the return.",
    stop:
      "It receives a finished file. It does not help build one — the reasoning, annexures and reconciliation happen off-portal in email and PDF.",
    totals: { rivalTime: "28 days", cvaiTime: "9 min 12 s", rivalTouches: 14, cvaiTouches: 2 },
    steps: [
      {
        rival: { at: "Day 0-6", actor: "Treasury + counsel", act: "Facts assembled into a Word annexure set; net worth extracted manually.", artefact: "Annexures A-F." },
        cvai: { at: "00:00", actor: "Intake", act: "One keyed intake produces every annexure field by derivation, not transcription.", artefact: "Derived annexure set" },
        gap: "Transcription is where the numbers drift between documents.",
      },
      {
        rival: { at: "Day 7-15", actor: "AD bank", act: "Pack emailed, queried, corrected, re-emailed.", artefact: "Nine email versions.", blocked: true },
        cvai: { at: "05:35", actor: "AD bank lane", act: "Bank works the sealed record; every query and answer is a ledger line.", artefact: "Query trail, immutable" },
        gap: "Nine email versions means nine possible truths at audit.",
      },
      {
        rival: { at: "Day 16-24", actor: "Bank officer", act: "Data re-keyed into FIRMS; UIN requested.", artefact: "FIRMS submission." },
        cvai: { at: "07:48", actor: "Filing layer", act: "Submission payload generated from the sealed record; UIN reconciled back onto the same file.", artefact: "UIN bound to case" },
        gap: "Re-keying at the last step undoes the accuracy of every step before it.",
      },
      {
        rival: { at: "Day 25-28", actor: "Supervisor", act: "Reads the return after the money has already left.", artefact: "Post-settlement return." },
        cvai: { at: "09:12", actor: "Six regulators", act: "Read and sign while the transaction is still forming.", artefact: "Quorum block, pre-settlement" },
        gap: "Supervision before settlement is a different regulatory product from supervision after it.",
      },
    ],
    verdict:
      "FIRMS is where the filing must land. This rail is how the filing gets built, proved and supervised on the way there.",
  },
  {
    key: "cleartax",
    rival: "ClearTax / Signzy / consultancy toolkits",
    rivalShort: "IN-TOOLS",
    title: "₹4.2 cr annual SaaS licence fee to a US vendor",
    brief:
      "The most common outbound payment in the Indian corporate book — and the one most often mis-classified between Royalty and FTS.",
    fair: "Genuinely strong form automation for domestic filing and customer onboarding.",
    stop:
      "Single-statute tools. Chargeability, FEMA route logic and regulator quorum are three separate workflows, so the same facts are keyed three times.",
    totals: { rivalTime: "11 days", cvaiTime: "4 min 38 s", rivalTouches: 7, cvaiTouches: 1 },
    steps: [
      {
        rival: { at: "Day 0-2", actor: "Tax team", act: "Classification debated: Royalty under s.9(1)(vi) or FTS under s.9(1)(vii)?", artefact: "Internal note." },
        cvai: { at: "00:00", actor: "s.195 engine", act: "Branch walk executed: right-to-use test, make-available test, DTAA article fixed with reasoning shown.", artefact: "Explainable determination", statute: "IT Act s.9(1)(vi)/(vii); India-US DTAA art.12" },
        gap: "The tool fills the box. It does not decide which box is correct.",
      },
      {
        rival: { at: "Day 3-6", actor: "Vendor + tax team", act: "TRC and Form 10F chased by email; validity window checked by eye.", artefact: "Scanned TRC.", blocked: true },
        cvai: { at: "01:26", actor: "Document lane", act: "TRC and 10F parsed, validity window and no-PE declaration checked against the payment date.", artefact: "Validated document set", statute: "IT r.21AB" },
        gap: "An expired TRC discovered after remittance is a 20% withholding exposure.",
      },
      {
        rival: { at: "Day 7-9", actor: "CA", act: "15CB signed; 15CA part chosen manually.", artefact: "15CB PDF." },
        cvai: { at: "03:02", actor: "Filing layer", act: "Rule 37BB part determined from facts already on the file; 15CA and 15CB reconciled field by field.", artefact: "Reconciled 15CA/15CB", statute: "IT r.37BB" },
        gap: "Wrong 15CA part is the single most common rejection reason at the AD desk.",
      },
      {
        rival: { at: "Day 10-11", actor: "AD bank", act: "FEMA purpose code keyed separately in a different system.", artefact: "A2 form." },
        cvai: { at: "04:38", actor: "AD bank lane", act: "Purpose code derived from the same intake; A2 reconciled automatically.", artefact: "A2 bound to case" },
        gap: "Three systems, three keyings, three chances to diverge — collapsed to one.",
      },
    ],
    verdict:
      "The Indian toolkits automate a form. This rail automates the decision that determines which form is lawful, then produces it.",
  },
  {
    key: "swift",
    rival: "SWIFT gpi + core banking",
    rivalShort: "GPI",
    title: "Tracking a USD 12.4 m outbound leg to Zurich",
    brief:
      "Once the money is cleared to move, gpi is excellent. The question is everything that happens before an MT103 can exist at all.",
    fair: "Reliable, near-real-time settlement tracking and fee transparency once payment is authorised.",
    stop:
      "gpi tracks the payment, not the permission. Every expensive day sits before the message is created.",
    totals: { rivalTime: "24 days + 4 h", cvaiTime: "9 min 12 s + 4 h", rivalTouches: 12, cvaiTouches: 2 },
    steps: [
      {
        rival: { at: "Day 0-21", actor: "Everyone", act: "Route, tax, documents and approvals assembled off-system.", artefact: "Nothing gpi can see.", blocked: true },
        cvai: { at: "00:00-09:12", actor: "Rail", act: "Route, s.195, documents and six-regulator quorum completed on one record.", artefact: "Quorum-signed clearance" },
        gap: "gpi's clock starts where the difficulty ends.",
      },
      {
        rival: { at: "Day 22", actor: "Bank ops", act: "MT103 created; gpi UETR issued.", artefact: "UETR reference." },
        cvai: { at: "09:13", actor: "Payment lane", act: "UETR captured and bound to the clearance block, so payment and permission share one identifier.", artefact: "UETR ↔ ledger binding" },
        gap: "On the incumbent path the payment reference and the compliance file never meet.",
      },
      {
        rival: { at: "Day 22-24", actor: "Correspondents", act: "Hops tracked; fees deducted and reported.", artefact: "gpi tracker view." },
        cvai: { at: "+4 h", actor: "Payment lane", act: "Same gpi hops mirrored onto the case file alongside the statutory basis for the leg.", artefact: "Settlement + statute, one view" },
        gap: "Auditors ask 'why was this paid?' — gpi can only answer 'where did it go?'.",
      },
      {
        rival: { at: "Post-hoc", actor: "Audit", act: "Payment reconciled to the compliance file by hand, months later.", artefact: "Reconciliation workbook." },
        cvai: { at: "Live", actor: "Ledger", act: "Reconciliation is structural — there is only one record to reconcile against.", artefact: "Hash-chained case file" },
        gap: "Reconciliation you never have to perform is the cheapest control there is.",
      },
    ],
    verdict:
      "SWIFT gpi answers where the money is. This rail answers why it was allowed to be there — and holds the proof.",
  },
];
