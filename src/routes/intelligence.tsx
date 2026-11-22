import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { PredictionSurface } from "@/components/site/PredictionSurface";
import { FxDashboard } from "@/components/site/FxDashboard";
import { MarketsBoard, MarketsTicker } from "@/components/site/MarketsBoard";
import { TreasuryLedger } from "@/components/site/TreasuryLedger";
import { Currency52Board } from "@/components/site/Currency52Board";
import { LiveMarketsDesk, HubComparative } from "@/components/site/LiveMarketsDesk";
import { HedgeDesk } from "@/components/site/HedgeDesk";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { recordCapture, setFxPageContext } from "@/lib/fx-stream";

const TITLE = "Prediction Surface — Forecast and Recommended Action | CorpVidesh AI";
const DESC =
  "One desk instead of four: forecasts for clearance, cost, currency drift, query risk and statutory headroom, with the live FX tape, the 52-hub exchange board and the corridor ledger folded in behind them.";

const VIEWS = ["forecast", "hedging", "tape", "markets", "ledger"] as const;
type View = (typeof VIEWS)[number];

const LABEL: Record<View, string> = {
  forecast: "Forecast",
  hedging: "Hedge desk",
  tape: "FX tape",
  markets: "Hub markets",
  ledger: "Corridor ledger",
};

export const Route = createFileRoute("/intelligence")({
  validateSearch: (search: Record<string, unknown>): { view?: View } => {
    const v = String(search['view'] ?? "forecast") as View;
    return { view: VIEWS.includes(v) ? v : "forecast" };
  },
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
  component: IntelligenceDesk,
});

function IntelligenceDesk() {
  const { view = "forecast" } = Route.useSearch();

  useEffect(() => {
    setFxPageContext({ desk: "Prediction surface", code: "SGD" });
    recordCapture("Prediction surface", "open", "Prediction surface opened", "SGD");
  }, []);

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-14">
        <Rule label="Prediction surface" />
        <h1 className="font-display max-w-4xl text-6xl lg:text-7xl">
          Tell me what happens next, and what to do about it.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          The tape desk, the hub exchange board and the corridor pricing ledger each reported a
          table of what had already happened. Folded into this one surface they answer the only
          question a treasury asks: how long will this take, what will it cost, what can move
          against me, and what should I do first. Every number carries a p50, a p90, the drivers
          behind it and the manual-desk comparator — and the three reporting desks now live behind
          the forecast, as evidence for it rather than as work of their own.
        </p>

        <nav className="mt-8 flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <Link
              key={v}
              to="/intelligence"
              search={{ view: v }}
              className={`px-4 py-2 text-[11px] uppercase tracking-[0.18em] ${
                v === view
                  ? "bg-primary text-primary-foreground"
                  : "border border-rule/40 text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {LABEL[v]}
            </Link>
          ))}
          <Link
            to="/currency-risk"
            className="px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-primary underline-offset-4 hover:underline"
          >
            Hub currency-risk dashboard →
          </Link>
          <Link
            to="/predictive-cases"
            className="px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-primary underline-offset-4 hover:underline"
          >
            Six large-corporate cases →
          </Link>
        </nav>
      </section>

      {view === "forecast" && (
        <>
          <section className="mx-auto max-w-[1400px] px-6 pb-16">
            <PredictionSurface />
          </section>
          <section className="mx-auto max-w-[1400px] px-6 pb-16">
            <Rule label="The tape these forecasts are priced on" />
            <FxDashboard />
          </section>
        </>
      )}

      {view === "hedging" && (
        <section className="mx-auto max-w-[1400px] px-6 pb-16">
          <Rule label="Hedge desk — combined currency risk of your outbound book" />
          <h2 className="font-display mb-3 max-w-3xl text-4xl">How much could the book lose, and how much does cover cost?</h2>
          <p className="mb-8 max-w-3xl text-muted-foreground">
            Set what you hold in each currency and how much you cover with forwards. The desk combines a year of real
            weekly rupee moves — including how currencies move together — into one bad-case figure, prices the cover,
            stress-tests a rupee shock and replays the worst real week on today's book.
          </p>
          <HedgeDesk />
        </section>
      )}

      {view === "tape" && (
        <>
          <section className="mx-auto max-w-[1400px] px-6 pb-16">
            <Rule label="Live — 52 major currencies against the Indian Rupee" />
            <Currency52Board />
          </section>
          <section className="mx-auto max-w-[1400px] px-6 pb-16">
            <Rule label="Live — Indian FX market & London interbank" />
            <h2 className="font-display mb-6 max-w-3xl text-4xl">Mumbai onshore, London interbank, precious metals — one live desk.</h2>
            <LiveMarketsDesk />
          </section>
          <section className="mx-auto max-w-[1400px] px-6 pb-16">
            <Rule label="Comparative — 52 hubs × India's arrangements" />
            <h2 className="font-display mb-6 max-w-3xl text-4xl">Which corridor India's treaties actually favour, priced live.</h2>
            <HubComparative />
          </section>
          <section className="mx-auto max-w-[1400px] px-6 pb-16">
            <Rule label="Evidence — live FX tape" />
            <h2 className="font-display mb-6 max-w-3xl text-4xl">
              The print the drift forecast is computed from.
            </h2>
            <FxDashboard />
          </section>
          <section className="mx-auto max-w-[1400px] px-6 pb-16">
            <Rule label="How the tape reaches a filing" />
            <DeskProcess3D desk="treasury" code="SGD" />
          </section>
        </>
      )}

      {view === "markets" && (
        <>
          <MarketsTicker />
          <section className="mx-auto max-w-[1400px] px-6 py-14">
            <Rule label="Evidence — 52 hub exchange board" />
            <h2 className="font-display mb-6 max-w-3xl text-4xl">
              What the destination looks like on the day money lands there.
            </h2>
            <MarketsBoard />
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Levels are indicative reference prints for demonstration, not an execution feed.
              Venues without a public benchmark feed show a stable indicative level and are
              labelled as such.
            </p>
          </section>
          <section className="mx-auto max-w-[1400px] px-6 pb-16">
            <Rule label="Live — Indian FX market & London interbank" />
            <h2 className="font-display mb-6 max-w-3xl text-4xl">Mumbai onshore, London interbank, precious metals — one live desk.</h2>
            <LiveMarketsDesk />
          </section>
          <section className="mx-auto max-w-[1400px] px-6 pb-16">
            <Rule label="Comparative — 52 hubs × India's arrangements" />
            <h2 className="font-display mb-6 max-w-3xl text-4xl">Which corridor India's treaties actually favour, priced live.</h2>
            <HubComparative />
          </section>
        </>
      )}

      {view === "ledger" && (
        <>
          <section className="mx-auto max-w-[1400px] px-6 pb-16">
            <Rule label="Evidence — corridor ledger" />
            <h2 className="font-display mb-6 max-w-3xl text-4xl">
              Which rate priced which case, and what actually landed abroad.
            </h2>
            <TreasuryLedger />
          </section>
          <section className="mx-auto max-w-[1400px] px-6 pb-16">
            <Rule label="How a case becomes a priced ledger line" />
            <DeskProcess3D desk="treasury" code="USD" />
          </section>
        </>
      )}

      <EngineRail desk="treasury" />
    </Frame>
  );
}
