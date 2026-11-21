/** Single source for site navigation: header menus, mobile menu, search palette and footer directory. */
export type NavItem = { to: string; label: string; note?: string };
export type NavNode = NavItem | { label: string; items: NavItem[] };

export const isGroup = (n: NavNode): n is { label: string; items: NavItem[] } => "items" in n;

export const PUBLIC_NAV: NavNode[] = [
  { label: "About", items: [
    { to: "/why", label: "Why CorpVidesh AI", note: "Problem · answer · who it serves" },
    { to: "/how-it-works", label: "Architecture & functional diagrams", note: "System · flow · swimlanes · agents · trust" },
    { to: "/compare", label: "Swiss grade vs competitors", note: "Seven stages · head-to-head" },
    { to: "/book-demo", label: "Book a demo", note: "Guided 45-minute walkthrough" },
    { to: "/blog/how-corpvidesh-ai-is-built", label: "Architecture blog", note: "How CorpVidesh AI is built" },
    { to: "/contact", label: "Contact", note: "Email · phone · address · secure message" },
  ] },
  { to: "/access", label: "Applications" },
  { label: "Intelligence", items: [
    { to: "/predictive-cases", label: "Predictive intelligence cases", note: "Six large-corporate decisions, forecast before they are made" },
    { to: "/intelligence", label: "Prediction & FX", note: "FX tape · market board · corridor ledger" },
    { to: "/hubs", label: "52 hubs atlas" },
    { to: "/africa-hubs", label: "+10 African hubs", note: "SADC & COMESA trade blocs" },
    { to: "/agents", label: "Agent desk · all AI agents" },
    { to: "/frontier", label: "Frontier tools" },
    { to: "/section195", label: "Section 195 & FEMA" },
  ] },
  { label: "Workspaces", items: [
    { to: "/console", label: "Corporate console & filings" },
    { to: "/fund-portal", label: "Fund investor portal" },
    { to: "/gift-portal", label: "GIFT multi-party review" },
    { to: "/regulator-portal", label: "Secure Form FC portal" },
    { to: "/filings", label: "Filings register" },
    { to: "/treasury", label: "Treasury live universe" },
    { to: "/portfolio", label: "OPI portfolio" },
    { to: "/routes", label: "Route intake" },
  ] },
  { label: "Evidence & VC", items: [
    { to: "/evidence", label: "Working evidence studio" },
    { to: "/architecture", label: "Architecture & feasibility" },
    { to: "/investors", label: "Investor brief" },
    { to: "/decks", label: "Presentation downloads" },
    { to: "/proof", label: "Competitive evidence" },
    { to: "/security", label: "Security demonstration" },
  ] },
  { to: "/source", label: "GitHub" },
];

/** Every remaining surface, listed once in the footer so nothing is orphaned. */
const DIRECTORY_RAW: NavItem[] = [
  { to: "/corporate-dashboard", label: "Corporate dashboard — filings, deadlines and submission" },
  { to: "/console", label: "Treasury console — FEMA and investment intelligence" },
  { to: "/", label: "Rail overview" },
  { to: "/frontier", label: "Frontier desk — AI copilot, stress tests, document reader, early warning" },
  { to: "/filings", label: "Filings register — company outbound transfers and required filings" },
  { to: "/filing-submission", label: "Form FC submissions — simulation records" },
  { to: "/predictive-cases", label: "Predictive intelligence cases — headroom, FX, query risk, spread and clearance for large corporates" },
  { to: "/intelligence", label: "Prediction surface — forecast + recommended action, folded desks" },
  {
    to: "/architecture",
    label: "Architecture — retrieval, memory, evaluation, secure tool boundary",
  },
  { to: "/hubs", label: "52 hubs atlas" },
  { to: "/africa-hubs", label: "African hubs — 10 SADC & COMESA corridors beside the 52" },
  {
    to: "/intelligence",
    label: "Folded evidence desks — FX tape, 52-hub exchange board, corridor ledger",
  },
  {
    to: "/agents",
    label: "Agent desk — statutory graph, copilot, document reader, currency outlook, connected tools",
  },
  { to: "/evidence", label: "Evidence studio — proof, mechanism, live case simulation" },
  { to: "/gift-portal", label: "GIFT City clearance portal — stored multi-party case ledger" },
  { to: "/fund-portal", label: "Fund investor portal — offshore proposals and GIFT tracking" },
  { to: "/proof", label: "Proof desk — side-by-side vs incumbents" },
  { to: "/routes", label: "Automatic vs Approval routes" },
  { to: "/treasury", label: "Treasury live universe" },
  { to: "/portfolio", label: "OPI portfolio book — allocation, hedge cover, rupee translation P&L" },
  { to: "/apply", label: "Clearance simulator" },
  { to: "/security", label: "Security theatre — live breach demo" },
  { to: "/casefile", label: "Regulator audit timeline + worked money case" },
  { to: "/section195", label: "Section 195 compliance engine — chargeability, TRC/10F, 15CA/15CB" },
  { to: "/supervisor", label: "Supervisor view" },
  { to: "/investors", label: "Investor brief" },
  { to: "/decks", label: "Live decks" },
  { to: "/access", label: "Desk access" },
  { to: "/ssl", label: "HTTPS / SSL status" },
  { to: "/why", label: "Why CorpVidesh AI" },
  { to: "/how-it-works", label: "Architecture & functional diagrams" },
  { to: "/compare", label: "Swiss grade vs competitors" },
  { to: "/book-demo", label: "Book a demo" },
  { to: "/blog", label: "Engineering blog" },
  { to: "/contact", label: "Contact — email, phone, address and secure message form" },
  { to: "/source", label: "GitHub source — repository, latest commit and how to run the code" },
];

export const DIRECTORY: NavItem[] = DIRECTORY_RAW.filter((d, i, all) => all.findIndex((x) => x.to === d.to) === i);


export type SearchGroup = { heading: string; items: NavItem[] };

/** Menu groups first, then every remaining directory page once, so search reaches every surface. */
export function searchGroups(): SearchGroup[] {
  const groups: SearchGroup[] = [];
  const seen = new Set<string>();
  const top: NavItem[] = [];
  for (const n of PUBLIC_NAV) {
    if (isGroup(n)) {
      groups.push({ heading: n.label, items: n.items });
      n.items.forEach((i) => seen.add(i.to));
    } else {
      top.push(n);
      seen.add(n.to);
    }
  }
  if (top.length) groups.unshift({ heading: "Start", items: top });
  const rest = DIRECTORY.filter((d) => !seen.has(d.to));
  if (rest.length) groups.push({ heading: "More pages", items: rest });
  return groups;
}
