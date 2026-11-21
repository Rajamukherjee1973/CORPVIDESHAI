import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { OpiBook } from "@/components/site/OpiBook";
import { ForecastLede } from "@/components/site/ForecastLede";

const TITLE = "Live OPI Portfolio Book — Allocation, Hedge & Translation P&L | CorpVidesh AI";
const DESC =
  "Accept Currency Radar recommendations into a live overseas portfolio investment book: rupee allocation, forward hedge cover, translation profit and loss re-priced on the 24x7 tape, with CSV and JSON export.";

export const Route = createFileRoute("/portfolio")({
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
  component: PortfolioPage,
});

function PortfolioPage() {
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-8 pt-14">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">
          Treasury · Overseas portfolio investment
        </p>
        <h1 className="font-display mt-3 max-w-4xl text-5xl leading-[1.05] md:text-6xl">
          The OPI book, marked to the live rupee tape.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Every recommendation the Currency Radar issues can be accepted here as a position. The
          tranche is struck at the tape rate captured at that second, carries a forward hedge ratio,
          and is re-priced on every tick — so allocation, hedge cover and rupee translation profit
          and loss read live rather than at month end.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-10">
        <ForecastLede desk="OPI portfolio book" focus={["fx-drift", "corridor-cost"]} />
      </section>

      <Rule label="Live book" />
      <section className="mx-auto max-w-[1400px] px-6 py-10">
        <OpiBook />
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          Looking for the signal that feeds this book? The{" "}
          <Link to="/" className="text-primary underline-offset-4 hover:underline">
            Currency Radar on the rail page
          </Link>{" "}
          scores all 52 rupee pairs and hands its accepted calls straight to this ledger.
        </p>
      </section>

      <Rule label="Rail" />
      <EngineRail desk="treasury" />
    </Frame>
  );
}
