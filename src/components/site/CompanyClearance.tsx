import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CompanyPicker } from "@/components/site/CompanyPicker";
import { LISTED_1000, findListed, networthNote } from "@/data/listed";
import { AD_BANKS } from "@/data/banks";
import { Button } from "@/components/ui/button";
import { useTreasuryFocus } from "@/lib/treasury-focus";
import { useTreasuryScenario } from "@/lib/treasury-scenario";
import { findPurpose } from "@/data/purposes";

type Phase = { who: string; lane: "Treasury" | "AD Bank" | "Regulators" | "GIFT IFSC" | "Ledger"; t: string; docs: string[]; sec: number };

function buildPhases(route: "Automatic" | "Approval", bank: string): Phase[] {
  const slow = route === "Approval" ? 6 : 1;
  return [
    { who: "Corporate treasury", lane: "Treasury", t: "Board resolution and filing pack assembled", docs: ["Board resolution", "Audited balance sheet (FY26)", "Valuation report", "Form FC draft"], sec: 40 },
    { who: bank, lane: "AD Bank", t: "AD Category-I bank verifies KYC, Rule 7 headroom and Form FC", docs: ["KYC / UIN", "Net-worth certificate", "Form 15CA/15CB pair"], sec: 60 },
    { who: "RBI", lane: "Regulators", t: "FEMA OI Rules 2022 route check" + (route === "Approval" ? " and approval" : ""), docs: ["Form FC", "Route basis"], sec: 25 * slow },
    { who: "IFSCA", lane: "Regulators", t: "GIFT IFSC unit and banking-unit compliance", docs: ["IBU confirmation"], sec: 20 * slow },
    { who: "FIU-IND", lane: "Regulators", t: "AML / beneficial-owner screening", docs: ["BO declaration"], sec: 18 * slow },
    { who: "CBDT", lane: "Regulators", t: "Section 195 and DTAA tax read", docs: ["TRC / Form 10F"], sec: 15 * slow },
    { who: "MoF", lane: "Regulators", t: "Sensitive-sector / strategic review", docs: ["Sector declaration"], sec: 12 * slow },
    { who: "DPIIT", lane: "Regulators", t: "Investment-policy and Press Note check", docs: ["Ownership chain"], sec: 10 * slow },
    { who: "GIFT IFSC desk", lane: "GIFT IFSC", t: "Remittance released through the bank's GIFT City IBU", docs: ["SWIFT MT103", "UTR"], sec: 30 },
    { who: "Append-only ledger", lane: "Ledger", t: "Hash-chained record readable by all six regulators", docs: ["Block hash"], sec: 5 },
  ];
}

const LANES: Phase["lane"][] = ["Treasury", "AD Bank", "Regulators", "GIFT IFSC", "Ledger"];

export function CompanyClearance() {
  const [name, setName] = useTreasuryFocus();
  const [scenario] = useTreasuryScenario();
  const [bankIx, setBankIx] = useState(0);
  const [tick, setTick] = useState(-1);
  const c = findListed(name) ?? LISTED_1000[0];
  const bank = AD_BANKS[bankIx] ?? AD_BANKS[0];
  const ticket = scenario.amountCr;
  const route: "Automatic" | "Approval" = c && c.used + ticket <= c.ceiling ? "Automatic" : "Approval";
  const phases = useMemo(() => buildPhases(route, bank?.name ?? "AD bank"), [route, bank?.name]);
  // Regulators read in parallel: they share one start offset after the AD bank.
  const start = useMemo(() => {
    const out: number[] = [];
    let t = 0;
    const regStart = 100;
    const regEnd = regStart + Math.max(...phases.filter((p) => p.lane === "Regulators").map((p) => p.sec));
    phases.forEach((p) => {
      if (p.lane === "Regulators") out.push(regStart);
      else if (p.lane === "GIFT IFSC") out.push(regEnd);
      else if (p.lane === "Ledger") out.push(regEnd + 30);
      else { out.push(t); t += p.sec; }
    });
    return out;
  }, [phases]);
  const total = (start.at(-1) ?? 0) + (phases.at(-1)?.sec ?? 0);

  useEffect(() => setTick(-1), [name, bankIx, scenario.hub, scenario.purpose, scenario.amountCr]);
  useEffect(() => {
    if (tick < 0 || tick > total) return;
    const id = setTimeout(() => setTick((v) => v + Math.max(2, Math.round(total / 60))), 100);
    return () => clearTimeout(id);
  }, [tick, total]);
  const running = tick >= 0 && tick <= total;
  const done = tick > total;
  const fmt = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);
  if (!c || !bank) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4 border border-border p-5">
        <div className="font-mono text-xs text-primary">1,000-ENTRY DEMONSTRATION UNIVERSE</div>
        <CompanyPicker value={name} onChange={setName} />
        <div className="grid grid-cols-2 gap-px bg-border text-sm">
          {[
            ["Rank", `#${c.rank} · ${c.exchange}`],
            ["Sector", c.sector],
            ["Net worth", `₹${c.netWorth.toLocaleString("en-IN")} cr`],
            ["Rule 7 ceiling", `₹${c.ceiling.toLocaleString("en-IN")} cr`],
            ["Proposed investment", `₹${ticket.toLocaleString("en-IN")} cr`],
            ["Ceiling-only demo route", route],
            ["Destination", scenario.hub],
            ["Purpose", scenario.purpose],
          ].map(([k, v]) => (
            <div key={k} className="bg-background p-2">
              <div className="font-mono text-[10px] text-muted-foreground">{k?.toUpperCase()}</div>
              <div className={k === "Route" ? "font-medium text-primary" : "font-medium"}>{v}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{findPurpose(scenario.purpose)?.plain}</p>
        <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Net-worth source</summary><p className="mt-1">{networthNote(c)}</p></details>
        <label className="block text-sm">AD Category-I bank
          <select value={bankIx} onChange={(e) => setBankIx(+e.target.value)} className="mt-1 w-full border border-border bg-background p-2">
            {AD_BANKS.map((b, i) => <option key={b.name} value={i}>{b.name}{b.giftBranch ? " · GIFT IBU" : ""}</option>)}
          </select>
        </label>
        <Button onClick={() => setTick(0)} disabled={running} className="w-full rounded-none py-3 font-medium">
          {running ? `Simulating… ${fmt(tick)}` : "Simulate GIFT case timeline"}
        </Button>
      </div>

      <div className="border border-border p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-display break-words text-2xl">{c.name} → GIFT IFSC → {scenario.hub}</div>
          <div className="font-mono text-xs text-muted-foreground">Simulated end-to-end {fmt(total)} · {route} route</div>
        </div>
        <div className="mt-4 space-y-1">
          {phases.map((p, i) => {
            const s0 = start[i] ?? 0;
            const prog = tick < 0 ? 0 : Math.min(1, Math.max(0, (tick - s0) / p.sec));
            return (
              <div key={p.who} className="grid grid-cols-[120px_1fr] items-center gap-3 sm:grid-cols-[150px_1fr_220px]">
                <div className="text-sm"><span className="font-mono text-[10px] text-muted-foreground">{p.lane}</span><br />{p.who.length > 22 ? p.who.slice(0, 20) + "…" : p.who}</div>
                <div className="relative h-6 bg-secondary">
                  <div className="absolute inset-y-0 border border-primary/40" style={{ left: `${(s0 / total) * 100}%`, width: `${(p.sec / total) * 100}%` }}>
                    <div className="h-full bg-primary transition-all duration-100" style={{ width: `${prog * 100}%` }} />
                  </div>
                </div>
                <div className="hidden text-xs text-muted-foreground sm:block">{prog >= 1 ? "✓ " : ""}{p.t}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-px bg-border sm:grid-cols-5">
          {LANES.map((lane) => {
            const items = phases.filter((p) => p.lane === lane);
            const cleared = items.every((p) => tick >= (start[phases.indexOf(p)] ?? 0) + p.sec);
            return (
              <div key={lane} className={`p-3 ${cleared && tick >= 0 ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                <div className="font-mono text-[10px] opacity-80">{lane.toUpperCase()}</div>
                <ul className="mt-1 space-y-0.5 text-xs">
                  {Array.from(new Set(items.flatMap((p) => p.docs))).map((d) => <li key={d}>· {d}</li>)}
                </ul>
              </div>
            );
          })}
        </div>

        {done && (
          <div className="mt-6 bg-primary p-4 text-primary-foreground">
            <div className="font-display text-2xl">Demo timeline complete · {fmt(total)}</div>
            <div className="text-sm opacity-90">
              {bank.name} filed once; six regulators read the same packet in parallel instead of in sequence. Released via {bank.giftBranch ? "its GIFT IFSC banking unit" : "a partner GIFT IFSC banking unit"}.
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-4 font-mono text-xs">
          <Link to="/worklist" className="text-primary underline">Open in Ready list</Link>
          <Link to="/casefile" className="text-primary underline">Open full Case file</Link>
          <Link to="/gift-portal" className="text-primary underline">Open secure demo GIFT portal</Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Simulation only: timings, regulator roles and bank licence references are illustrative, not actual RBI, IFSCA or bank actions. Ceiling-only route modelling does not establish ODI/OPI eligibility. MoF, DPIIT and CBDT are not a universal ODI approval quorum.</p>
      </div>
    </div>
  );
}
