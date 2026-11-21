import { useEffect, useState } from "react";
import { useTreasuryFocus } from "@/lib/treasury-focus";
import { findListed } from "@/data/listed";
import { useTreasuryScenario } from "@/lib/treasury-scenario";

function useCountUp(target: number, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function HeadroomInstrument() {
  const [focus] = useTreasuryFocus();
  const company = findListed(focus);
  const [scenario] = useTreasuryScenario();
  const CEILING = company?.ceiling ?? 0;
  const USED = (company?.used ?? 0) + scenario.amountCr;
  const headroom = CEILING - USED;
  const used = useCountUp(USED);
  const pct = CEILING ? (USED / CEILING) * 100 : 0;
  const animPct = useCountUp(pct);
  if (!company) return <p className="border-y border-rule/20 py-6 text-sm">No treasury model loaded for {focus}. Select a company in the Console.</p>;

  return (
    <div className="border border-rule/20">
      <div className="flex items-center justify-between border-b border-rule/15 px-5 py-3">
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Live instrument — Rule 7 financial commitment headroom
        </span>
        <span className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">
          <span className="block h-1.5 w-1.5 animate-pulse bg-primary" /> {company.name}
        </span>
      </div>

      <div className="grid gap-px bg-rule/15 sm:grid-cols-3">
        {[
          ["Ceiling — 400% of net worth", `₹${CEILING.toLocaleString("en-IN")} Cr`],
          ["Modelled commitment + proposal", `₹${Math.round(used).toLocaleString("en-IN")} Cr`],
          [headroom < 0 ? "Over ceiling by" : "Remaining headroom", `₹${Math.abs(headroom).toLocaleString("en-IN")} Cr`],
        ].map(([k, v]) => (
          <div key={k} className="bg-background px-5 py-4">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {k}
            </p>
            <p className="tnum mt-1.5 font-display text-3xl">{v}</p>
          </div>
        ))}
      </div>

      <div className="px-5 pb-5 pt-4">
        <div className="relative h-8 w-full border border-rule/25">
          <div
            className="h-full bg-primary transition-[width] duration-100"
            style={{ width: `${Math.max(0, Math.min(100, animPct))}%` }}
          />
          <div className="absolute inset-y-0 left-[75%] w-px bg-rule/60" />
          <span className="absolute -bottom-5 left-[75%] -translate-x-1/2 font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            75% alert
          </span>
        </div>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <p className="max-w-md text-sm text-muted-foreground">
            In plain words: the law lets this company commit up to four times its net worth abroad.
            The bar shows how much of that is already spoken for — before a single rupee moves.
          </p>
          <div className="text-right">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Modelled utilisation
            </p>
            <p className="tnum font-display text-5xl leading-none text-primary">{pct.toFixed(1)}%</p>
          </div>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">{company.balanceSheet ? "Filed FY26 balance-sheet input; statutory net worth requires auditor certification." : "Illustrative net worth."} Existing commitment and proposed ticket are demonstration inputs, not actual corporate exposures or clearance predictions. This financial-commitment screen is not an OPI eligibility or automatic-route determination.</p>
      </div>
    </div>
  );
}