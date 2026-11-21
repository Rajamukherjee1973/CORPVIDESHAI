import { Link, useRouterState } from "@tanstack/react-router";
import { CompanyPicker } from "@/components/site/CompanyPicker";
import { findListed } from "@/data/listed";
import { useTreasuryFocus } from "@/lib/treasury-focus";
import { useFxStream } from "@/lib/fx-stream";
import { useTreasuryScenario } from "@/lib/treasury-scenario";

const TABS = [
  { to: "/console", label: "Console & filings", note: "Headroom, Form FC, FEMA" },
  { to: "/treasury", label: "Live universe", note: "Rule 7 board" },
  { to: "/portfolio", label: "OPI book", note: "Allocation & P&L" },
  { to: "/routes", label: "Route intake", note: "Automatic / approval" },
] as const;

const cr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")} Cr`;

/** Shared command strip: one focused company and live FX read across every treasury desk. */
export function TreasuryCommandBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [focus, setFocus] = useTreasuryFocus();
  const c = findListed(focus);
  const [scenario] = useTreasuryScenario();
  const t = useFxStream();
  const usd = t.inrPer["USD"] ?? 0;
  const utilisation = c && c.ceiling > 0 ? (c.used + scenario.amountCr) / c.ceiling * 100 : 0;
  const headroom = c ? c.ceiling - c.used - scenario.amountCr : 0;
  const util = Math.max(0, Math.min(100, utilisation));

  return (
    <section className="border-b border-rule/20 bg-background pt-6">
      <div className="mx-auto max-w-[1400px] px-6">
        <nav aria-label="Treasury desks" className="flex gap-px overflow-x-auto border-x border-rule/15 bg-rule/15">
          {TABS.map((tab) => {
            const on = path === tab.to;
            return (
              <Link key={tab.to} to={tab.to} className={`min-w-[150px] flex-1 px-4 py-2.5 ${on ? "bg-primary text-primary-foreground" : "bg-background hover:bg-secondary"}`}>
                <span className="block font-display text-base leading-tight">{tab.label}</span>
                <span className={`block font-mono-ui text-[9px] uppercase tracking-[0.14em] ${on ? "opacity-80" : "text-muted-foreground"}`}>{tab.note}</span>
              </Link>
            );
          })}
        </nav>
        <div className="grid items-center gap-4 py-3 md:grid-cols-[minmax(240px,320px)_1fr]">
          <CompanyPicker value={focus} onChange={setFocus} />
          {c ? (
            <div className="grid grid-cols-2 gap-px bg-rule/15 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Net worth", cr(c.netWorth)],
                ["400% ceiling", cr(c.ceiling)],
                [headroom < 0 ? "Over ceiling by" : "Headroom", cr(Math.abs(headroom))],
                ["Ceiling screen", headroom < 0 ? "Exceeded" : "Within ceiling"],
                ["Proposed ≈ USD", usd ? (() => { const m = (scenario.amountCr * 1e7) / usd / 1e6; return m >= 1000 ? `$${(m / 1000).toFixed(2)} bn` : `$${m.toFixed(1)} mn`; })() : "—"],
                ["USD/INR live", usd ? usd.toFixed(4) : "—"],
              ].map(([k, v]) => (
                <div key={k} className="bg-background px-3 py-2">
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{k}</p>
                  <p className={`tnum font-display text-lg leading-tight ${k === "Route" && v === "Approval" ? "text-primary" : ""}`}>{v}</p>
                </div>
              ))}
              <div className="col-span-full bg-background px-3 py-1.5">
                <div className="h-1 bg-rule/15"><div className="h-full bg-primary" style={{ width: `${util}%` }} /></div>
                <p className="mt-1 font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  {utilisation.toFixed(1)}% of Rule 7 ceiling after demo proposal · not a route approval · {c.balanceSheet ? "filed FY26 balance sheet" : "illustrative net worth"} · FX indicative
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Pick a company to focus every treasury desk on it.</p>
          )}
        </div>
      </div>
    </section>
  );
}
