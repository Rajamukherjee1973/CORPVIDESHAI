import { createFileRoute, redirect } from "@tanstack/react-router";

/** Merged into the Treasury Console — kept as a permanent redirect for shared links. */
export const Route = createFileRoute("/corporate-dashboard")({
  head: () => ({ meta: [{ title: "Corporate Filings Redirect | CorpVidesh AI" }, { name: "description", content: "Corporate filings and Form FC are now part of the Treasury Console." }, { property: "og:title", content: "Corporate Filings | CorpVidesh AI" }, { property: "og:description", content: "Continue to company-scoped filings in the Treasury Console." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/console", search: { view: "filings" }, statusCode: 301 });
  },
});
