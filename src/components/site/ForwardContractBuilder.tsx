import { useEffect, useMemo, useState } from "react";
import { Download, FileSignature, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PolicyRate } from "@/lib/forward-pricing";
import { FBIL_URL, premiaPctFor, type FbilCurve } from "@/lib/fbil-forward";
import {
  addDays, contractRef, maturityPnl, payoffCurve, quoteForward, validateTerms, valueContract,
  type ForwardContract, type ForwardSide,
} from "@/lib/forward-contract";
import { useForwardBook } from "@/lib/forward-book";
import { HedgeAccountBar, HedgeHistory } from "@/components/site/HedgeBookAccount";

const TENORS = [[30, "1M"], [91, "3M"], [182, "6M"], [365, "1Y"]] as const;
const px = (v: number) => (v < 10 ? v.toFixed(4) : v.toFixed(2));
export const inr = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? "−" : v > 0 ? "+" : "";
  return a >= 1e7 ? `${s}₹${(a / 1e7).toFixed(2)} cr` : `${s}₹${(a / 1e5).toFixed(2)} lakh`;
};
const tone = (v: number) => (v > 0 ? "text-foreground font-semibold" : v < 0 ? "text-destructive" : "");
const field = "mt-1 block w-full border border-input bg-background px-2 py-1.5 font-mono-ui text-sm text-foreground";

function Payoff({ points, rate, fwd, at }: { points: { spot: number; pnl: number }[]; rate: number; fwd: number; at: number }) {
  const W = 560, H = 210, P = { l: 74, r: 12, t: 12, b: 28 };
  const lo = points[0]!.spot, hi = points.at(-1)!.spot;
  const m = Math.max(...points.map((p) => Math.abs(p.pnl)), 1);
  const X = (s: number) => P.l + ((s - lo) / (hi - lo)) * (W - P.l - P.r);
  const Y = (v: number) => P.t + ((m - v) / (2 * m)) * (H - P.t - P.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(p.spot).toFixed(1)},${Y(p.pnl).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Profit or loss at maturity across rupee rates">
      <rect x={P.l} y={P.t} width={W - P.l - P.r} height={(H - P.t - P.b) / 2} className="fill-foreground/5" />
      <rect x={P.l} y={Y(0)} width={W - P.l - P.r} height={(H - P.t - P.b) / 2} className="fill-destructive/10" />
      <line x1={P.l} x2={W - P.r} y1={Y(0)} y2={Y(0)} className="stroke-muted-foreground" strokeDasharray="2 3" />
      <text x={P.l - 6} y={Y(m) + 4} textAnchor="end" fontSize="10" className="fill-foreground font-mono-ui">{inr(m)}</text>
      <text x={P.l - 6} y={Y(-m)} textAnchor="end" fontSize="10" className="fill-destructive font-mono-ui">{inr(-m)}</text>
      <text x={P.l} y={H - 8} fontSize="10" className="fill-muted-foreground font-mono-ui">₹{px(lo)}</text>
      <text x={W - P.r} y={H - 8} textAnchor="end" fontSize="10" className="fill-muted-foreground font-mono-ui">₹{px(hi)}</text>
      <line x1={X(rate)} x2={X(rate)} y1={P.t} y2={H - P.b} className="stroke-primary" strokeWidth={1.2} />
      <text x={X(rate) + 4} y={P.t + 10} fontSize="10" className="fill-primary font-mono-ui">contract ₹{px(rate)}</text>
      {fwd >= lo && fwd <= hi && <line x1={X(fwd)} x2={X(fwd)} y1={P.t} y2={H - P.b} className="stroke-muted-foreground" strokeDasharray="4 3" />}
      <path d={d} fill="none" strokeWidth={2.2} className="stroke-foreground" />
      {at >= lo && at <= hi && <circle cx={X(at)} cy={Y(points.length ? maturityPnlAt(points, at) : 0)} r={5} className="fill-primary stroke-background" strokeWidth={2} />}
    </svg>
  );
}
function maturityPnlAt(points: { spot: number; pnl: number }[], s: number) {
  const a = points[0]!, b = points.at(-1)!;
  return a.pnl + ((s - a.spot) / (b.spot - a.spot)) * (b.pnl - a.pnl);
}

export function ForwardContractBuilder({ spots, rates, currencies, defaultMarginBp, ratesPending, usdCurve, fbilError }: {
  spots: Record<string, number>; rates: Record<string, PolicyRate>; currencies: string[]; defaultMarginBp: number; ratesPending: boolean;
  usdCurve: FbilCurve | null; fbilError: string | null;
}) {
  const fb = useForwardBook();
  const [today, setToday] = useState("");
  const [code, setCode] = useState("USD");
  const [side, setSide] = useState<ForwardSide>("buy");
  const [amountM, setAmountM] = useState(10);
  const [tradeDate, setTradeDate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [marginBp, setMarginBp] = useState(defaultMarginBp);
  const [override, setOverride] = useState("");
  const [movePct, setMovePct] = useState(3);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const t = new Date().toISOString().slice(0, 10);
    setToday(t); setTradeDate(t); setMaturityDate(addDays(t, 91));
  }, []);
  useEffect(() => { setMarginBp(defaultMarginBp); }, [defaultMarginBp]);

  const spot = spots[code];
  const rInr = rates["INR"]?.ratePct, rCcy = rates[code]?.ratePct;
  const terms = { side, notional: amountM * 1e6, tradeDate, maturityDate, marginBp };
  const invalid = tradeDate ? validateTerms(terms) : "Loading dates…";
  const benchmark = code === "USD" ? usdCurve : null;
  const quote = spot ? quoteForward(terms, spot, rInr, rCcy, benchmark) : null;
  const fbilPct = benchmark && quote?.basis === "fbil" ? premiaPctFor(benchmark, quote.days) : null;
  const overrideRate = Number(override);
  const rate = overrideRate > 0 ? overrideRate : quote?.rate;
  const centre = quote?.fair ?? spot ?? 0;
  const atMaturity = centre * (1 + (side === "buy" ? movePct : -movePct) / 100);
  const draft = rate ? { side, notional: terms.notional, rate } : null;
  const curve = useMemo(() => (draft && centre ? payoffCurve(draft, centre, 0.1, 40) : []), [draft?.rate, draft?.side, draft?.notional, centre]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = (c: ForwardContract) => {
    const s = spots[c.code];
    const ri = rates["INR"]?.ratePct, rc = rates[c.code]?.ratePct;
    if (!s || !today) return null;
    return valueContract(c, today, s, ri, rc, c.code === "USD" ? usdCurve : null);
  };
  const rows = fb.contracts.map((c) => ({ c, v: value(c) }));
  const totalMtm = rows.reduce((s, r) => s + (r.v?.pnlInr ?? 0), 0);
  const totalScenario = rows.reduce((s, r) => s + (r.v ? maturityPnl(r.c, r.v.currentForward * (1 + (r.c.side === "buy" ? movePct : -movePct) / 100)) : 0), 0);

  async function book() {
    setNotice("");
    if (invalid) { setNotice(invalid); return; }
    if (!spot || !rate) { setNotice(`No live ${code} price yet${quote || rates[code] ? "" : " and no benchmark or official rate — type the rate your bank confirmed"}.`); return; }
    const c: ForwardContract = {
      ref: contractRef(Number(tradeDate.slice(0, 4)), code, fb.nextSeq), code, side, notional: terms.notional, tradeDate, maturityDate, marginBp,
      rate, fairAtTrade: quote?.fair ?? spot, spotAtTrade: spot, rateOverridden: overrideRate > 0, bookedAt: new Date().toISOString(),
    };
    try {
      const ref = await fb.book(c);
      setNotice(fb.mode === "account"
        ? `Booked ${ref} at ₹${px(rate)} and saved to your account — indicative only, no bank trade was placed.`
        : `Booked ${ref} at ₹${px(rate)} — practice ticket only, no bank trade was placed.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "The contract could not be saved. Please retry.");
    }
  }

  function exportCsv() {
    const head = ["ref", "currency", "side", "notional", "trade_date", "maturity_date", "contract_rate", "margin_bp", "rate_typed_by_user", "current_forward", "forward_basis", "days_left", "mtm_inr"];
    const lines = rows.map(({ c, v }) => [c.ref, c.code, c.side, c.notional, c.tradeDate, c.maturityDate, c.rate.toFixed(4), c.marginBp, c.rateOverridden, v?.currentForward.toFixed(4) ?? "", v ? (v.proxy ? "spot_proxy" : v.basis) : "", v?.remainingDays ?? "", v?.pnlInr.toFixed(0) ?? ""].join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }));
    a.download = "corpvidesh-forward-contracts.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const pnlAt = draft ? maturityPnl(draft, atMaturity) : 0;
  const pastTrade = today && tradeDate && tradeDate < today;

  return (
    <div className="border border-rule/30">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule/30 bg-muted/30 px-5 py-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Hedge contract builder</div>
          <h3 className="mt-1 font-display text-2xl">Book a forward, then watch its profit or loss</h3>
        </div>
        <p className="max-w-md text-xs text-muted-foreground">US dollar tickets use FBIL's official rupee forward premia on live spot; other currencies use official policy rates. Your bank's margin goes on top. Nothing is sent to a bank.</p>
      </div>

      <div className="grid gap-px bg-rule/20 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-4 bg-background p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-muted-foreground">Currency
              <select aria-label="Forward currency" value={code} onChange={(e) => { setCode(e.target.value); setOverride(""); }} className={field}>
                {currencies.map((c) => <option key={c} value={c}>{c}{rates[c] ? "" : " · no official rate"}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">Amount ({code} million)
              <input aria-label="Forward amount in millions" type="number" min={0.01} step={0.5} value={amountM} onChange={(e) => setAmountM(Math.max(0, Number(e.target.value) || 0))} className={field} />
            </label>
            <label className="text-xs text-muted-foreground">Bank margin (bp a year)
              <input aria-label="Forward bank margin" type="number" min={0} max={1000} step={5} value={marginBp} onChange={(e) => setMarginBp(Math.max(0, Number(e.target.value) || 0))} className={field} />
            </label>
          </div>
          <div role="radiogroup" aria-label="Direction" className="grid grid-cols-2 gap-px border border-rule/30 bg-rule/30">
            {([["buy", `Buy ${code} forward`, "You will pay abroad (e.g. an ODI remittance)"], ["sell", `Sell ${code} forward`, "You will receive or hold foreign money"]] as const).map(([k, l, n]) => (
              <button key={k} type="button" role="radio" aria-checked={side === k} onClick={() => setSide(k)} className={`p-3 text-left ${side === k ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/40"}`}>
                <span className="block text-sm font-medium">{l}</span>
                <span className={`block text-[11px] ${side === k ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{n}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-xs text-muted-foreground">Trade date
              <input aria-label="Trade date" type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} className={field} />
            </label>
            <label className="text-xs text-muted-foreground">Maturity (settlement) date
              <input aria-label="Maturity date" type="date" min={tradeDate} value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} className={field} />
            </label>
            <div className="flex items-end gap-1">
              {TENORS.map(([d, l]) => (
                <button key={l} type="button" onClick={() => tradeDate && setMaturityDate(addDays(tradeDate, d))} className="border border-rule/40 px-2 py-1.5 font-mono-ui text-[11px] text-muted-foreground hover:text-primary">{l}</button>
              ))}
            </div>
          </div>
          <label className="block text-xs text-muted-foreground">Rate your bank confirmed (optional, ₹ per {code})
            <input aria-label="Bank confirmed rate" type="number" step={0.0001} min={0} placeholder={quote ? `Suggested ₹${px(quote.rate)}` : "Type the dealt rate"} value={override} onChange={(e) => setOverride(e.target.value)} className={field} />
          </label>
          {pastTrade && <p className="text-xs text-muted-foreground">For a deal done before today, type the rate in your bank's confirmation — the suggested rate uses today's spot.</p>}

          <dl className="grid grid-cols-2 gap-px border border-rule/30 bg-rule/30 sm:grid-cols-3">
            {[
              ["Live spot", spot ? `₹${px(spot)}` : "—"],
              [quote?.basis === "fbil" ? "Fair forward · FBIL" : "Fair forward · rate parity", quote ? `₹${px(quote.fair)}` : ratesPending ? "…" : "no official rate"],
              ["Your contract rate", rate ? `₹${px(rate)}` : "—"],
              ["Margin", quote ? `${(quote.marginPerUnit * 100).toFixed(1)} paise / ${code}` : "—"],
              ["Days", quote ? String(quote.days) : "—"],
              ["Rupee value", rate ? `₹${((terms.notional * rate) / 1e7).toFixed(2)} cr` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-3">
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{k}</dt>
                <dd className="mt-1 font-mono-ui text-base">{v}</dd>
              </div>
            ))}
          </dl>
          <p data-testid="forward-basis" className="border-l-2 border-primary pl-3 text-[11px] leading-relaxed text-muted-foreground">
            {code !== "USD"
              ? `FBIL publishes a forward benchmark for US dollars only, so ${code} is priced by rate parity from official policy rates.`
              : quote?.basis === "fbil" && benchmark
                ? <>Priced from <a href={FBIL_URL} target="_blank" rel="noreferrer" className="underline hover:text-primary">FBIL's USD/INR forward premia</a> of {benchmark.asOf}{fbilPct != null ? ` (${fbilPct.toFixed(2)}% a year for ${quote.days} days)` : ""}, which FBIL builds from banks' interbank forward quotes, applied to live spot. The public release is delayed; your bank's dealt rate will differ by its margin and the day's market.</>
                : usdCurve
                  ? "FBIL's benchmark stops at 12 months, so this longer tenor uses rate parity from official policy rates."
                  : `${fbilError ?? "FBIL forward premia are loading."} Until they load, US dollars use rate parity from official policy rates.`}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void book()} disabled={fb.saving}><FileSignature className="mr-1 h-4 w-4" />Book forward</Button>
            {(notice || invalid) && <p role="status" className={`text-xs ${notice.startsWith("Booked") ? "text-primary" : "text-muted-foreground"}`}>{notice || invalid}</p>}
          </div>
        </div>

        <div className="bg-background p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Profit or loss at maturity vs not hedging</div>
          <p className="mt-1 text-sm">If the rupee is at <span className="font-mono-ui">₹{centre ? px(atMaturity) : "—"}</span> per {code} on {maturityDate || "maturity"} (rupee {atMaturity >= centre ? "weaker" : "stronger"} by {Math.abs(movePct)}% vs today's fair forward):</p>
          <p className={`mt-2 font-display text-4xl ${tone(pnlAt)}`} aria-live="polite">{draft ? inr(pnlAt) : "—"}</p>
          <input aria-label="Rupee move by maturity in percent" type="range" min={-10} max={10} step={0.5} value={movePct} onChange={(e) => setMovePct(Number(e.target.value))} className="mt-3 w-full accent-primary" />
          <div className="flex justify-between font-mono-ui text-[10px] text-muted-foreground"><span>Moves against the hedge 10%</span><span>Moves in its favour 10%</span></div>
          <div className="mt-3">{curve.length > 1 && draft ? <Payoff points={curve} rate={draft.rate} fwd={centre} at={atMaturity} /> : <p className="py-16 text-center text-sm text-muted-foreground">{ratesPending ? "Loading prices…" : "Enter a rate to see the payoff."}</p>}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Solid line: gain (upper band) or loss (red band) versus leaving it unhedged; red dot: your chosen rate. Red vertical line: your contract rate (break-even). Dashed: today's fair forward.</p>
        </div>
      </div>

      <div className="border-t border-rule/30">
        <HedgeAccountBar mode={fb.mode} email={fb.email} />
        {fb.loadError && <p role="alert" className="border-t border-rule/20 px-5 py-3 text-xs text-destructive">{fb.loadError}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule/20 px-5 py-3">
          <div className="text-sm"><span className="text-muted-foreground">Booked contracts · </span>{fb.contracts.length}
            {fb.contracts.length > 0 && <> · <span className="text-muted-foreground">value today</span> <span className={`font-mono-ui ${tone(totalMtm)}`}>{inr(totalMtm)}</span> · <span className="text-muted-foreground">at maturity if the move is {movePct}% {movePct >= 0 ? "in" : "against"} each hedge's favour</span> <span className={`font-mono-ui ${tone(totalScenario)}`}>{inr(totalScenario)}</span></>}
          </div>
          {fb.contracts.length > 0 && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-3.5 w-3.5" />CSV</Button>{fb.clear && <Button size="sm" variant="ghost" onClick={fb.clear}>Clear all</Button>}</div>}
        </div>
        {fb.contracts.length === 0 ? (
          <p className="border-t border-rule/20 px-5 py-6 text-sm text-muted-foreground">{fb.ready ? "No contracts yet. Book one above to see it valued against the live rate." : "Loading your contracts…"}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr><th className="p-3">Contract</th><th className="p-3">Side</th><th className="p-3 text-right">Amount</th><th className="p-3">Trade → maturity</th><th className="p-3 text-right">Contract ₹</th><th className="p-3 text-right">Today ₹ fwd</th><th className="p-3 text-right">Profit / loss today</th><th className="p-3" aria-label="Remove" /></tr>
              </thead>
              <tbody>
                {rows.map(({ c, v }) => (
                  <tr key={c.id ?? c.ref} className="border-t border-rule/20">
                    <td className="p-3 font-mono-ui text-xs">{c.ref}{c.rateOverridden && <span className="block text-[10px] text-muted-foreground">bank rate typed</span>}</td>
                    <td className="p-3 text-xs">{c.side === "buy" ? "Buy" : "Sell"} {c.code}</td>
                    <td className="p-3 text-right font-mono-ui">{(c.notional / 1e6).toLocaleString("en-IN", { maximumFractionDigits: 2 })}m</td>
                    <td className="p-3 font-mono-ui text-xs">{c.tradeDate} → {c.maturityDate}<span className="block text-[10px] text-muted-foreground">{v ? (v.matured ? "matured · settles at spot" : `${v.remainingDays} days left`) : ""}</span></td>
                    <td className="p-3 text-right font-mono-ui">₹{px(c.rate)}<span className="block text-[10px] text-muted-foreground">{c.marginBp} bp margin</span></td>
                    <td className="p-3 text-right font-mono-ui">{v ? `₹${px(v.currentForward)}` : "—"}{v?.proxy ? <span className="block text-[10px] text-muted-foreground">spot proxy</span> : v?.basis === "fbil" ? <span className="block text-[10px] text-muted-foreground">FBIL premia</span> : v?.basis === "parity" ? <span className="block text-[10px] text-muted-foreground">rate parity</span> : null}</td>
                    <td className={`p-3 text-right font-mono-ui ${tone(v?.pnlInr ?? 0)}`}>{v ? inr(v.pnlInr) : "—"}</td>
                    <td className="p-3"><button type="button" aria-label={`Remove ${c.ref}`} onClick={() => { if (fb.mode === "local" || window.confirm(`Remove ${c.ref} and its saved profit/loss history?`)) fb.remove(c); }}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {fb.mode === "account" && <HedgeHistory marks={fb.marks} note={fb.markNote} />}
        <p className="border-t border-rule/20 px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">Profit or loss today revalues each contract against the fair forward for its remaining days (FBIL USD/INR premia for US dollars up to 12 months, otherwise rate parity) and discounts it at India's policy rate; on or after maturity it settles at spot. {fb.mode === "account" ? "Saved contracts are visible only to your account." : "Contracts stay in this browser tab only."} A real forward is dealt with an authorised dealer bank against an underlying exposure under its own documentation and quote.</p>
      </div>
    </div>
  );
}
