import { createFileRoute, redirect } from "@tanstack/react-router";

/** Folded into the prediction surface — the hub board is now evidence behind a forecast. */
export const Route = createFileRoute("/markets")({
  head: () => ({ meta: [{ title: "Hub Markets Redirect | CorpVidesh AI" }, { name: "description", content: "The hub exchange board now opens within the connected Prediction desk." }, { property: "og:title", content: "Hub Markets | CorpVidesh AI" }, { property: "og:description", content: "Compare financial hubs and indicative market observations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/intelligence", search: { view: "markets" } });
  },
});
