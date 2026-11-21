import { useFxStream } from "@/lib/fx-stream";
import { ProcessTheatre3D, type Stage } from "@/components/site/ProcessTheatre3D";

export type DeskKey =
  | "rail"
  | "routes"
  | "treasury"
  | "corporate"
  | "apply"
  | "processing"
  | "worklist"
  | "regulator"
  | "supervisor"
  | "security"
  | "gift"
  | "hubs";

const S = (label: string, actor: string, secs: number, detail: string, statute?: string): Stage => ({
  label,
  actor,
  secs,
  detail,
  statute,
});

const DESKS: Record<DeskKey, { title: string; caption: string; stages: Stage[] }> = {
  rail: {
    title: "The rail, end to end — 3D process simulation",
    caption:
      "One outbound remittance walked from treasury intake to overseas credit, priced on the live rupee tape at every stage.",
    stages: [
      S("Intake", "Corporate treasury", 35, "Entity, hub, bank, route and notional are captured. The live FX print is stamped onto the file the instant the treasurer commits it, so the record carries the rate that priced the decision.", "FEMA (OI) Rules 2022"),
      S("Headroom", "Rule 7 engine", 22, "Audited net worth is tested against the 400% financial-commitment ceiling, and a zero-knowledge proof of headroom is published without exposing the balance sheet.", "Rule 7, FEM (OI) Rules"),
      S("s.195 view", "Withholding engine", 41, "The payment is classified — Royalty, FTS, business income or capital — and the treaty rate resolved against TRC and Form 10F on file.", "s.195, Income-tax Act 1961"),
      S("Quorum", "Six regulators, parallel", 96, "RBI, IFSCA, MoF, FIU-IND, DPIIT and CBDT attach to the same append-only ledger and process concurrently rather than in series.", "Federated supervisory read"),
      S("AD Bank", "AD Category-I", 88, "The authorised dealer verifies the evidence bundle, prices the deal on the streaming tape and generates the LRN and payment instruction.", "Master Direction on ODI"),
      S("Settlement", "Correspondent + overseas bank", 258, "Value moves over the correspondent leg to the beneficiary account in the selected hub; the FIRC and the ledger digest reconcile automatically.", "SWIFT gpi + ledger digest"),
    ],
  },
  routes: {
    title: "Route execution — 3D process simulation",
    caption:
      "What happens to the money the moment the treasury clicks execute on the Automatic or Approval route.",
    stages: [
      S("Entity", "Treasury officer", 28, "Listed entity picked from the top-1,000 universe; audited net worth and its computation basis populate automatically.", "Schedule III net worth"),
      S("Route test", "Routing engine", 24, "Automatic against Approval is decided from purpose, sector and ceiling — not chosen by hand.", "Rule 9 / Rule 11"),
      S("FX capture", "Live tape", 6, "The streaming rupee print is captured and hashed onto the instruction; the foreign-currency leg is fixed off that print.", "Rate-stamp digest"),
      S("Regulator quorum", "Six desks in parallel", 92, "Each desk's checks run concurrently; engine-cleared items return in seconds, officer-signed items in minutes.", "Parallel supervisory quorum"),
      S("AD execution", "AD Category-I bank", 84, "Bank raises the LRN, releases the remittance and writes the block to the shared ledger.", "Form FC / LRN"),
      S("Credit abroad", "Overseas bank", 240, "Beneficiary account in the selected hub is credited and the corridor closes with a machine-checkable evidence bundle.", "FIRC reconciliation"),
    ],
  },
  treasury: {
    title: "Treasury desk — 3D process simulation",
    caption: "How a treasurer's action becomes a supervised, rate-stamped record.",
    stages: [
      S("Position", "Treasury", 30, "Existing commitments and headroom are read from the ledger, not rebuilt in a spreadsheet.", "Rule 7 headroom"),
      S("Price", "Live FX tape", 8, "Every action captures the live print, so the exposure is measured at the rate that existed when the click happened."),
      S("Structure", "Statutory engine", 36, "Route, purpose and instrument are resolved into a statutory shape before any document is asked for.", "FEM (OI) Rules 2022"),
      S("Evidence", "Document engine", 44, "TRC, Form 10F, valuation certificate and board resolution are validated as they arrive.", "Rule 37BB"),
      S("Submit", "Rail", 12, "The file is written to the append-only ledger; the six regulators see it forming."),
    ],
  },
  corporate: {
    title: "Corporate portal — 3D process simulation",
    caption: "Submission to live tracking, with each clearing officer named as the packet moves.",
    stages: [
      S("Submit", "Corporate portal", 26, "Route and documentation are submitted against the entity; the live FX print is stamped on the submission."),
      S("Validate", "Document engine", 38, "Completeness is machine-tested before anything queues for a human.", "Rule 37BB checklist"),
      S("Track", "Ledger watcher", 18, "Each checkpoint clears in view, with the officer and designation shown as it happens."),
      S("Notify", "In-app + email", 6, "Every stage change raises a notice carrying the block digest."),
      S("Close", "AD Bank", 90, "Remittance released and the evidence bundle sealed.", "FIRC + LRN"),
    ],
  },
  apply: {
    title: "Application flow — 3D process simulation",
    caption: "The application as the rail actually processes it, stage by stage.",
    stages: [
      S("Open file", "Applicant", 22, "Entity and corridor are selected; the case file opens on the ledger."),
      S("Price", "Live FX tape", 6, "Notional is converted on the live streaming print and stamped."),
      S("Checks", "Statutory engine", 40, "Route, ceiling and withholding checks run before submission.", "FEM (OI) Rules 2022"),
      S("Quorum", "Regulators", 94, "Parallel supervisory processing on the same record."),
      S("Decision", "AD Bank", 80, "Cleared, released and reconciled."),
    ],
  },
  processing: {
    title: "Processing rail — 3D process simulation",
    caption: "Where the packet is right now, and what each hand-off costs.",
    stages: [
      S("Queued", "Rail", 10, "Packet enters the processing queue with its rate stamp intact."),
      S("Screening", "FIU-IND", 34, "Counterparty and sanctions screening against the submitted bundle.", "PMLA Rule 9"),
      S("Tax view", "CBDT", 46, "15CA/15CB pairing and withholding position checked.", "s.195 / Rule 37BB"),
      S("Sanction", "RBI OI Division", 120, "Approval-route files take the sanction leg; automatic files skip it.", "Rule 11"),
      S("Release", "AD Bank", 78, "Payment instruction released on the captured rate."),
    ],
  },
  worklist: {
    title: "Worklist — 3D process simulation",
    caption: "How an item moves from raised to cleared without leaving the record.",
    stages: [
      S("Raise", "Engine", 12, "A gap is detected and raised as a work item against the file."),
      S("Assign", "Desk", 16, "Ownership is assigned to the desk that can actually close it."),
      S("Cure", "Corporate", 60, "Document or clarification supplied and machine-validated."),
      S("Clear", "Regulator", 40, "Checkpoint cleared and written to the ledger with the officer named."),
    ],
  },
  regulator: {
    title: "Regulator desk — 3D process simulation",
    caption: "The supervisor reads the record while the transaction is still forming.",
    stages: [
      S("Attach", "Regulator", 4, "Desk attaches to the append-only ledger for the file."),
      S("Read", "Regulator", 20, "Reads the evidence as it is written — no report is requested."),
      S("Machine checks", "Engine", 26, "Rule-bound checks return in seconds with statutory citation.", "Machine-checkable basis"),
      S("Sign", "Officer", 90, "Judgement items are signed by a named officer and hash-chained."),
    ],
  },
  supervisor: {
    title: "Supervisor view — 3D process simulation",
    caption: "Six desks, one append-only ledger, read live rather than months after settlement.",
    stages: [
      S("Block n", "Treasury write", 8, "A new block is appended as the treasury acts."),
      S("Fan-out", "Ledger", 3, "The same block is readable by all six regulators simultaneously."),
      S("Parallel work", "Six desks", 96, "Each desk processes its own scope concurrently; time gaps are visible, not hidden."),
      S("Quorum", "Ledger", 12, "Quorum reached and sealed into the chain with digests."),
    ],
  },
  security: {
    title: "Security response — 3D process simulation",
    caption: "Detection to containment on the federated mesh, with the ledger untouched.",
    stages: [
      S("Signal", "Mesh sensors", 2, "Anomalous access or payload detected on a lane."),
      S("Isolate", "Federation", 4, "The affected lane is isolated; other lanes keep clearing."),
      S("Prove", "Ledger", 3, "Hash chain is re-verified — tamper attempts fail arithmetic, not policy."),
      S("Contain", "Quorum", 9, "Containment confirmed by quorum and archived with telemetry."),
    ],
  },
  gift: {
    title: "GIFT IFSC desk — 3D process simulation",
    caption: "The onshore-offshore leg as the IFSCA-supervised unit processes it.",
    stages: [
      S("Unit intake", "IFSC unit", 24, "Transaction opens inside the GIFT unit with IFSCA reading live."),
      S("FX print", "Live tape", 6, "Priced on the streaming rupee tape and stamped."),
      S("Statutory view", "Engine", 34, "Unit-level exemptions and withholding position resolved.", "IFSCA regulations"),
      S("Out-leg", "Correspondent", 180, "Value routed to the destination hub and reconciled."),
    ],
  },
  hubs: {
    title: "Corridor execution — 3D process simulation",
    caption: "The selected corridor walked on the rail, priced on the live tape.",
    stages: [
      S("Corridor", "Routing engine", 18, "Hub, route and treaty position are resolved from the corridor atlas."),
      S("FX print", "Live tape", 6, "The destination currency is priced on the live streaming print."),
      S("Withholding", "s.195 engine", 38, "Treaty rate applied and the net remitted amount computed.", "s.195 + DTAA"),
      S("Quorum", "Six regulators", 92, "Parallel supervisory clearance on the same ledger."),
      S("Credit", "Overseas bank", 220, "Beneficiary credited in the hub currency; FIRC reconciled."),
    ],
  },
};

/** Mounts the desk-appropriate 3D process theatre with a live FX HUD. */
export function DeskProcess3D({ desk, code = "USD" }: { desk: DeskKey; code?: string }) {
  const tape = useFxStream();
  const cfg = DESKS[desk];
  const px = tape.inrPer[code];
  const prev = tape.prev[code];
  const dir = px && prev ? (px > prev ? "▲" : px < prev ? "▼" : "▬") : "▬";
  return (
    <ProcessTheatre3D
      title={cfg.title}
      caption={cfg.caption}
      stages={cfg.stages}
      hud={[
        { k: `Live ${code}/INR`, v: px ? `₹${px.toFixed(4)} ${dir}` : "—" },
        { k: "Tape status", v: tape.status === "live" ? "Streaming" : tape.status === "loading" ? "Syncing" : "Indicative" },
        { k: "Print sequence", v: `#${tape.seq}` },
        { k: "Paper today → rail", v: "24 days → 9 min" },
      ]}
    />
  );
}
