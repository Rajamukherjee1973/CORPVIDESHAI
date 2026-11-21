import { Link, useRouterState } from "@tanstack/react-router";

export const ABOUT_PAGES = [
  { to: "/why", n: "01", label: "Why CorpVidesh AI", note: "Problem, answer, who it serves" },
  { to: "/how-it-works", n: "02", label: "Architecture & diagrams", note: "System, flow, agents, trust" },
  { to: "/compare", n: "03", label: "Swiss grade vs competitors", note: "Stage-by-stage scope" },
  { to: "/book-demo", n: "04", label: "Book a demo", note: "Guided walkthrough" },
  { to: "/blog", n: "05", label: "Architecture blog", note: "How it is built" },
  { to: "/contact", n: "06", label: "Contact", note: "Email · phone · address" },
] as const;

/** Numbered strip linking the four About pages; the current page carries the red rule. */
export function AboutNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="About CorpVidesh AI" className="border-b border-rule/15 bg-muted/30">
      <ol className="mx-auto grid max-w-[1400px] grid-cols-2 px-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-6">
        {ABOUT_PAGES.map((p) => {
          const here = path === p.to || (p.to === "/blog" && path.startsWith("/blog"));
          return (
            <li key={p.to}>
              <Link
                to={p.to}
                aria-current={here ? "page" : undefined}
                className={`block border-t-2 px-3 py-3 transition-colors hover:bg-background ${here ? "border-primary bg-background" : "border-transparent"}`}
              >
                <span className="font-mono-ui text-[10px] text-primary">{p.n}</span>
                <span className={`font-mono-ui ml-2 text-[11px] uppercase tracking-[0.12em] ${here ? "text-primary" : "text-foreground"}`}>{p.label}</span>
                <span className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{p.note}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
