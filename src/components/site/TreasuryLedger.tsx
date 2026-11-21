import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CompanyPicker } from "./CompanyPicker";
import { useTreasuryFocus } from "@/lib/treasury-focus";
import { useTreasuryScenario } from "@/lib/treasury-scenario";
import { findHub } from "@/data/hub-catalog";
import { HubOptions } from "./HubOptions";
import { COUNTRY_META } from "@/data/currencies";
import { ledgerTax, LEDGER_INCOME_LABELS, TREATY_SOURCE, type LedgerIncome } from "@/lib/ledger-tax";
import { useFxCaptures, useFxStream, recordCapture, formatInr } from "@/lib/fx-stream";
import {
  allCases,
  bookCase,
  downloadLedger,
  priceCase,
  removeCase,
  subscribeBooked,
  type LedgerCase,
  type PricedCase,
} from "@/lib/ledger";

function money(v: number, dp = 0): string {
  return v.toLocaleString("en-IN", { maximumFractionDigits: dp, minimumFractionDigits: dp });
}

/** The treasury ledger: every case, the print that priced it, and what it costs. */
export function TreasuryLedger() {
  const tape = useFxStream();
  const captures = useFxCaptures();
  const [bookedTick, setBookedTick] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    return subscribeBooked(() => setBookedTick((n) => n + 1));
  }, []);

  const [entity, setEntity] = useTreasuryFocus();
  const [scenario, setScenario] = useTreasuryScenario();
  const { hub: hubCity, amountCr: crore } = scenario;
  const [q, setQ] = useState("");
  const [income, setIncome] = useState<LedgerIncome>("capital");
  const [taxableCr, setTaxableCr] = useState(0);
  const [treatyEligible, setTreatyEligible] = useState(false);
  const selectedCountry = findHub(hubCity)?.country ?? "—";
  const taxPreview = ledgerTax(selectedCountry, crore, { income, taxableCr, treatyEligible });

  const rows: PricedCase[] = useMemo(() => {
    void bookedTick;
    if (!hydrated) return [];
    return allCases(captures).map((c) => priceCase(c, tape.inrPer[c.code] ?? c.rateAt));
  }, [captures, tape, bookedTick, hydrated]);

  const shown = rows.filter((r) =>
    q
      ? `${r.entity} ${r.hub} ${r.code} ${r.desk} ${r.id}`.toLowerCase().includes(q.toLowerCase())
      : true,
  );

  const totalNotional = shown.reduce((a, r) => a + r.notionalInr, 0);
  const totalCharges = shown.reduce((a, r) => a + r.chargesInr, 0);
  const pricedRows = shown.filter((r) => r.allInBps !== null);
  const avgBps = pricedRows.length ? pricedRows.reduce((a, r) => a + (r.allInBps ?? 0), 0) / pricedRows.length : 0;

  function book() {
    const hub = findHub(hubCity);
    const code = hub ? (COUNTRY_META[hub.country]?.currency ?? "USD") : "USD";
    const stamp = recordCapture("Treasury ledger", "action", `Case booked — ${entity} → ${hubCity}`, code, crore);
    const c: LedgerCase = {
      id: `CV-${stamp.digest}`,
      at: stamp.at,
      iso: stamp.iso,
      desk: "Treasury ledger",
      entity,
      hub: hubCity,
      country: hub?.country ?? "—",
      code,
      crore,
      rateAt: stamp.rate,
      seq: stamp.seq,
      digest: stamp.digest,
      route: hub?.route ?? "ODI / OPI",
      source: "booked",
      tax: { income, taxableCr, treatyEligible },
    };
    bookCase(c);
  }

  return (
    <div className="border border-rule/20">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule/15 px-6 py-4">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
          Book a case onto the ledger — it is priced off the print live at this instant
        </p>
        <p className="font-mono-ui tnum text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Print #{tape.seq} · {tape.status === "live" ? "Live interbank" : "Indicative"} · anchor {tape.anchor || "—"}
        </p>
      </div>

      <div className="grid gap-px bg-rule/15 md:grid-cols-4">
        <label className="bg-background p-5">
          <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Indian party
          </span>
          <CompanyPicker value={entity} onChange={setEntity} />
        </label>
        <label className="bg-background p-5">
          <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Destination hub
          </span>
          <select
            value={hubCity}
            onChange={(e) => { setScenario({ hub: e.target.value }); setTreatyEligible(false); }}
            className="mt-2 w-full border-b border-rule/25 bg-transparent pb-1 text-sm outline-none focus:border-primary"
          >
            <HubOptions withCurrency />
          </select>
        </label>
        <label className="bg-background p-5">
          <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Notional (₹ crore)
          </span>
          <input
            type="number"
            min={1}
            value={crore}
            onChange={(e) => setScenario({ amountCr: Math.max(1, Number(e.target.value)) })}
            className="font-display tnum mt-2 w-full border-b border-rule/25 bg-transparent pb-1 text-2xl outline-none focus:border-primary"
          />
        </label>
        <div className="flex items-end bg-background p-5">
          <Button
            type="button"
            onClick={book}
            className="font-mono-ui w-full bg-primary px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-primary-foreground"
          >
            Book demo case
          </Button>
        </div>
      </div>

      <div className="grid gap-4 border-t border-rule/15 px-6 py-4 md:grid-cols-3">
        <label className="text-xs">Payment tax category<select aria-label="Payment tax category" value={income} onChange={(e) => { setIncome(e.target.value as LedgerIncome); setTreatyEligible(false); }} className="mt-2 w-full border border-border bg-background p-2 text-sm">{Object.entries(LEDGER_INCOME_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        {income !== "capital" && <><label className="text-xs">Chargeable component (₹ crore)<input aria-label="Chargeable component (₹ crore)" type="number" min={0} max={crore} value={taxableCr} onChange={(e) => setTaxableCr(Math.min(crore, Math.max(0, Number(e.target.value))))} className="mt-2 w-full border border-border bg-background p-2 text-sm" /></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={treatyEligible} onChange={(e) => setTreatyEligible(e.target.checked)} />Treaty entitlement confirmed for this demo payment</label></>}
        <div className="text-xs text-muted-foreground md:col-span-3"><p>{selectedCountry} · {taxPreview.referencePct === null ? "No applicable catalogued income rate" : `${taxPreview.referencePct}% conditional treaty ceiling`} · {taxPreview.basis}</p><a href={taxPreview.source} target="_blank" rel="noreferrer" className="text-primary underline">Published treaty text</a><p className="mt-1">Verified source coverage: UK, US and Singapore general interest / IP royalty / equipment royalty categories. Other countries require tax review; this is not a certified current-law consolidation. For incoming offshore investment returns, source-country tax needs a separate assessment.</p></div>
      </div>

      <div className="grid gap-px border-t border-rule/15 bg-rule/15 sm:grid-cols-4">
        {[
          ["Cases on ledger", String(shown.length)],
          ["Notional under management", `₹${money(totalNotional / 1e7)} cr`],
          ["Modelled charges · excludes unpriced tax", `₹${money(totalCharges)}`],
          ["Average · fully priced cases", `${avgBps.toFixed(1)} bps · ${pricedRows.length}/${shown.length}`],
        ].map(([k, v]) => (
          <div key={k} className="bg-background p-5">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
            <p className="font-display tnum mt-2 text-2xl text-primary">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule/15 px-6 py-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by entity, hub, currency or desk"
          className="w-full max-w-sm border-b border-rule/25 bg-transparent pb-1 text-sm outline-none focus:border-primary"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={!shown.length}
            onClick={() => downloadLedger(shown, "csv")}
            className="font-mono-ui bg-primary px-5 py-2.5 text-[10px] uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-40"
          >
            Export CSV
          </Button>
          <Button variant="outline"
            type="button"
            disabled={!shown.length}
            onClick={() => downloadLedger(shown, "json")}
            className="font-mono-ui border border-rule/30 px-5 py-2.5 text-[10px] uppercase tracking-[0.16em] disabled:opacity-40"
          >
            JSON
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-rule/15">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead>
            <tr className="font-mono-ui border-b border-rule/20 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              {[
                "Case", "Booked", "Corridor", "Notional ₹cr", "Rate at capture", "Live rate",
                "Drift", "AD margin", "Fixed + GST", "Treaty WHT", "All-in", "Credited abroad", "",
              ].map((h) => (
                <th key={h} className="px-3 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-rule/10 align-top">
                <td className="px-3 py-3">
                  <p className="font-mono-ui text-[11px] text-primary">{r.id}</p>
                  <p className="text-xs text-muted-foreground">{r.entity}</p>
                  <p className="font-mono-ui text-[10px] text-muted-foreground">{r.desk}</p>
                </td>
                <td className="font-mono-ui tnum px-3 py-3 text-[11px] text-muted-foreground">
                  {new Date(r.at).toLocaleString("en-IN", { hour12: false })}
                  <br />
                  print #{r.seq}
                </td>
                <td className="px-3 py-3">
                  <p>{r.hub}</p>
                  <p className="font-mono-ui text-[10px] text-muted-foreground">
                    INR → {r.code} · {r.route}
                  </p>
                </td>
                <td className="tnum px-3 py-3">{money(r.crore, 2)}</td>
                <td className="tnum px-3 py-3">{formatInr(r.rateAt)}</td>
                <td className="tnum px-3 py-3">{formatInr(r.rateNow)}</td>
                <td
                  className={`tnum px-3 py-3 ${Math.abs(r.driftBps) > 5 ? "text-primary" : "text-muted-foreground"}`}
                >
                  {r.driftBps >= 0 ? "+" : ""}
                  {r.driftBps.toFixed(1)} bps
                </td>
                <td className="tnum px-3 py-3">
                  ₹{money(r.marginInr)}
                  <br />
                  <span className="font-mono-ui text-[10px] text-muted-foreground">{r.marginBps} bps</span>
                </td>
                <td className="tnum px-3 py-3">
                  ₹{money(r.fixedInr)}
                  <br />
                  <span className="font-mono-ui text-[10px] text-muted-foreground">+ ₹{money(r.gstInr)} GST</span>
                </td>
                <td className="tnum px-3 py-3">
                  {r.taxAssessment.priced ? `₹${money(r.whtInr)}` : "Tax review required"}
                  <br />
                  <span className="font-mono-ui text-[10px] text-muted-foreground">{r.whtPct === null ? "Unpriced" : `${r.whtPct}%`} · {LEDGER_INCOME_LABELS[r.taxAssessment.income]}</span>
                  <p className="mt-1 max-w-52 text-xs text-muted-foreground">{r.taxAssessment.basis}</p>
                </td>
                <td className="tnum px-3 py-3 text-primary">{r.allInBps === null ? "Pending tax review" : `${r.allInBps.toFixed(1)} bps`}</td>
                <td className="tnum px-3 py-3">
                  {r.taxAssessment.priced ? `${r.code} ${money(r.netFcy, 2)}` : "Pending tax review"}
                </td>
                <td className="px-3 py-3">
                  {r.source === "booked" && (
                    <Button variant="ghost" size="sm"
                      type="button"
                      onClick={() => removeCase(r.id)}
                      className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
                    >
                      Remove
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-sm text-muted-foreground">
                  No cases yet. Book one above, or work any desk on the rail — every action that
                  carries a notional writes itself onto this ledger.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="border-t border-rule/15 px-6 py-4 text-xs leading-relaxed text-muted-foreground">
        Charges model: AD Category-1 margin of 5–22 bps by corridor depth, correspondent ₹1,850 and
        cable ₹1,100 per instruction and a simplified 18% GST assumption on modelled bank charges, not a bank quote or actual FX GST determination. Investment principal carries no generic withholding. Income tax applies only to the separately identified chargeable component; catalogued treaty ceilings require residence, beneficial ownership, applicable documentation and treaty/PPT/LOB review. Uncatalogued countries or unconfirmed entitlement remain unpriced, not tax-free. Rates are reference scenarios, not certified current-law tax advice. Saved older investment cases are recalculated without the legacy principal tax; their FX stamps are unchanged.
      </p>
    </div>
  );
}
