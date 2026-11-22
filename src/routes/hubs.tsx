import { ForecastLede } from "@/components/site/ForecastLede";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { HubMap } from "@/components/site/HubMap";
import { HubTicker } from "@/components/site/HubTicker";
import { HubExplorer } from "@/components/site/HubExplorer";
import { Currency52Board } from "@/components/site/Currency52Board";
import { LiveMarketsDesk, HubComparative } from "@/components/site/LiveMarketsDesk";
import { HUBS } from "@/data/hubs";
import { HubPredictiveCompare } from "@/components/site/HubPredictiveCompare";

const TITLE = "52 Finance Hubs — Outbound Routing Map | CorpVidesh AI";
const DESC =
  "Route, treaty position and clearance time for 52 global and 10 African finance hubs, with interactive predictive comparison of cost, FX risk and route time from GIFT City.";

export const Route = createFileRoute("/hubs")({
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
  component: Hubs,
});

function Hubs() {
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-12 pt-14">
        <Rule label="Corridor atlas" />
        <h1 className="font-display max-w-4xl text-6xl lg:text-7xl">
          Fifty-two hubs. One rail. Every route pre-reasoned.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Each corridor carries its own statutory shape — which route applies, whether a treaty
          reduces withholding, and how long the paper trail takes today. The rail knows all of it
          before a treasury opens a file.
        </p>
        <div className="mt-12">
          <HubMap />
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <Link to="/africa-hubs" className="group flex flex-wrap items-center justify-between gap-4 border-y-2 border-primary py-5">
          <span>
            <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">+10 African hubs · SADC &amp; COMESA</span>
            <span className="font-display mt-1 block text-2xl sm:text-3xl">Gaborone, Windhoek, Lusaka, Kigali, Addis Ababa and five more — beside the 52.</span>
          </span>
          <span className="font-mono-ui text-xs uppercase tracking-[0.14em] text-primary group-hover:underline">Open African corridors →</span>
        </Link>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Predictive comparison — 52 global + 10 African hubs" />
        <h2 className="font-display mb-3 max-w-4xl text-4xl lg:text-5xl">
          Sixty-two corridors. One forecast model. Ranked for your ticket.
        </h2>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Set the ticket, route and evidence once. Every hub — global and African — runs through the same
          prediction model, so cost, FX tail risk and route time compare like for like. Pin up to three hubs
          to read them side by side.
        </p>
        <HubPredictiveCompare />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="Hub atlas" focus={["drift", "cost"]} measuredRisk />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Hub desk — click a hub, read its currency live" />
        <h2 className="font-display mb-3 max-w-4xl text-4xl lg:text-5xl">
          Pick a corridor. Watch its currency stream, five years back.
        </h2>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Every hub settles in its own currency. Select one and the desk prices it on the live
          streaming rupee tape, plots the past five years of movement, and walks the corridor as the
          rail executes it.
        </p>
        <HubExplorer />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Live — 52 major currencies against the Indian Rupee" />
        <Currency52Board />
      </section>
      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Live — Indian FX market & London interbank" />
        <LiveMarketsDesk />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Comparative — 62 hubs × India's intergovernmental arrangements" />
        <HubComparative />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Live hub ticker" />
        <HubTicker />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="All corridors" />
        <div className="overflow-x-auto border border-rule/20">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                {["#", "Hub", "Jurisdiction", "Route", "Treaty", "s.195 view", "Today", "On rail"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left font-mono-ui text-[10px] uppercase tracking-[0.14em] font-medium"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {HUBS.map((h, i) => (
                <tr key={h.city} className="border-t border-rule/12 even:bg-secondary/60">
                  <td className="tnum px-3 py-2 font-mono-ui text-[11px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-3 py-2 font-medium">{h.city}</td>
                  <td className="px-3 py-2 text-muted-foreground">{h.country}</td>
                  <td className="px-3 py-2">{h.route}</td>
                  <td className="px-3 py-2 text-muted-foreground">{h.treaty}</td>
                  <td className="tnum px-3 py-2">{h.wht}</td>
                  <td className="tnum px-3 py-2 text-muted-foreground">{h.days} days</td>
                  <td className="tnum px-3 py-2 font-medium text-primary">9 min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Prototype dataset — indicative positions for demonstration, not tax or legal advice.
        </p>
      </section>
    </Frame>
  );
}