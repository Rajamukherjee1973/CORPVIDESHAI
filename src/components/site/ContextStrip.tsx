import { useEffect, useState } from "react";
import { ChevronDown, Route as RouteIcon, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JourneyControls, JourneyPanel, JOURNEY, useJourney } from "@/components/site/WorkflowNavigator";
import { ScenarioPanel, ScenarioSummary, scenarioBarVisible } from "@/components/site/TreasuryScenarioBar";

type Open = "journey" | "scenario" | null;

/** One slim row: where you are in the six-step tour, and the shared treasury scenario. */
export function ContextStrip() {
  const { path, current, step } = useJourney();
  const [open, setOpen] = useState<Open>(null);
  useEffect(() => { setOpen(null); }, [path]);
  const showScenario = scenarioBarVisible(path);
  const toggle = (v: Exclude<Open, null>) => setOpen((o) => (o === v ? null : v));
  const chev = (v: Open) => <ChevronDown className={`size-3.5 transition-transform ${open === v ? "rotate-180" : ""}`} />;
  return (
    <div className="border-b border-border bg-secondary/25">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="flex h-10 items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 min-w-0 shrink-0 gap-1.5 rounded-none px-1.5 text-xs" onClick={() => toggle("journey")} aria-expanded={open === "journey"} aria-controls="connected-journey">
            <RouteIcon className="size-3.5 text-primary" />
            <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em]">{current >= 0 ? `Step ${current + 1}/${JOURNEY.length}` : "Tour"}</span>
            <span className="hidden md:inline">{step?.label ?? "Six connected desks"}</span>
            {chev("journey")}
          </Button>
          <JourneyControls />
          {showScenario && (
            <Button variant="ghost" size="sm" className="ml-auto h-8 min-w-0 gap-1.5 rounded-none border-l border-border pl-3 pr-1.5 text-xs" onClick={() => toggle("scenario")} aria-expanded={open === "scenario"} aria-controls="treasury-scenario-controls">
              <SlidersHorizontal className="size-3.5 shrink-0 text-primary" />
              <span className="hidden font-mono-ui text-[10px] uppercase tracking-[0.14em] sm:inline">Scenario</span>
              <span className="min-w-0 truncate font-mono-ui text-[11px] text-muted-foreground"><ScenarioSummary /></span>
              {chev("scenario")}
            </Button>
          )}
        </div>
        {open === "journey" && <JourneyPanel />}
        {open === "scenario" && showScenario && <ScenarioPanel />}
      </div>
    </div>
  );
}
