/** Mechanism Matrix domain data — shared by the route, the UI and the tests. */

export type Level = 0 | 1 | 2;

export type Layer = {
  id: string;
  n: string;
  name: string;
  role: string;
  input: string;
  action: string;
  output: string;
  tech: string;
  why: string;
  owner: string;
  latency: string;
  manual: string;
  plain: string;
  failsafe: string;
};

export const LAYERS: Layer[] = [
  {
    id: "L1",
    n: "01",
    name: "Intake & Identity",
    role: "Establish who is remitting, under which universe, and with what net worth.",
    input: "Entity selection from the NSE-500, BSE-500 or unlisted-500 universe; CIN, LEI and audited net worth.",
    action:
      "Resolves the group tree, pins the last audited net worth to a date, and locks the entity's identity to the filing before a single number is computed.",
    output: "A sealed entity header — identity, universe, group members, net worth as-of date.",
    tech: "Structured entity graph + deterministic resolver",
    why:
      "Identity is the one thing that must never be inferred by a model. A graph lookup either resolves or refuses; it cannot hallucinate a subsidiary.",
    owner: "Priyanshu Dhar — Team Co Lead",
    latency: "8 sec",
    manual: "2–4 days",
    plain:
      "The system first works out exactly which company is sending money, who its parents and subsidiaries are, and how much the company is worth on paper.",
    failsafe: "Unresolved identity halts the filing; nothing downstream can start.",
  },
  {
    id: "L2",
    n: "02",
    name: "Rule 7 Headroom Engine",
    role: "Compute the statutory ceiling and the room left under it.",
    input: "Sealed entity header, existing overseas commitments, guarantees and prior ODI/OPI drawdowns.",
    action:
      "Applies the 400% of net worth financial-commitment ceiling at group level, subtracts utilised headroom, and returns remaining capacity to the rupee.",
    output: "Headroom instrument — ceiling, utilised, remaining, and the route the number implies.",
    tech: "Deterministic rules engine (no model in the decision path)",
    why:
      "A ceiling is arithmetic under law, not judgement. Hard-coded rule logic is reproducible, testable and defensible to a supervisor line by line.",
    owner: "Raja Mukherjee — Team Lead",
    latency: "1.2 sec",
    manual: "3–6 days",
    plain:
      "Indian law lets a company commit abroad up to four times what it is worth. This layer does that sum and shows how much room is left.",
    failsafe: "Any ambiguity resolves conservatively — downward — and flags for human review.",
  },
  {
    id: "L3",
    n: "03",
    name: "Statutory Reasoning",
    role: "Read the law against the facts and cite the provision behind every conclusion.",
    input: "Headroom instrument, corridor selection, instrument type, sector and end-use.",
    action:
      "Retrieves the governing provisions from FEMA, the OI Rules 2022, the OI Directions, the Income-tax Act and the applicable DTAA, then drafts a reasoned position with paragraph-level citation.",
    output: "A cited legal position — permitted / conditional / prohibited, with the text relied upon.",
    tech: "Qwen LLM on Alibaba Cloud, orchestrated with LangChain retrieval",
    why:
      "Long-context Qwen models handle Indian statutory prose and schedules without truncation, and LangChain forces every sentence back to a retrieved provision. The model drafts; it never decides.",
    owner: "ADITI KULKARNI — Concept & Corporate Law Support",
    latency: "38 sec",
    manual: "5–9 days",
    plain:
      "The system reads the actual law, applies it to this specific transaction, and writes down its reasoning with the exact rule number it relied on — so a lawyer can check it.",
    failsafe: "An uncited sentence is discarded before the position is issued.",
  },
  {
    id: "L4",
    n: "04",
    name: "Route Determination",
    role: "Decide Automatic Route or Approval Route — and prove why.",
    input: "Cited legal position, headroom result, corridor and sector flags.",
    action:
      "Runs the route decision tree. Within ceiling, permitted sector, no prohibited jurisdiction, no residual guarantee breach implies Automatic. Any single failure routes to Approval with the failing condition named.",
    output: "Route verdict with the deciding condition and the regulator endpoints it activates.",
    tech: "Decision tree over rule outputs, veto held by rule code",
    why:
      "The route is the single highest-consequence output in the file. It is derived only from deterministic checks so it can be re-run and reproduced identically, forever.",
    owner: "Raja Mukherjee — Team Lead",
    latency: "0.4 sec",
    manual: "2–5 days",
    plain:
      "Some money can go abroad automatically; some needs a regulator's permission first. This layer decides which, and says exactly what triggered it.",
    failsafe: "When in doubt, the filing is escalated to Approval rather than cleared.",
  },
  {
    id: "L5",
    n: "05",
    name: "Evidence & Zero-Knowledge Proof",
    role: "Prove compliance without exposing the balance sheet.",
    input: "Route verdict, source documents, board resolutions, valuation reports, 15CA/15CB pairing.",
    action:
      "Hashes each document into an evidence digest and generates a zero-knowledge proof that the ceiling test passed — without transmitting the underlying financials.",
    output: "Evidence bundle plus a verifiable proof artefact for each assertion.",
    tech: "Zero-knowledge proof circuits over hashed evidence",
    why:
      "Treasuries will not stream competitive financials to five parties. A proof lets a supervisor verify the ceiling arithmetically while the numbers stay inside the company.",
    owner: "Priyanshu Dhar — Team Co Lead",
    latency: "22 sec",
    manual: "4–7 days",
    plain:
      "Instead of handing over confidential accounts, the system produces mathematical proof that the limits were respected. The regulator can verify it without ever seeing the figures.",
    failsafe: "A failed proof blocks submission; no unverifiable file reaches a regulator.",
  },
  {
    id: "L6",
    n: "06",
    name: "Federated Supervisory Ledger",
    role: "Write one record all six authorities and the AD bank read simultaneously.",
    input: "Evidence bundle, proof artefacts, route verdict, officer identities.",
    action:
      "Commits each checkpoint as a hash-chained block on a federated ledger where IFSCA, RBI, SEBI, MCA, CBDT and the AD bank are members rather than recipients.",
    output: "An append-only, tamper-evident clearance chain, live to every member.",
    tech: "Permissioned federated blockchain with hash-chained checkpoints",
    why:
      "The delay in Indian outbound is not analysis — it is five parties rebuilding the same file in sequence. A shared ledger removes the sequence, not the scrutiny.",
    owner: "Priyanshu Dhar — Team Co Lead",
    latency: "6 sec",
    manual: "9–18 days",
    plain:
      "Everyone who must sign off looks at the same tamper-proof record at the same time, instead of emailing folders to each other one after another.",
    failsafe: "Blocks are append-only; a broken chain is visible to every member instantly.",
  },
  {
    id: "L7",
    n: "07",
    name: "Clearance & Continuing Compliance",
    role: "Release the remittance and keep the obligation alive afterwards.",
    input: "Complete clearance chain and all member acknowledgements.",
    action:
      "Issues the cleared instruction to the AD bank, then schedules APR, disinvestment and reporting obligations against the same record for the life of the investment.",
    output: "Cleared remittance plus a live continuing-compliance calendar.",
    tech: "Event scheduler bound to the ledger record",
    why:
      "Most compliance failures happen after clearance, not before. Binding future obligations to the original record is what turns a filing into a permanent audit position.",
    owner: "Raja Mukherjee — Team Lead",
    latency: "3 sec",
    manual: "Ongoing, manual",
    plain:
      "The money goes out — and the system keeps reminding the company of every follow-up report it still owes, years later.",
    failsafe: "A missed obligation surfaces on the supervisor desk before it becomes a default.",
  },
];

export const AXES = ["Determinism", "Model involvement", "Regulator visibility", "Cryptographic proof"] as const;

export const GRID: Record<string, Level[]> = {
  L1: [2, 0, 1, 1],
  L2: [2, 0, 1, 1],
  L3: [1, 2, 1, 0],
  L4: [2, 0, 2, 1],
  L5: [2, 0, 2, 2],
  L6: [2, 0, 2, 2],
  L7: [2, 1, 2, 1],
};

export const SCALE = ["None", "Partial", "Full"] as const;

/** Control-matrix row for a layer. Always four values, one per axis. */
export function gridFor(id: string): Level[] {
  const row = GRID[id];
  if (!row || row.length !== AXES.length) return AXES.map(() => 0 as Level);
  return row;
}

/** Human label for a control level. */
export function scaleLabel(v: Level): string {
  return SCALE[v] ?? "None";
}

/** Seconds a layer costs on the automated rail, parsed from its latency label. */
export function latencySecs(id: string): number {
  const l = LAYERS.find((x) => x.id === id);
  return l ? (parseFloat(l.latency) || 1) : 1;
}

/** Neighbouring layers in the chain — what feeds this layer, and what it feeds. */
export function chainOf(id: string): { prev?: Layer; next?: Layer; index: number } {
  const i = LAYERS.findIndex((x) => x.id === id);
  const out: { prev?: Layer; next?: Layer; index: number } = { index: i };
  if (i > 0) out.prev = LAYERS[i - 1]!;
  if (i >= 0 && i < LAYERS.length - 1) out.next = LAYERS[i + 1]!;
  return out;
}
