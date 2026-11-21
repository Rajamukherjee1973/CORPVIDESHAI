import { createFileRoute, redirect } from "@tanstack/react-router";

/** Folded into the prediction surface — the corridor ledger is now evidence behind a forecast. */
export const Route = createFileRoute("/ledger")({
  head: () => ({ meta: [{ title: "Corridor Ledger Redirect | CorpVidesh AI" }, { name: "description", content: "The demonstration corridor ledger now opens within the connected Prediction desk." }, { property: "og:title", content: "Corridor Ledger | CorpVidesh AI" }, { property: "og:description", content: "Shared treasury scenarios, captured FX and demonstration case exports." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/intelligence", search: { view: "ledger" } });
  },
});
