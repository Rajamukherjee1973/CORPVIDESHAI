import { ForecastLede } from "@/components/site/ForecastLede";
import { useMemo, useState } from "react";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { createFileRoute } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { TreasuryCommandBar } from "@/components/site/TreasuryCommandBar";
import { setTreasuryFocus } from "@/lib/treasury-focus";
import { EngineRail } from "@/components/site/EngineRail";
import { COMPANIES, SECTORS, type Company } from "@/data/companies";

const TITLE = "Treasury Live — 500 NSE & BSE Companies | CorpVidesh AI";
const DESC =
  "Live Rule 7 board for the top 500 Indian listed companies: net worth, the 400% financial commitment ceiling, utilised headroom and whether an outbound investment falls on the automatic or approval route.";

export const Route = createFileRoute("/treasury")({
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
  component: TreasuryLive,
});

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

type SortKey = "rank" | "netWorth" | "ceiling" | "total" | "utilisation";

function TreasuryLive() {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("All");
  const [route, setRoute] = useState<"All" | "Automatic" | "Approval">("All");
  const [sort, setSort] = useState<SortKey>("rank");
  const [limit, setLimit] = useState(60);
  const [open, setOpen] = useState<Company | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = COMPANIES.filter(
      (c) =>
        (sector === "All" || c.sector === sector) &&
        (route === "All" || c.route === route) &&
        (!needle || c.name.toLowerCase().includes(needle) || c.sector.toLowerCase().includes(needle)),
    );
    out.sort((a, b) => (sort === "rank" ? a.rank - b.rank : b[sort] - a[sort]));
    return out;
  }, [q, sector, route, sort]);

  const agg = useMemo(() => {
    const auto = COMPANIES.filter((c) => c.route === "Automatic").length;
    const ceiling = COMPANIES.reduce((s, c) => s + c.ceiling, 0);
    const total = COMPANIES.reduce((s, c) => s + c.total, 0);
    return { auto, approval: COMPANIES.length - auto, ceiling, total, headroom: ceiling - total };
  }, []);

  return (
    <Frame>
      <TreasuryCommandBar />
      <section className="mx-auto max-w-[1400px] px-6 pb-8 pt-8">
        <Rule label="Treasury live — NSE & BSE top 500" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h1 className="font-display max-w-3xl text-4xl lg:text-5xl">
            Five hundred balance sheets, one Rule 7 test.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            In plain words: the law lets an Indian company commit up to four times its net worth
            abroad. Under that line the money moves on the automatic route. Over it, or in a
            restricted activity, the file goes to the Reserve Bank for approval first.
          </p>
        </div>

        <div className="mt-6 grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Companies on the rail", COMPANIES.length.toLocaleString("en-IN")],
            ["Aggregate 400% ceiling", `${inr(agg.ceiling)} Cr`],
            ["Committed after proposals", `${inr(agg.total)} Cr`],
            ["Automatic route", `${agg.auto} entities`],
            ["Approval route", `${agg.approval} entities`],
          ].map(([k, v]) => (
            <div key={k} className="bg-background px-5 py-5">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {k}
              </p>
              <p className="tnum font-display mt-1.5 text-3xl">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="Treasury universe" focus={["headroom", "clearance"]} />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-20">
        <div className="flex flex-wrap items-center gap-2 border border-rule/20 p-3">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(60);
            }}
            placeholder="Search company or sector"
            className="font-mono-ui min-w-[220px] flex-1 border border-rule/25 bg-background px-3 py-2 text-[12px] outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="font-mono-ui border border-rule/25 bg-background px-3 py-2 text-[11px] uppercase tracking-[0.12em]"
          >
            <option value="All">All sectors</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {(["All", "Automatic", "Approval"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoute(r)}
              className={`font-mono-ui border px-3 py-2 text-[11px] uppercase tracking-[0.12em] transition-colors ${
                route === r ? "border-primary bg-primary text-primary-foreground" : "border-rule/25"
              }`}
            >
              {r === "All" ? "Both routes" : `${r} route`}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="font-mono-ui border border-rule/25 bg-background px-3 py-2 text-[11px] uppercase tracking-[0.12em]"
          >
            <option value="rank">Sort — rank</option>
            <option value="netWorth">Sort — net worth</option>
            <option value="ceiling">Sort — 400% ceiling</option>
            <option value="total">Sort — commitment</option>
            <option value="utilisation">Sort — utilisation</option>
          </select>
          <span className="font-mono-ui px-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {rows.length} matches
          </span>
        </div>

        <div className="mt-6 overflow-x-auto border border-rule/20">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                {[
                  "#",
                  "Company",
                  "Sector",
                  "Listed",
                  "Net worth (₹ Cr)",
                  "400% ceiling (₹ Cr)",
                  "Utilised (₹ Cr)",
                  "Proposed (₹ Cr)",
                  "Headroom (₹ Cr)",
                  "Utilisation",
                  "Route",
                ].map((h) => (
                  <th
                    key={h}
                    className="font-mono-ui whitespace-nowrap px-3 py-2.5 text-left text-[10px] uppercase tracking-[0.14em]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((c) => (
                <tr
                  key={c.name}
                  onClick={() => {
                    setOpen(c);
                    setTreasuryFocus(c.name);
                  }}
                  className="cursor-pointer border-t border-rule/12 transition-colors hover:bg-secondary"
                >
                  <td className="tnum px-3 py-2.5 text-muted-foreground">{c.rank}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">{c.name}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{c.sector}</td>
                  <td className="font-mono-ui whitespace-nowrap px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {c.exchange}
                  </td>
                  <td className="tnum px-3 py-2.5">{inr(c.netWorth)}</td>
                  <td className="tnum px-3 py-2.5">{inr(c.ceiling)}</td>
                  <td className="tnum px-3 py-2.5">{inr(c.used)}</td>
                  <td className="tnum px-3 py-2.5">{inr(c.proposed)}</td>
                  <td className="tnum px-3 py-2.5">{inr(c.headroom)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 border border-rule/25">
                        <div
                          className={c.utilisation > 100 ? "h-full bg-primary" : "h-full bg-foreground/70"}
                          style={{ width: `${Math.min(100, c.utilisation)}%` }}
                        />
                      </div>
                      <span className="tnum font-mono-ui text-[11px]">
                        {c.utilisation.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`font-mono-ui inline-block border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${
                        c.route === "Automatic"
                          ? "border-rule/30 text-foreground"
                          : "border-primary bg-primary text-primary-foreground"
                      }`}
                    >
                      {c.route}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {limit < rows.length && (
          <button
            onClick={() => setLimit((l) => l + 100)}
            className="font-mono-ui mt-5 border border-rule/30 px-5 py-3 text-[11px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary"
          >
            Load next 100 — {rows.length - limit} remaining
          </button>
        )}

        {open && (
          <div className="mt-8 border border-primary p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">
                  Rule 7 determination — {open.exchange}
                </p>
                <h2 className="font-display mt-2 text-4xl">{open.name}</h2>
                <p className="text-sm text-muted-foreground">{open.sector}</p>
              </div>
              <button
                onClick={() => setOpen(null)}
                className="font-mono-ui border border-rule/30 px-3 py-2 text-[10px] uppercase tracking-[0.14em]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Net worth (audited)", `${inr(open.netWorth)} Cr`],
                ["× 400% = Rule 7 ceiling", `${inr(open.ceiling)} Cr`],
                ["Utilised + proposed", `${inr(open.total)} Cr`],
                ["Remaining headroom", `${inr(open.headroom)} Cr`],
              ].map(([k, v]) => (
                <div key={k} className="bg-background px-5 py-4">
                  <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {k}
                  </p>
                  <p className="tnum font-display mt-1.5 text-3xl">{v}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span
                className={`font-mono-ui border px-4 py-2 text-[11px] uppercase tracking-[0.16em] ${
                  open.route === "Automatic"
                    ? "border-rule/30"
                    : "border-primary bg-primary text-primary-foreground"
                }`}
              >
                {open.route} route
              </span>
              <p className="max-w-xl text-sm leading-relaxed">{open.reason}</p>
            </div>

            <p className="mt-5 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
              In plain words: {inr(open.netWorth)} crore of net worth allows {inr(open.ceiling)} crore
              of overseas commitment. This entity has {inr(open.total)} crore on the table, which is{" "}
              {open.utilisation.toFixed(1)}% of what the law permits —{" "}
              {open.route === "Automatic"
                ? "so the AD bank can clear it without going to the Reserve Bank."
                : "so the file must go to the Reserve Bank before any money moves."}
            </p>
          </div>
        )}

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Prototype dataset. Net worth and commitment figures are illustrative and modelled on the
          listed universe of the NSE and BSE; in production each row is drawn from the entity's
          audited balance sheet and its filed ODI/OPI history. Route determination applies Rule 7 of
          the FEM (Overseas Investment) Rules, 2022 together with the restricted-activity tests.
        </p>
      </section>
      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Continue on the rail" />
        <div className="mb-10">
          <DeskProcess3D desk="treasury" />
        </div>
        <EngineRail desk="treasury" />
      </section>
    </Frame>
  );
}