import { createServerFn } from "@tanstack/react-start";
import { SOURCE_REPO, parseRepoStatus, type RepoStatus } from "./source-repo";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/github";

/** Public read of the latest commit on the source repository; never returns credentials or raw provider bodies. */
export const getRepoStatus = createServerFn({ method: "GET" }).handler(async (): Promise<RepoStatus> => {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const githubKey = process.env["GITHUB_API_KEY"];
  if (!lovableKey || !githubKey) return { ok: false, reason: "Repository link is not configured." };
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": githubKey,
  };
  const base = `${GATEWAY_URL}/repos/${SOURCE_REPO.owner}/${SOURCE_REPO.name}`;
  try {
    const [commitRes, repoRes] = await Promise.all([
      fetch(`${base}/commits/${SOURCE_REPO.branch}`, { headers }),
      fetch(base, { headers }),
    ]);
    if (!commitRes.ok) {
      console.error(`GitHub commit read failed [${commitRes.status}]: ${(await commitRes.text()).slice(0, 300)}`);
      return { ok: false, reason: `GitHub did not return the latest commit (status ${commitRes.status}).` };
    }
    const repo = repoRes.ok ? await repoRes.json() : null;
    return parseRepoStatus(await commitRes.json(), repo);
  } catch (error) {
    console.error("GitHub status read failed", error instanceof Error ? error.message : error);
    return { ok: false, reason: "GitHub could not be reached just now." };
  }
});
