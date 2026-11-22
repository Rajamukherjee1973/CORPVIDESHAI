import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://corpvideshai.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/routes", changefreq: "monthly", priority: "0.95" },
  { path: "/mechanism", changefreq: "monthly", priority: "0.9" },
  { path: "/section195", changefreq: "monthly", priority: "0.9" },
  { path: "/casefile", changefreq: "monthly", priority: "0.85" },
  { path: "/investors", changefreq: "monthly", priority: "0.9" },
  { path: "/gift", changefreq: "weekly", priority: "0.8" },
  { path: "/why", changefreq: "monthly", priority: "0.9" },
  { path: "/predictive-cases", changefreq: "monthly", priority: "0.85" },
  { path: "/africa-hubs", changefreq: "monthly", priority: "0.8" },
  { path: "/currency-risk", changefreq: "daily", priority: "0.8" },
  { path: "/hubs", changefreq: "weekly", priority: "0.8" },
  { path: "/treasury", changefreq: "weekly", priority: "0.8" },
  { path: "/console", changefreq: "monthly", priority: "0.7" },
  { path: "/apply", changefreq: "monthly", priority: "0.7" },
  { path: "/portal", changefreq: "monthly", priority: "0.6" },
  { path: "/processing", changefreq: "monthly", priority: "0.6" },
  { path: "/regulator", changefreq: "monthly", priority: "0.6" },
  { path: "/supervisor", changefreq: "monthly", priority: "0.6" },
  { path: "/worklist", changefreq: "monthly", priority: "0.6" },
  { path: "/decks", changefreq: "monthly", priority: "0.6" },
  { path: "/source", changefreq: "weekly", priority: "0.6" },
  { path: "/access", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});