import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { PocArchitecture } from "@/components/site/PocArchitecture";
import { PlatformOps } from "@/components/site/PlatformOps";
import { AgentIntegration } from "@/components/site/AgentIntegration";
import { LegalArchitecture } from "@/components/site/LegalArchitecture";
import { FeasibilityDossier } from "@/components/site/FeasibilityDossier";
import { ArchitecturePresentations } from "@/components/site/ArchitecturePresentations";
import { recordCapture, setFxPageContext } from "@/lib/fx-stream";

const TITLE = "Legal & Service Architecture — ODI/OPI Decision Controls | CorpVidesh AI";
const DESC =
  "CorpVidesh AI architecture with feasibility evidence, user-flow maps, resource allocation, independent CI gates and sourced FEMA ODI/OPI review with secure filings.";

export const Route = createFileRoute("/architecture")({
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
  component: ArchitectureDesk,
});

function ArchitectureDesk() {
  useEffect(() => {
    setFxPageContext({ desk: "Architecture desk", code: "USD" });
    recordCapture("Architecture desk", "open", "Architecture desk opened", "USD");
  }, []);

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-14">
        <Rule label="Architecture" />
        <h1 className="font-display max-w-4xl text-5xl tracking-normal sm:text-6xl lg:text-7xl">
          CorpVidesh AI<br /><span className="text-primary">Legal architecture.</span>
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Modular decision services connect Indian law, market evidence and secure filings.
          Every interpretation identifies its statutory basis, evidence gap and next accountable action.
        </p>
      </section>


      <ArchitecturePresentations />

      <FeasibilityDossier />
      <LegalArchitecture />

      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <AgentIntegration />
        <PocArchitecture />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Evaluation and managed deployment" />
        <PlatformOps />
      </section>

      <EngineRail desk="treasury" />
    </Frame>
  );
}
