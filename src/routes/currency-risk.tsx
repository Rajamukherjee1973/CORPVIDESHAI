import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { CurrencyRiskDashboard } from "@/components/site/CurrencyRiskDashboard";

const TITLE = "Hub Currency Risk Dashboard — Live Rupee Rates & Swings | CorpVidesh AI";
const DESC = "Track every one of the 62 investment hubs: live rupee rate, one-year weekly history, 1W–1Y swings, 52-week range, deepest fall and volatility, with an exposure calculator and watchlist.";

export const Route = createFileRoute("/currency-risk")({
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
  component: CurrencyRiskPage,
});

function CurrencyRiskPage() {
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-8 pt-14">
        <Rule label="Intelligence · hub currency risk" />
        <h1 className="font-display max-w-4xl text-5xl lg:text-6xl">Every hub's rupee rate, and how far it has swung.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          The live rate for each of the 62 hubs beside a full year of weekly history. Star the corridors you hold money in,
          pick one to see what a bad month could cost, then send it to the hedge desk.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-[11px] uppercase tracking-[0.16em]">
          <Link to="/intelligence" search={{ view: "hedging" }} className="text-primary hover:underline">Hedge desk →</Link>
          <Link to="/hubs" className="text-muted-foreground hover:text-primary">52 hubs atlas →</Link>
          <Link to="/africa-hubs" className="text-muted-foreground hover:text-primary">African hubs →</Link>
        </div>
      </section>
      <section className="mx-auto max-w-[1400px] px-6 pb-20">
        <CurrencyRiskDashboard />
      </section>
    </Frame>
  );
}
