import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame } from "@/components/site/Frame";
import { AboutNav } from "@/components/site/AboutNav";
import { DIAGRAMS, type DiagramId } from "@/components/site/ArchitectureDiagrams";
import { BLOG_POSTS, formatBlogDate } from "@/lib/blog";

const POST = BLOG_POSTS[0];
const TITLE = "How CorpVidesh AI is built — Architecture blog";
const DESC =
  "An engineering walkthrough of CorpVidesh AI: five layers, four server domains, hash-chained records, row isolation, a multi-agent graph with a quality veto, and 137 automated checks.";

export const Route = createFileRoute("/blog/how-corpvidesh-ai-is-built")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "article:published_time", content: POST.date },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArchitectureBlog,
});

const TOC = [
  ["principles", "Design principles"],
  ["stack", "The stack"],
  ["layers", "Five layers"],
  ["domains", "Four server domains"],
  ["lifecycle", "Life of a request"],
  ["integrity", "Record integrity & isolation"],
  ["agents", "The agent graph"],
  ["markets", "Market data without theatre"],
  ["quality", "Tests & delivery"],
  ["boundaries", "What is not built yet"],
] as const;

function Figure({ id, n, caption }: { id: DiagramId; n: number; caption: string }) {
  const d = DIAGRAMS.find((x) => x.id === id)!;
  const Svg = d.svg;
  return (
    <figure className="my-10 border border-rule/20">
      <div className="flex items-baseline justify-between gap-2 bg-foreground px-4 py-2.5 text-background">
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.18em]">Fig. {n} · {d.title}</span>
        <Link to="/how-it-works" search={{ d: id }} className="font-mono-ui text-[10px] uppercase tracking-[0.14em] opacity-80 hover:opacity-100">Open interactive →</Link>
      </div>
      <div className="p-3 sm:p-5"><Svg /></div>
      <figcaption className="border-t border-rule/15 px-4 py-3 text-xs text-muted-foreground"><span className="font-mono-ui mb-1 block text-[10px] uppercase tracking-[0.14em] text-primary sm:hidden">Swipe sideways to see the full diagram</span>{caption}</figcaption>
    </figure>
  );
}

function Code({ file, children }: { file: string; children: string }) {
  return (
    <figure className="my-8 border border-foreground">
      <figcaption className="font-mono-ui flex justify-between bg-foreground px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-background">
        <span>{file}</span><span className="text-primary">excerpt</span>
      </figcaption>
      <pre className="overflow-x-auto bg-muted/40 p-4 text-[12px] leading-relaxed"><code className="font-mono-ui">{children}</code></pre>
    </figure>
  );
}

function Section({ id, n, title, children }: { id: string; n: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-foreground pt-6 first:border-t-0">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">§{String(n).padStart(2, "0")}</p>
      <h2 className="font-display mt-2 break-words text-3xl leading-tight sm:text-4xl">{title}</h2>
      <div className="mt-5 space-y-5 text-[17px] leading-[1.75] text-foreground/90">{children}</div>
    </section>
  );
}

function Pull({ children }: { children: ReactNode }) {
  return <blockquote className="font-display my-8 border-l-4 border-primary pl-5 text-2xl leading-snug text-primary sm:text-3xl">{children}</blockquote>;
}

function ArchitectureBlog() {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<string>(TOC[0][0]);
  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById("article-body");
      if (el) {
        const r = el.getBoundingClientRect();
        setProgress(Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight))));
      }
      let current: string = TOC[0][0];
      for (const [id] of TOC) {
        const s = document.getElementById(id);
        if (s && s.getBoundingClientRect().top < 160) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Frame>
      <div aria-hidden className="fixed left-0 top-0 z-[60] h-[3px] bg-primary transition-[width]" style={{ width: `${progress * 100}%` }} />
      <AboutNav />
      <article>
        <header className="mx-auto max-w-[1400px] px-6 pb-8 pt-12">
          <nav aria-label="Breadcrumb" className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Link to="/blog" className="hover:text-primary">Engineering blog</Link> <span className="px-2">/</span> <span className="text-primary">{POST.kicker}</span>
          </nav>
          <h1 className="font-display mt-6 max-w-5xl text-5xl leading-[1] sm:text-7xl lg:text-[88px]">
            How CorpVidesh AI
            <span className="text-primary"> is built.</span>
          </h1>
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-muted-foreground">{POST.dek}</p>
          <div className="font-mono-ui mt-8 flex flex-wrap gap-x-8 gap-y-2 border-y border-rule/20 py-4 text-[10px] uppercase tracking-[0.16em]">
            <span>By {POST.author}</span>
            <span className="text-muted-foreground">{formatBlogDate(POST.date)}</span>
            <span className="text-muted-foreground">{POST.readMin} min read</span>
            <span className="text-muted-foreground">Department of Law · Brainware University</span>
          </div>
          <div className="mt-8 grid gap-px bg-rule/15 sm:grid-cols-3 lg:grid-cols-6">
            {[["5", "Layers"], ["4", "Server domains"], ["12", "Database migrations"], ["5", "Agent desk tools"], ["137", "Automated checks"], ["4", "CI contract gates"]].map(([k, t]) => (
              <div key={t} className="bg-background p-4">
                <p className="font-display text-3xl text-primary">{k}</p>
                <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="mx-auto grid max-w-[1400px] gap-10 px-6 pb-16 lg:grid-cols-12">
          <aside className="min-w-0 lg:col-span-3">
            <nav aria-label="Contents" className="lg:sticky lg:top-24">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">Contents</p>
              <ol className="mt-3 border-l border-rule/30">
                {TOC.map(([id, label], i) => (
                  <li key={id}>
                    <a href={`#${id}`} className={`-ml-px block border-l-2 py-1.5 pl-3 text-sm transition-colors ${active === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                      <span className="font-mono-ui mr-2 text-[10px]">{String(i + 1).padStart(2, "0")}</span>{label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div id="article-body" className="min-w-0 space-y-14 lg:col-span-8 lg:col-start-5">
            <p className="font-display text-2xl leading-snug sm:text-3xl">
              An outbound investment from India touches a treasury desk, an authorised dealer bank and several authorities. Each keeps its own copy of the facts.
              CorpVidesh AI is built around one idea: <span className="text-primary">a single, pre-validated, tamper-evident record that every desk reads.</span>{" "}
              This post explains how that record is engineered.
            </p>

            <Section id="principles" n={1} title="Design principles">
              <p>We borrowed from Swiss graphic design and Swiss banking alike: a strict grid, very few colours, and a refusal to decorate what should be stated plainly. In engineering terms that became five rules.</p>
              <ol className="grid gap-px bg-rule/15 sm:grid-cols-2">
                {[["Precision", "Every legal answer cites a provision; every price shows its source time."], ["Separation", "Rules live in pure modules; servers do I/O; screens only display."], ["Append, never edit", "Filings and reviews are added as new events, never overwritten."], ["Least authority", "Roles and company memberships are checked on the server for every write."], ["Honest labels", "Simulations, estimates and pilot targets are marked as such on screen."]].map(([h, d], i) => (
                  <li key={h} className="bg-background p-4 text-base sm:last:col-span-2"><span className="font-mono-ui mr-2 text-[10px] text-primary">{String(i + 1).padStart(2, "0")}</span><strong className="font-display">{h}.</strong> <span className="text-muted-foreground">{d}</span></li>
                ))}
              </ol>
            </Section>

            <Section id="stack" n={2} title="The stack">
              <p>CorpVidesh AI is a full-stack React 19 application on TanStack Start. Pages render on the server for fast first paint and shareable links; all private logic runs in typed server functions on edge workers, so secrets and database credentials never reach the browser.</p>
              <div className="overflow-x-auto border border-rule/20">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead><tr className="font-mono-ui bg-foreground text-[10px] uppercase tracking-[0.14em] text-background"><th className="px-4 py-2.5">Concern</th><th className="px-4 py-2.5">Choice</th><th className="px-4 py-2.5">Why</th></tr></thead>
                  <tbody>
                    {[["Interface", "React 19, TanStack Router, Tailwind CSS", "Type-safe routes; one design token set for the red/white grid"], ["Server", "TanStack Start server functions on edge workers", "Validated inputs, no exposed keys, low latency"], ["Data", "Lovable Cloud Postgres with row-level security", "Isolation enforced by the database, not by the screen"], ["Identity", "Email/password and Lovable sign-in, server-assigned roles", "Roles stored separately from profiles"], ["AI", "Lovable AI Gateway called only from server modules", "Model keys stay server-side; answers carry sources"], ["Visuals", "SVG diagrams, Three.js loaded only in the browser", "3D never blocks server rendering"], ["Quality", "Vitest, Playwright checks, GitHub Actions", "Each domain has its own test gate"]].map((r) => (
                      <tr key={r[0]} className="border-t border-rule/15"><td className="font-mono-ui px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] text-primary">{r[0]}</td><td className="px-4 py-2.5">{r[1]}</td><td className="px-4 py-2.5 text-muted-foreground">{r[2]}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="layers" n={3} title="Five layers, one direction of trust">
              <p>Requests flow downward: people use workspaces; workspaces call server domains; every write passes the safeguard layer before it reaches data. Nothing in an upper layer can grant itself authority from a lower one.</p>
              <Figure id="system" n={1} caption="Users → workspaces → server domains → safeguards → data. The dashed band lists official systems that are deliberately not connected today." />
            </Section>

            <Section id="domains" n={4} title="Four server domains, one deployment">
              <p>The backend is split into <strong>Legal</strong>, <strong>Filings</strong>, <strong>Markets</strong> and <strong>Agents</strong>. Each domain exposes a versioned contract (a validated input schema), keeps its rules in a pure policy module that is easy to test, and does its I/O in a server-only implementation. Here is the real entry point for the legal route assessment:</p>
              <Code file="src/lib/legal-services.functions.ts">{`export const assessInvestmentRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => legalCaseSchema.parse(input))
  .handler(async ({ data }) => {
    const { assessLegalRoute } = await import("./services/legal.server");
    const { serviceOperation } = await import("./services/runtime.server");
    return serviceOperation("legal.assess", () => assessLegalRoute(data));
  });`}</Code>
              <p>Three things happen in seven lines: the input is rejected unless it matches the contract, the server-only implementation is loaded only inside the handler, and the work is wrapped in a traced operation.</p>
              <Pull>Modular domains, one integrated deployment — we do not pretend to run independent microservices.</Pull>
            </Section>

            <Section id="lifecycle" n={5} title="Life of a request">
              <p>A treasury user picks a company, hub, currency, investment class and amount. That choice travels through eight steps, each writing to the same case record. A missing document blocks the flow rather than letting it continue with a warning.</p>
              <Figure id="flow" n={2} caption="Eight steps from selection to proof packet. Regulator responses in the prototype are demonstrations, not official approvals." />
              <p>Every server operation gets a fresh trace ID and a duration/outcome log line — with no payloads, identities or automatic retries:</p>
              <Code file="src/lib/services/runtime.server.ts">{`const traceId = crypto.randomUUID();
setResponseHeader("X-CorpVidesh-Trace-ID", traceId);
setResponseHeader("Cache-Control", "private, no-store");
// ... run the work, then log only:
{ event: "service-operation", operation, traceId, durationMs, outcome }`}</Code>
            </Section>

            <Section id="integrity" n={6} title="Record integrity & isolation">
              <p>Case events in the GIFT clearance portal are chained inside the database. A trigger locks the case, reads the previous hash and computes the new one, so order is enforced even if two reviewers act at the same moment:</p>
              <Code file="drizzle/migrations/0007_gift_atomic_filing_and_workflow.sql">{`NEW.prev_hash := COALESCE(last_hash, 'genesis');
NEW.hash := encode(extensions.digest(
  NEW.prev_hash || '|' || NEW.case_id || '|' || NEW.seq || '|' ||
  NEW.party || '|' || NEW.action || '|' || NEW.note || '|' ||
  array_to_string(NEW.documents, ',') || '|' || NEW.created_at::text,
  'sha256'), 'hex');`}</Code>
              <p>Isolation is enforced the same way. Row-level security policies separate private company records from public showcase desks, and corporate filing rights come from server-managed company memberships — never from a company name typed into a form.</p>
              <Figure id="trust" n={3} caption="Each event carries the previous hash; editing history breaks every later link. This proves record integrity — it is not blockchain consensus." />
            </Section>

            <Section id="agents" n={7} title="The agent graph">
              <p>Five tools sit on one Agent Desk: the statutory graph, the AI copilot, the document reader, the currency outlook and read-only connected tools. Inside the graph, a coordinator calls specialists and merges their findings. A quality veto checks the merged answer; malformed or unsupported output fails closed and forces a re-plan instead of being shown as verified.</p>
              <Figure id="agents" n={4} caption="Coordinator, seven specialists and a fail-closed quality veto. AI outputs are advisory and cannot file, approve or move money." />
              <p>Signed-in runs are saved as owner-scoped, append-only outcomes; anonymous demonstrations are not stored. Impact figures on the Agent Desk count only real runs from the current browser session.</p>
            </Section>

            <Section id="markets" n={8} title="Market data without theatre">
              <p>The 52-hub INR board, Indian and London FX, and the global benchmarks (FTSE 100, NYSE Composite, S&amp;P 500, Shanghai, Hang Seng and more) are fetched on the server from public sources and polled about every minute. We show the source time beside every number and never invent ticks between observations. Five-year history comes from business-day ECB reference rates; unsupported currencies show an error instead of synthetic history.</p>
              <Pull>If a number has no source time, it does not belong on a treasury screen.</Pull>
            </Section>

            <Section id="quality" n={9} title="Tests & delivery">
              <p>The repository holds 28 test files with 137 automated checks, all passing on 18 November 2026. Continuous integration runs four independent contract gates — Legal, Filings, Market and Agents — before a single application build:</p>
              <Code file=".github/workflows/service-ci.yml">{`matrix:
  - service: Legal     # legal, investments, feasibility
  - service: Filings   # access, submissions, register, service
  - service: Market    # fx
  - service: Agents    # integration, outlook, frontier, runtime, evaluation`}</Code>
              <p>Browser checks with Playwright cover the main journeys at phone and desktop widths, including menus, the clearance flow and the demo booking form.</p>
            </Section>

            <Section id="boundaries" n={10} title="What is not built yet">
              <p>A credible architecture says where it stops. Today CorpVidesh AI does <strong>not</strong>:</p>
              <ul className="space-y-2 border-l-2 border-primary pl-5 text-base">
                <li>submit to RBI FIRMS, IFSCA systems, SWIFT or bank core ledgers — these need authorised access agreements;</li>
                <li>produce real regulator approvals or release money — review lanes are simulated;</li>
                <li>run independently hosted services, message queues or measured scaling targets;</li>
                <li>hold a security certification, a patent grant or licensed real-time market data.</li>
              </ul>
              <p>The pilot roadmap names technologies we intend to evaluate for those stages — a permissioned ledger, zero-knowledge headroom proofs, an event stream and a separate model-serving API — and they are labelled as planned, not implemented.</p>
            </Section>

            <footer className="border-t-4 border-primary pt-6">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">Written by Team Quantum Leap</p>
              <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <li><strong>Raja Mukherjee</strong><br /><span className="text-muted-foreground">Team Lead · BWU/BBL/25/002</span></li>
                <li><strong>Priyanshu Dhar</strong><br /><span className="text-muted-foreground">Team Co-Lead · BWU/BBL/24/158</span></li>
                <li><strong>ADITI KULKARNI</strong><br /><span className="text-muted-foreground">Concept &amp; Corporate Law Support · BWU/BBL/25/081</span></li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/how-it-works" className="font-mono-ui border border-foreground px-5 py-3 text-[11px] uppercase tracking-[0.16em]">Explore the diagrams</Link>
                <Link to="/architecture" className="font-mono-ui border border-foreground px-5 py-3 text-[11px] uppercase tracking-[0.16em]">Feasibility dossier</Link>
                <Link to="/book-demo" className="font-mono-ui bg-primary px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-primary-foreground">Book a demo</Link>
              </div>
            </footer>
          </div>
        </div>
      </article>
    </Frame>
  );
}
