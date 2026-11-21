export const ACCEPTANCE_CRITERIA = [
  { id: "F01", name: "Deterministic decision and boundary checks", target: "All selected service regression tests pass", status: "Measured", evidence: "Download the current test evidence; assertions cover legal triage, access checks, audit failure and filing snapshots.", link: "/architecture" },
  { id: "F02", name: "Connected public assessment", target: "ODI normal / exceeded ceiling and OPI outcomes return and export", status: "Observed", evidence: "Browser verification on 26 October 2026: ODI AD-bank review, ODI prior-approval review and OPI ₹500 cr ceiling / ₹200 cr exposure; JSON read-back succeeded.", link: "/architecture" },
  { id: "F03", name: "Cross-device navigation", target: "Architecture and Investor tabs work; no horizontal overflow at 390 px", status: "Observed", evidence: "Browser checks on 26 October 2026 reported zero page errors and no mobile horizontal overflow. Not a full accessibility certification.", link: "/investors" },
  { id: "F04", name: "Private filing read-back and isolation", target: "Assigned corporate submits; regulator reads; unrelated account cannot access", status: "Blocked", evidence: "Unit access/snapshot checks pass; live account verification is pending invited users and trusted company assignments.", link: "/corporate-dashboard" },
  { id: "F05", name: "Production integration and scale", target: "Authorized bank/regulator connection; independently measured SLOs", status: "Not verified", evidence: "No official approval channel, independent service hosting or production load certification is provisioned.", link: "/architecture" },
  { id: "F06", name: "Counsel-certified statutory completeness", target: "Current amendments and interpretation reviewed and signed off", status: "Not verified", evidence: "Cited legal tools exist; a comprehensive current-law consolidation and professional certification have not been supplied.", link: "/console" },
] as const;

export const RESOURCE_PLAN = [
  { id: "lead", item: "Technical lead / architecture", category: "Talent", quantity: 1, monthlyLakh: 2.5, months: 6, purpose: "Service contracts, integration ownership and delivery reviews" },
  { id: "engineering", item: "Full-stack engineers", category: "Talent", quantity: 2, monthlyLakh: 1.8, months: 6, purpose: "Treasury workflows, secure filings and provider adapters" },
  { id: "ai", item: "AI / retrieval engineer", category: "Talent", quantity: 1, monthlyLakh: 2, months: 6, purpose: "Grounded retrieval, evaluation and model failure handling" },
  { id: "qa", item: "QA / security engineer", category: "Talent", quantity: 1, monthlyLakh: 1.5, months: 6, purpose: "Isolation tests, accessibility checks and threat validation" },
  { id: "legal", item: "Indian regulatory counsel", category: "Specialist", quantity: 1, monthlyLakh: 1.5, months: 6, purpose: "Amendment verification and reviewed interpretation releases" },
  { id: "design", item: "Product / design specialist", category: "Specialist", quantity: 1, monthlyLakh: 1, months: 3, purpose: "Executive usability and pilot workflow refinement" },
  { id: "cloud", item: "Cloud, storage and observability", category: "Tools", quantity: 1, monthlyLakh: 0.5, months: 6, purpose: "Isolated environments, backups, traces and access monitoring" },
  { id: "model", item: "Model / retrieval evaluation credits", category: "Tools", quantity: 1, monthlyLakh: 0.4, months: 6, purpose: "Controlled evaluations; usage billed separately by provider" },
  { id: "audit", item: "Independent security assessment", category: "Assurance", quantity: 1, monthlyLakh: 4, months: 1, purpose: "Pilot penetration testing and remediation review" },
  { id: "equipment", item: "Workstations / test devices", category: "Materials", quantity: 5, monthlyLakh: 1, months: 1, purpose: "One-time equipment allowance; no specialized physical hardware required" },
] as const;
export type BudgetLine = { quantity: number; monthlyLakh: number; months: number };
export function allocationBudget(lines: readonly BudgetLine[], contingencyPercent: number) {
  if (!Number.isFinite(contingencyPercent) || contingencyPercent < 0 || contingencyPercent > 100 || lines.some((line) => [line.quantity, line.monthlyLakh, line.months].some((value) => !Number.isFinite(value) || value < 0))) throw new Error("Budget inputs must be finite and non-negative.");
  const subtotalLakh = lines.reduce((sum, line) => sum + line.quantity * line.monthlyLakh * line.months, 0);
  const contingencyLakh = subtotalLakh * contingencyPercent / 100;
  return { subtotalLakh, contingencyLakh, totalLakh: subtotalLakh + contingencyLakh };
}
export const DELIVERY_GATES = [
  { stage: "01 / Foundation", timing: "Months 1–2", owner: "Technical lead + counsel", deliverable: "Verified requirements, legal source release, service contracts and test baseline", exit: "Approved scope, accountable owners and reviewed acceptance criteria" },
  { stage: "02 / Controlled pilot", timing: "Months 3–4", owner: "Engineering + QA", deliverable: "Invited company accounts, shared demo filing read-back and monitored failures", exit: "Multi-account isolation and end-to-end save/read-back evidence" },
  { stage: "03 / Assurance", timing: "Months 5–6", owner: "Security + pilot sponsor", deliverable: "Independent security assessment, load tests and integration agreements", exit: "Documented findings resolved; explicit go/no-go review, not automatic production approval" },
] as const;