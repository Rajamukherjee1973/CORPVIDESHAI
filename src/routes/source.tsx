import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Github, ExternalLink, Copy, Check } from "lucide-react";
import { Frame, Rule } from "@/components/site/Frame";
import { CLONE_URL, PRINCIPLES, REPO_MAP, SOURCE_REPO } from "@/lib/source-repo";
import { getRepoStatus } from "@/lib/source-repo.functions";

const TITLE = "GitHub source — CorpVidesh AI";
const DESC =
  "Open-source repository for CorpVidesh AI: latest commit, repository map, engineering principles and the steps to clone, test and run the outbound-capital RegTech prototype.";

export const Route = createFileRoute("/source")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SourcePage,
});

const STEPS: { n: string; label: string; cmd: string }[] = [
  { n: "01", label: "Clone", cmd: `git clone ${CLONE_URL}` },
  { n: "02", label: "Install", cmd: "cd CORPVIDESHAI && bun install" },
  { n: "03", label: "Configure", cmd: "cp .env.example .env   # add your own backend URL and publishable key" },
  { n: "04", label: "Test", cmd: "bunx vitest run" },
  { n: "05", label: "Run", cmd: "bun run dev   # http://localhost:8080" },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })} · ${d.toISOString().slice(11, 16)} UTC`;
}

function CopyLine({ cmd }: { cmd: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(cmd.split("   #")[0]!).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="group flex w-full items-center justify-between gap-3 bg-foreground px-4 py-3 text-left text-background"
      aria-label={`Copy command: ${cmd}`}
    >
      <code className="font-mono-ui overflow-x-auto whitespace-nowrap text-[12px]">{cmd}</code>
      {done ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <Copy className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" />}
    </button>
  );
}

function SourcePage() {
  const fetchStatus = useServerFn(getRepoStatus);
  const status = useQuery({ queryKey: ["source-repo-status"], queryFn: () => fetchStatus(), staleTime: 60_000, retry: 1 });
  const s = status.data;

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-4 pb-16 pt-10 sm:px-6 lg:pt-14">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">Source code · open repository</p>
            <h1 className="font-display mt-4 text-5xl leading-[0.95] tracking-tight sm:text-6xl">
              Read every line
              <span className="text-primary"> on GitHub.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              The complete CorpVidesh AI prototype — pages, server functions, legal policy modules, database migrations and tests —
              is published in one public repository maintained by Team Quantum Leap.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={SOURCE_REPO.url}
                target="_blank"
                rel="noreferrer"
                className="font-mono-ui inline-flex items-center gap-2 bg-primary px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
              >
                <Github className="h-4 w-4" /> Open on GitHub <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Link to="/blog/how-corpvidesh-ai-is-built" className="font-mono-ui inline-flex items-center border border-foreground px-5 py-3 text-[11px] uppercase tracking-[0.16em] hover:border-primary hover:text-primary">
                Read the architecture blog
              </Link>
            </div>
          </div>

          <aside className="lg:col-span-5" aria-live="polite">
            <div className="border border-rule/25">
              <div className="flex items-center justify-between bg-foreground px-5 py-3 text-background">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em]">Latest commit · {SOURCE_REPO.branch}</p>
                <span className={`h-2 w-2 ${s?.ok ? "bg-primary" : "bg-muted-foreground"}`} aria-hidden />
              </div>
              <div className="p-5">
                <p className="font-mono-ui break-all text-[11px] text-muted-foreground">{SOURCE_REPO.owner}/{SOURCE_REPO.name}</p>
                {status.isPending ? (
                  <p className="mt-4 text-sm text-muted-foreground">Reading the repository…</p>
                ) : s?.ok ? (
                  <>
                    <p className="font-display mt-3 text-2xl leading-snug">{s.message || "Untitled commit"}</p>
                    <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-rule/20 pt-4 text-sm">
                      <div><dt className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Commit</dt><dd className="font-mono-ui mt-1"><a href={s.commitUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">{s.shortSha}</a></dd></div>
                      <div><dt className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Updated</dt><dd className="mt-1">{formatDate(s.committedAt)}</dd></div>
                      <div><dt className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Branch</dt><dd className="mt-1">{s.defaultBranch}</dd></div>
                      <div><dt className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Stars</dt><dd className="mt-1">{s.stars ?? "—"}</dd></div>
                    </dl>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {s?.reason ?? "The latest commit could not be read."} The repository is still available on GitHub.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6">
        <Rule label="Run it yourself · five commands" />
        <ol className="grid gap-3">
          {STEPS.map((st) => (
            <li key={st.n} className="grid items-center gap-2 sm:grid-cols-[3rem_7rem_1fr]">
              <span className="font-mono-ui text-[11px] text-primary">{st.n}</span>
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{st.label}</span>
              <CopyLine cmd={st.cmd} />
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-12 px-4 pb-20 sm:px-6 lg:grid-cols-2">
        <div>
          <Rule label="Repository map" />
          <div className="border-t border-rule/20">
            {REPO_MAP.map((r) => (
              <div key={r.path} className="grid gap-1 border-b border-rule/20 py-3 sm:grid-cols-[13rem_1fr] sm:gap-4">
                <code className="font-mono-ui text-[12px] text-foreground">{r.path}</code>
                <p className="text-sm text-muted-foreground">{r.role}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Rule label="Engineering principles in the code" />
          <div className="grid gap-px bg-rule/20 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.n} className="bg-background p-5">
                <span className="font-mono-ui text-[11px] text-primary">{p.n}</span>
                <p className="font-display mt-2 text-xl leading-tight">{p.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            The repository holds a working prototype. Regulator lanes are simulations, prices are indicative and AI output is advisory —
            it is not an official RBI, IFSCA or Ministry of Finance system. All Copyrights Protected @ Raja Mukherjee | Department of Law | Brainware University.
          </p>
        </div>
      </section>
    </Frame>
  );
}
