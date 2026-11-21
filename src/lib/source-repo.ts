/** Public source repository for CorpVidesh AI. The GitHub tab reads its latest commit through a server function. */
export const SOURCE_REPO = {
  owner: "Rajamukherjee1973",
  name: "CORPVIDESHAI",
  branch: "main",
  url: "https://github.com/Rajamukherjee1973/CORPVIDESHAI",
} as const;

export const CLONE_URL = `${SOURCE_REPO.url}.git`;

export type RepoStatus = {
  ok: true;
  sha: string;
  shortSha: string;
  message: string;
  committedAt: string | null;
  commitUrl: string;
  stars: number | null;
  defaultBranch: string;
} | { ok: false; reason: string };

type RawCommit = { sha?: unknown; html_url?: unknown; commit?: { message?: unknown; committer?: { date?: unknown } | null } | null };
type RawRepo = { stargazers_count?: unknown; default_branch?: unknown };

/** Turns GitHub API payloads into a small, display-safe status. Malformed payloads fail closed. */
export function parseRepoStatus(commit: unknown, repo: unknown): RepoStatus {
  const c = (commit ?? {}) as RawCommit;
  const r = (repo ?? {}) as RawRepo;
  if (typeof c.sha !== "string" || !/^[0-9a-f]{40}$/.test(c.sha)) return { ok: false, reason: "No commit found on the repository yet." };
  const message = typeof c.commit?.message === "string" ? c.commit.message.split("\n")[0]!.slice(0, 160) : "";
  const date = c.commit?.committer?.date;
  return {
    ok: true,
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message,
    committedAt: typeof date === "string" ? date : null,
    commitUrl: typeof c.html_url === "string" && c.html_url.startsWith("https://github.com/") ? c.html_url : `${SOURCE_REPO.url}/commit/${c.sha}`,
    stars: typeof r.stargazers_count === "number" ? r.stargazers_count : null,
    defaultBranch: typeof r.default_branch === "string" ? r.default_branch : SOURCE_REPO.branch,
  };
}

export const REPO_MAP: { path: string; role: string }[] = [
  { path: "src/routes/", role: "Every page and server route — file-based TanStack Start routing" },
  { path: "src/components/site/", role: "Swiss-grid interface: desks, studios, charts, 3D scenes, navigation" },
  { path: "src/lib/services/", role: "Bounded domains — legal, filings, markets — with versioned contracts" },
  { path: "src/lib/*.functions.ts", role: "Validated server functions: the only door from browser to server" },
  { path: "src/lib/*.server.ts", role: "Server-only logic: AI gateway calls, FX retrieval, filing storage" },
  { path: "src/data/", role: "Sourced, dated datasets — hubs, balance sheets, ODI history, scenarios" },
  { path: "src/tests/", role: "Deterministic policy and data tests run in CI on every push" },
  { path: "drizzle/migrations/", role: "Database schema, row-level security and append-only triggers" },
  { path: "public/docs/", role: "Dated presentation editions and architecture PDFs" },
  { path: ".github/workflows/", role: "Independent contract jobs before one integrated build" },
];

export const PRINCIPLES: { n: string; title: string; body: string }[] = [
  { n: "01", title: "Keys never reach the browser", body: "AI and connector credentials are read only inside server handlers; the browser holds publishable keys alone." },
  { n: "02", title: "Pure policy, thin I/O", body: "FEMA routing, treaty pricing and workflow order live in pure modules that tests can prove without a network." },
  { n: "03", title: "Append-only records", body: "Filings, reviews and fund proposals are written once; status derives from events, hash-chained in the database." },
  { n: "04", title: "Row-level isolation", body: "Every table enforces who may read or act; public showcase desks are fenced away from private records." },
  { n: "05", title: "Tested before deploy", body: "Independent CI jobs check contracts, policies and datasets on every push before one integrated build ships." },
  { n: "06", title: "Honest boundaries", body: "Simulations, indicative prices and advisory AI are labelled as such; nothing claims an official RBI or IFSCA filing." },
];
