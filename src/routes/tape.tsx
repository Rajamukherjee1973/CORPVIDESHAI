import { createFileRoute, redirect } from "@tanstack/react-router";

/** Folded into the prediction surface — the tape is now evidence behind a forecast. */
export const Route = createFileRoute("/tape")({
  head: () => ({ meta: [{ title: "FX Tape Redirect | CorpVidesh AI" }, { name: "description", content: "The FX tape now opens within the connected Prediction desk." }, { property: "og:title", content: "FX Tape | CorpVidesh AI" }, { property: "og:description", content: "Indicative currency observations and market comparisons in one desk." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/intelligence", search: { view: "tape" } });
  },
});
