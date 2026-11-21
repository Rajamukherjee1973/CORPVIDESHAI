// One shared source of truth for "what must actually be done next".
//
// Both desks read the same filing records, so the corporate to-do list and
// the regulator to-do list can never drift apart or repeat one another:
// every task appears exactly once, on the desk that owns it.

import {
  DOCS_APPROVAL,
  DOCS_AUTO,
  PORTAL_STAGES,
  progressFor,
  type PortalApplication,
} from "@/lib/portal";
import {
  REG_TASKS,
  autoDecisions,
  automaticRouteDecisions,
  type DecisionMap,
  type Engine,
} from "@/lib/regulator";

export type TaskState = "done" | "now" | "next" | "open";

export type WorkTask = {
  id: string;
  seq: number;
  title: string;
  owner: string;
  basis: string;
  engine: Engine;
  state: TaskState;
  detail: string;
  plain: string;
  /** Canonical desk that executes this task — no other page repeats it. */
  deskLabel: string;
  deskTo: "/portal" | "/processing" | "/regulator" | "/console" | "/gift" | "/mechanism";
};

export const STATE_LABEL: Record<TaskState, string> = {
  done: "Cleared",
  now: "In hand",
  next: "Next up",
  open: "Waiting",
};

const STAGE_ENGINE: Engine[] = [
  "manual",
  "alicloud",
  "qwen",
  "langchain",
  "fabric",
  "qwen",
  "fabric",
  "manual",
  "manual",
  "fabric",
];

/** Tasks a treasury must execute before a file exists. */
export function corporatePreFiling(): WorkTask[] {
  return [
    {
      id: "pre:entity",
      seq: 1,
      title: "Pick the entity and read the Rule 7 headroom",
      owner: "Corporate treasury",
      basis: "Rule 7, OI Rules 2022 — 400% of audited net worth",
      engine: "qwen",
      state: "now",
      detail:
        "Select the listed or unlisted entity, load audited net worth and read the remaining headroom before committing to a corridor.",
      plain: "Check how much the company is still allowed to send abroad.",
      deskLabel: "Treasury console",
      deskTo: "/console",
    },
    {
      id: "pre:hub",
      seq: 2,
      title: "Choose the destination hub and settlement currency",
      owner: "Corporate treasury",
      basis: "GIFT IFSC corridor rules · live FX",
      engine: "langchain",
      state: "next",
      detail:
        "Set the target financial centre out of the 52 hubs, the currency and the rupee value the board approved.",
      plain: "Decide which financial centre the money goes to, and in which currency.",
      deskLabel: "GIFT IFSC desk",
      deskTo: "/gift",
    },
    {
      id: "pre:route",
      seq: 3,
      title: "Confirm Automatic or Approval route",
      owner: "CorpVidesh engine",
      basis: "Rule 9 / Rule 10, OI Rules 2022",
      engine: "qwen",
      state: "next",
      detail:
        "The engine tests the commitment against the ceiling and sector conditions and states the route with the rule quoted.",
      plain: "The system says whether you can simply file, or must first ask permission.",
      deskLabel: "Corporate filing desk",
      deskTo: "/portal",
    },
    {
      id: "pre:docs",
      seq: 4,
      title: `Attach the ${DOCS_AUTO.length} core annexures (+${DOCS_APPROVAL.length} if Approval route)`,
      owner: "Corporate treasury",
      basis: "Companies Act s.179(3) · FEMA (OI) Regulations 2022 · s.195",
      engine: "langchain",
      state: "next",
      detail:
        "Board resolution, Form FC Part I, valuation certificate, net-worth certificate, KYC and 15CA/15CB — each matched to the statute that demands it.",
      plain: "Upload the papers the law asks for. The system tells you if one is missing.",
      deskLabel: "Corporate filing desk",
      deskTo: "/portal",
    },
    {
      id: "pre:submit",
      seq: 5,
      title: "Submit to the AD Category-I bank rail",
      owner: "Corporate treasury",
      basis: "Master Direction — Overseas Investment",
      engine: "fabric",
      state: "next",
      detail:
        "Submission mints the reference, hashes every annexure and opens the live clearance rail visible to the bank and the six regulators.",
      plain: "Send the file. From here you can watch it move, step by step.",
      deskLabel: "Corporate filing desk",
      deskTo: "/portal",
    },
  ];
}

/** Live task list for one filing, from the corporate point of view. */
export function corporateTasksFor(app: PortalApplication, now: number): WorkTask[] {
  const p = progressFor(app, now);
  return PORTAL_STAGES.map((s, i) => {
    const st = p.states[i];
    const state: TaskState = st === "cleared" ? "done" : st === "running" ? "now" : "next";
    const desk =
      i <= 1 ? ("/portal" as const) : s.key === "parallel" ? ("/regulator" as const) : ("/processing" as const);
    return {
      id: `${app.ref}:${s.key}`,
      seq: i + 1,
      title: s.title,
      owner: s.actor,
      basis: s.evidence,
      engine: STAGE_ENGINE[i] ?? "langchain",
      state,
      detail: s.detail,
      plain: s.plain,
      deskLabel:
        desk === "/portal" ? "Corporate filing desk" : desk === "/regulator" ? "Regulator window" : "AD bank rail",
      deskTo: desk,
    };
  });
}

/** Live task list for one filing, from a regulator's point of view. */
export function regulatorTasksFor(
  app: PortalApplication,
  now: number,
  decisions: DecisionMap,
  scopeCode?: string,
): WorkTask[] {
  const auto =
    app.route === "Automatic" ? automaticRouteDecisions(app, now) : autoDecisions(app, now);
  const taken = { ...auto, ...(decisions[app.ref] ?? {}) };
  const p = progressFor(app, now);
  const windowOpen = p.states[PORTAL_STAGES.findIndex((s) => s.key === "parallel")] !== "queued";

  return REG_TASKS.filter((t) => !scopeCode || t.code === scopeCode).map((t, i) => {
    const dec = taken[t.code];
    const state: TaskState = dec ? "done" : windowOpen ? "now" : "open";
    return {
      id: `${app.ref}:reg:${t.code}`,
      seq: i + 1,
      title: `${t.code} — ${t.scope}`,
      owner: t.mode === "manual" ? `${t.officer} (named officer)` : `${t.officer} (rule engine)`,
      basis: t.test,
      engine: t.engine,
      state,
      detail: dec
        ? `${dec.status === "approved" ? "Approved" : "Queried"} by ${dec.officer} — ${dec.note}`
        : windowOpen
          ? "Open in the parallel window. Sign or query from the approvals queue."
          : "Opens the moment the parallel regulatory window is reached.",
      plain: t.plain,
      deskLabel: "Regulator approvals queue",
      deskTo: "/regulator",
    };
  });
}

/** Standing regulator duties shown when nothing is in the queue yet. */
export function regulatorStanding(scopeCode?: string): WorkTask[] {
  return REG_TASKS.filter((t) => !scopeCode || t.code === scopeCode).map((t, i) => ({
    id: `standing:${t.code}`,
    seq: i + 1,
    title: `${t.code} — ${t.scope}`,
    owner: t.mode === "manual" ? `${t.officer} (named officer)` : `${t.officer} (rule engine)`,
    basis: t.test,
    engine: t.engine,
    state: "open" as TaskState,
    detail: "No filing is presently in this window. Incoming files land here the instant they are dispatched.",
    plain: t.plain,
    deskLabel: "Regulator approvals queue",
    deskTo: "/regulator" as const,
  }));
}

export function countStates(tasks: WorkTask[]) {
  return {
    done: tasks.filter((t) => t.state === "done").length,
    now: tasks.filter((t) => t.state === "now").length,
    pending: tasks.filter((t) => t.state === "next" || t.state === "open").length,
    total: tasks.length,
  };
}