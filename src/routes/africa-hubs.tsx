import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { AfricaHubs } from "@/components/site/AfricaHubs";
import { HubPredictiveCompare } from "@/components/site/HubPredictiveCompare";

const TITLE = "10 African Financial Hubs — SADC & COMESA Corridors | CorpVidesh AI";
const DESC =
  "Ten African financial hubs across SADC and COMESA beside the 52 global hubs: live rupee rates, India treaty status and predictive comparison of cost, FX risk and route time.";

export const Route = createFileRoute("/africa-hubs")({
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
  component: AfricaHubsPage,
});

function AfricaHubsPage() {
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-8 pt-14">
        <Rule label="Intelligence · African hubs · SADC & COMESA" />
        <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-primary">52 global hubs + 10 African hubs</p>
        <h1 className="font-display mt-5 max-w-5xl text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
          Two trade blocs. Ten new corridors.
          <span className="text-primary"> One rail from GIFT City.</span>
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Southern and Eastern Africa are where Indian corporates are building mines, energy projects, pharma plants and
          regional holding companies. These ten hubs in SADC and COMESA sit beside the 52 global hubs, each with its live
          rupee rate, India treaty position and the reason treasuries go there. Pick one and send it straight into the
          treasury scenario.
        </p>
        <p className="mt-4 text-sm">
          <Link to="/hubs" className="text-primary underline-offset-4 hover:underline">See the 52 global hubs atlas →</Link>
        </p>
      </section>
      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <AfricaHubs />
      </section>
      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Predictive comparison — African 10 against the global 52" />
        <h2 className="font-display mb-3 max-w-4xl text-4xl lg:text-5xl">
          Same model, same ticket. See where each African corridor ranks.
        </h2>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Switch between the African 10, either trade bloc or all 62 hubs. Cost, FX tail risk and route time are
          forecast exactly as they are for the global hubs, so the comparison is like for like.
        </p>
        <HubPredictiveCompare defaultUniverse="africa" />
      </section>
    </Frame>
  );
}
