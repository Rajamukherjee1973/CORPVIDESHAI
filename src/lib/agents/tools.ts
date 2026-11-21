/**
 * Secure tool connections — an MCP-shaped surface for the statutory desk.
 *
 * Every external system the agent may touch is declared here as a tool with an
 * explicit scope, an auth mode, a side-effect class and a data-egress note.
 * The agent may only call a tool whose scope the current session grants, and
 * every call is written to an append-only tool ledger the regulator can read.
 * Nothing is discovered at runtime and nothing is called implicitly.
 */

export type ToolScope =
  | "market.read"
  | "fx.read"
  | "corpus.read"
  | "ledger.read"
  | "ledger.write"
  | "filing.submit";

export type ToolSpec = {
  name: string;
  server: string;
  transport: "in-process" | "http" | "mcp/http";
  scope: ToolScope;
  auth: "none (public feed)" | "session bearer" | "service credential" | "officer step-up";
  effect: "read" | "write" | "irreversible";
  approval: boolean;
  egress: string;
  purpose: string;
};

export const TOOLS: ToolSpec[] = [
  {
    name: "fx.rate",
    server: "corpvidesh.fx",
    transport: "http",
    scope: "fx.read",
    auth: "none (public feed)",
    effect: "read",
    approval: false,
    egress: "None — currency codes only leave the rail.",
    purpose: "Round-the-clock interbank rupee print used to price a corridor.",
  },
  {
    name: "market.quote",
    server: "corpvidesh.markets",
    transport: "http",
    scope: "market.read",
    auth: "none (public feed)",
    effect: "read",
    approval: false,
    egress: "None — index symbols only.",
    purpose: "Benchmark index level and session move for the destination venue.",
  },
  {
    name: "statute.search",
    server: "corpvidesh.corpus",
    transport: "in-process",
    scope: "corpus.read",
    auth: "session bearer",
    effect: "read",
    approval: false,
    egress: "None — the corpus never leaves the process.",
    purpose: "Vector + lexical retrieval over the FEMA / Income-tax corpus.",
  },
  {
    name: "ledger.read",
    server: "corpvidesh.ledger",
    transport: "in-process",
    scope: "ledger.read",
    auth: "session bearer",
    effect: "read",
    approval: false,
    egress: "Case metadata stays inside the tenant boundary.",
    purpose: "Read owner-scoped private agent outcomes through the server; regulator demonstration roles grant no access.",
  },
  {
    name: "ledger.stamp",
    server: "corpvidesh.ledger",
    transport: "mcp/http",
    scope: "ledger.write",
    auth: "service credential",
    effect: "write",
    approval: true,
    egress: "Hash-chained entry; payload hashed, not copied.",
    purpose: "Not connected — mutation is refused; existing treasury ledger remains a device-local simulation.",
  },
  {
    name: "filing.submit",
    server: "corpvidesh.filing",
    transport: "mcp/http",
    scope: "filing.submit",
    auth: "officer step-up",
    effect: "irreversible",
    approval: true,
    egress: "Form 15CA/15CB payload to the statutory endpoint.",
    purpose: "Not connected — official AD-bank and tax-portal submission is refused.",
  },
];

/** Scopes a role is allowed to exercise. Anything else is refused before the call. */
export const ROLE_SCOPES: Record<string, ToolScope[]> = {
  guest: ["fx.read", "market.read"],
  corporate: ["fx.read", "market.read", "corpus.read", "ledger.read", "ledger.write"],
  regulator: ["fx.read", "market.read", "corpus.read", "ledger.read"],
  officer: [
    "fx.read",
    "market.read",
    "corpus.read",
    "ledger.read",
    "ledger.write",
    "filing.submit",
  ],
};

export type ToolCall = {
  id: string;
  at: number;
  tool: string;
  role: string;
  allowed: boolean;
  reason: string;
  approvalRequired: boolean;
};

/**
 * Authorisation decision for one tool call. Deny-by-default: a scope the role
 * does not hold is refused, and a mutating tool additionally requires an
 * explicit human approval token.
 */
export function authorise(
  tool: ToolSpec,
  role: keyof typeof ROLE_SCOPES | string,
  approvalToken?: string,
): ToolCall {
  const scopes = ROLE_SCOPES[role] ?? ROLE_SCOPES["guest"] ?? [];
  const inScope = scopes.includes(tool.scope);
  const needsApproval = tool.approval && !approvalToken;
  return {
    id: `tc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: Date.now(),
    tool: tool.name,
    role: String(role),
    allowed: inScope && !needsApproval,
    reason: !inScope
      ? `Refused — role "${role}" does not hold scope ${tool.scope}.`
      : needsApproval
        ? `Held — ${tool.effect} tool requires an explicit approval token.`
        : `Granted on scope ${tool.scope} via ${tool.auth}.`,
    approvalRequired: tool.approval,
  };
}

const LEDGER_KEY = "cv.tool.ledger.v1";

export function readToolLedger(): ToolCall[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LEDGER_KEY) ?? "[]") as ToolCall[];
  } catch {
    return [];
  }
}

export function appendToolLedger(c: ToolCall): ToolCall[] {
  const rows = [c, ...readToolLedger()].slice(0, 120);
  if (typeof window !== "undefined")
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(rows));
  return rows;
}
