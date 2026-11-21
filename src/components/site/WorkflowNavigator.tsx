import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const JOURNEY = [
  { to: "/access", label: "Applications", detail: "Corporate · fund · reviewer desks" },
  { to: "/intelligence", label: "Intelligence", detail: "Currencies · hubs · prediction" },
  { to: "/agents", label: "Agent desk", detail: "Graph · copilot · reader · outlook" },
  { to: "/evidence", label: "Working evidence", detail: "Safeguards · simulated case" },
  { to: "/architecture", label: "Architecture", detail: "Boundaries · feasibility · resources" },
  { to: "/decks", label: "Investor materials", detail: "Synopsis · architecture · pitch" },
] as const;

export function useJourney() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = JOURNEY.findIndex((s) => s.to === path);
  return { path, current, step: current >= 0 ? JOURNEY[current] : undefined, previous: JOURNEY[current - 1], next: current >= 0 ? JOURNEY[current + 1] : undefined };
}

/** Previous / next buttons along the six-step presentation journey. Public links only. */
export function JourneyControls() {
  const { current, previous, next } = useJourney();
  return (
    <div className="flex shrink-0 items-center">
      {previous && <Button variant="ghost" size="icon" className="size-8 rounded-none" asChild><Link to={previous.to} aria-label={`Previous: ${previous.label}`} title={previous.label}><ArrowLeft /></Link></Button>}
      {next && <Button variant="ghost" size="sm" className="h-8 rounded-none px-2 text-xs" asChild><Link to={next.to}><span className="hidden sm:inline">{next.label}</span><span className="sm:hidden">Next</span><ArrowRight /></Link></Button>}
      {current < 0 && <Button variant="ghost" size="sm" className="h-8 rounded-none px-2 text-xs" asChild><Link to="/access"><span className="hidden sm:inline">Start tour</span><ArrowRight /></Link></Button>}
    </div>
  );
}

export function JourneyPanel() {
  const { path } = useJourney();
  return (
    <nav id="connected-journey" aria-label="Connected presentation journey" className="grid grid-cols-2 gap-px border-t-2 border-primary bg-border pb-px sm:grid-cols-3 lg:grid-cols-6">
      {JOURNEY.map((step, i) => (
        <Link key={step.to} to={step.to} aria-current={path === step.to ? "step" : undefined} className={`min-w-0 px-3 py-2.5 ${path === step.to ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
          <span className="font-mono-ui text-[10px]">{String(i + 1).padStart(2, "0")}</span>
          <span className="block font-display text-base leading-tight">{step.label}</span>
          <span className="block text-[11px] opacity-75">{step.detail}</span>
        </Link>
      ))}
    </nav>
  );
}
