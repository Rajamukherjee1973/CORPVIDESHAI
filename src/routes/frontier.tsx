import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { HUBS } from "@/data/hubs";
import { LISTED_1000 } from "@/data/listed";
import { recordCapture, setFxPageContext, useFxStream } from "@/lib/fx-stream";
import { runStress, scoreFlow, scoreRbiFlow, usdMnToCrore, type Flow, type RbiFlow, type Shock } from "@/lib/frontier";
import RBI_ODI from "@/data/rbi-odi-aug2026.json";
import { supabase } from "@/integrations/supabase/client";
import { TreasuryCopilot, DocumentReader } from "@/components/site/FrontierAgents";

const TITLE = "Frontier Desk — AI Copilot, Stress Tests, Document Reader, Early Warning | CorpVidesh AI";
const DESC =
  "Four first-of-their-kind tools for Indian treasuries and regulators: an AI treasury copilot, what-if stress tests on live FX, an AI document reader that drafts filings, and a cross-entity early-warning radar.";

export const Route = createFileRoute("/frontier")({
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
  component: FrontierDesk,
});

const CARD = "border border-rule/20 bg-background p-6";
const LABEL = "font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground";
const INPUT = "w-full border border-rule/25 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";

function FrontierDesk() {
  useEffect(() => {
    setFxPageContext({ desk: "Frontier desk", code: "USD" });
    recordCapture("Frontier desk", "open", "Frontier desk opened", "USD");
  }, []);
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-8 pt-14">
        <Rule label="Frontier desk · first in India" />
        <h1 className="font-display max-w-5xl text-5xl leading-[1.05] lg:text-7xl">
          Four tools no Indian treasury or regulator has had before.
        </h1>
        <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
          Treasury asks, tests and files. Regulators see risk forming across companies — before money leaves India.
        </p>
        <div className="mt-8 grid gap-px border border-rule/20 bg-rule/20 md:grid-cols-4">
          {[
            ["01", "AI treasury copilot", "Treasury"],
            ["02", "What-if stress tests", "Treasury"],
            ["03", "AI document reader", "Treasury + AD bank"],
            ["04", "Early-warning radar", "Regulators"],
          ].map(([n, t, w]) => (
            <a key={n} href={`#f${n}`} className="bg-background p-5 transition-colors hover:bg-muted/60">
              <p className="font-mono-ui text-[10px] tracking-[0.18em] text-primary">{n}</p>
              <p className="font-display mt-2 text-xl">{t}</p>
              <p className={`${LABEL} mt-1`}>{w}</p>
            </a>
          ))}
        </div>
      </section>
      <div className="mx-auto max-w-[1400px] space-y-16 px-6">
        <Copilot />
        <Stress />
        <DocReader />
        <EarlyWarning />
      </div>
    </Frame>
  );
}

/* ------------------------------- 01 Copilot ------------------------------ */

function Copilot() {
  return (
    <section id="f01">
      <Rule label="01 — AI treasury copilot" />
      <TreasuryCopilot />
    </section>
  );
}

/* ------------------------------- 02 Stress ------------------------------- */

const PRESETS: Record<string, Shock> = {
  "Rupee slide 8%": { inrMovePct: 8, rateShockBps: 50, equityDrawdownPct: 5, sanctions: false, hedgeRatio: 0.3 },
  "2008-style crash": { inrMovePct: 18, rateShockBps: 200, equityDrawdownPct: 35, sanctions: false, hedgeRatio: 0.3 },
  "Taper tantrum 2013": { inrMovePct: 12, rateShockBps: 150, equityDrawdownPct: 12, sanctions: false, hedgeRatio: 0.3 },
  "Sanctions hit": { inrMovePct: 3, rateShockBps: 0, equityDrawdownPct: 10, sanctions: true, hedgeRatio: 0.3 },
};

function Stress() {
  const tape = useFxStream();
  const [idx, setIdx] = useState(0);
  const [route, setRoute] = useState<"ODI" | "OPI">("ODI");
  const [crore, setCrore] = useState(1500);
  const [shock, setShock] = useState<Shock>(PRESETS["Rupee slide 8%"]!);
  const co = LISTED_1000[idx]!;
  const r = useMemo(
    () => runStress({ croreInr: crore, netWorthCrore: co.netWorth, usedCrore: route === "ODI" ? co.used : co.used * 0.1, route, shock }),
    [crore, co, route, shock],
  );
  const usd = tape.inrPer["USD"] ?? 0;
  const set = (k: keyof Shock, v: number | boolean) => setShock((s) => ({ ...s, [k]: v }));
  const tone = r.verdict === "Proceed" ? "text-foreground" : "text-primary";
  return (
    <section id="f02">
      <Rule label="02 — What-if stress tests" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className={`${CARD} space-y-4 lg:col-span-2`}>
          <label className="block"><span className={LABEL}>Indian company</span>
            <select value={idx} onChange={(e) => setIdx(Number(e.target.value))} className={`${INPUT} mt-1`}>
              {LISTED_1000.slice(0, 200).map((c, i) => <option key={c.rank} value={i}>{c.rank}. {c.name}</option>)}
            </select>
          </label>
          <div className="flex gap-2">{(["ODI", "OPI"] as const).map((x) => (
            <button key={x} onClick={() => setRoute(x)} className={`flex-1 border px-3 py-2 text-xs ${route === x ? "border-primary text-primary" : "border-rule/25"}`}>{x}</button>
          ))}</div>
          <Slider label={`Ticket ₹${crore.toLocaleString("en-IN")} crore ≈ $${usd ? ((crore * 1e7) / usd / 1e6).toFixed(1) : "—"}m`} min={50} max={10000} step={50} value={crore} onChange={setCrore} />
          <div className="flex flex-wrap gap-2">{Object.keys(PRESETS).map((p) => (
            <button key={p} onClick={() => setShock(PRESETS[p]!)} className="border border-rule/25 px-2 py-1 text-xs hover:text-primary">{p}</button>
          ))}</div>
          <Slider label={`Rupee weakens ${shock.inrMovePct}%`} min={-10} max={30} step={1} value={shock.inrMovePct} onChange={(v) => set("inrMovePct", v)} />
          <Slider label={`Rate shock +${shock.rateShockBps} bps`} min={0} max={400} step={25} value={shock.rateShockBps} onChange={(v) => set("rateShockBps", v)} />
          <Slider label={`Market falls ${shock.equityDrawdownPct}%`} min={0} max={50} step={1} value={shock.equityDrawdownPct} onChange={(v) => set("equityDrawdownPct", v)} />
          <Slider label={`Hedged ${Math.round(shock.hedgeRatio * 100)}%`} min={0} max={100} step={5} value={Math.round(shock.hedgeRatio * 100)} onChange={(v) => set("hedgeRatio", v / 100)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={shock.sanctions} onChange={(e) => set("sanctions", e.target.checked)} /> Destination sanctioned / grey-listed</label>
        </div>
        <div className={`${CARD} lg:col-span-3`}>
          <p className={LABEL}>Verdict</p>
          <p className={`font-display mt-1 text-5xl ${tone}`}>{r.verdict}</p>
          <p className="mt-3 border-l-4 border-primary pl-4">{r.action}</p>
          <div className="mt-6 grid grid-cols-2 gap-px bg-rule/20 md:grid-cols-3">
            {[
              ["Extra FX cost", `₹${r.fxCostCrore} cr`],
              ["Value at risk", `₹${r.valueLossCrore} cr`],
              ["Net hit", `₹${r.netHitCrore} cr`],
              [`${route} ceiling`, `₹${r.ceilingCrore.toLocaleString("en-IN")} cr`],
              ["Headroom after shock", `₹${r.headroomCrore.toLocaleString("en-IN")} cr`],
              ["Net worth (audited)", `₹${co.netWorth.toLocaleString("en-IN")} cr`],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-4"><p className={LABEL}>{k}</p><p className="font-display mt-1 text-2xl">{v}</p></div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Ceiling per FEMA OI Rules 2022: ODI up to 400% of net worth, OPI up to 50%. Figures illustrative.</p>
        </div>
      </div>
    </section>
  );
}

function Slider(p: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block"><span className={LABEL}>{p.label}</span>
      <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} className="mt-1 w-full accent-[var(--primary)]" />
    </label>
  );
}

/* ----------------------------- 03 Doc reader ----------------------------- */

function DocReader() {
  return (
    <section id="f03">
      <Rule label="03 — AI document reader" />
      <DocumentReader />
    </section>
  );
}

/* --------------------------- 04 Early warning ---------------------------- */

function makeFlows(seed: number): Flow[] {
  return Array.from({ length: 14 }, (_, i) => {
    const k = (i * 31 + seed * 17) % 97;
    const c = LISTED_1000[(i * 37 + seed * 11) % 300]!;
    const h = HUBS[(i * 7 + seed) % HUBS.length]!;
    return {
      id: `F-${seed}-${i}`,
      entity: c.name,
      hub: h.city,
      crore: 40 + ((k * 53) % 1900),
      gapHours: (k * 5) % 96,
      utilisationPct: 40 + ((k * 7) % 62),
      sharedBeneficiary: k % 9 === 0 ? 4 : k % 5 === 0 ? 2 : 1,
      nearThreshold: k % 6 === 0,
    };
  });
}

function EarlyWarning() {
  const tape = useFxStream();
  const usd = tape.inrPer["USD"] ?? 95;
  const [seed, setSeed] = useState(1);
  const [live, setLive] = useState(true);
  const [show, setShow] = useState<"all" | "Critical" | "Elevated">("all");
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setSeed((s) => s + 1), 4000);
    return () => clearInterval(t);
  }, [live]);
  const [ds, setDs] = useState({ ...RBI_ODI, rows: RBI_ODI.rows as RbiFlow[], auto: false });
  const [check, setCheck] = useState<{ period: string; status: string; note: string | null; checked_at: string } | null>(null);
  useEffect(() => {
    let off = false;
    (async () => {
      const { data } = await supabase.from("rbi_odi_releases").select("period,released,page_url,status,note,total_rows,total_usd_mn,rows,checked_at,loaded_at").order("checked_at", { ascending: false }).limit(12);
      if (off || !data?.length) return;
      setCheck(data[0]!);
      const loaded = data.filter((d) => d.status === "loaded" && Array.isArray(d.rows)).sort((a, b) => Date.parse(`1 ${b.period}`) - Date.parse(`1 ${a.period}`))[0];
      if (loaded && Date.parse(`1 ${loaded.period}`) >= Date.parse(`1 ${RBI_ODI.period}`)) {
        setDs({ ...RBI_ODI, period: loaded.period, released: loaded.released ?? "", url: loaded.page_url, totalRows: loaded.total_rows ?? 0, totalUsdMn: Number(loaded.total_usd_mn ?? 0), rows: loaded.rows as unknown as RbiFlow[], auto: true });
      }
    })();
    return () => { off = true; };
  }, []);
  const real = useMemo(() => ds.rows.map(scoreRbiFlow).sort((a, b) => b.score - a.score || b.total - a.total), [ds]);
  const stale = check && check.period !== ds.period && check.status !== "loaded";
  const sample = useMemo(() => makeFlows(seed).slice(0, 6).map(scoreFlow).sort((a, b) => b.score - a.score), [seed]);
  const crit = real.filter((a) => a.level === "Critical").length;
  const elev = real.filter((a) => a.level === "Elevated").length;
  const shown = real.filter((a) => show === "all" || a.level === show).slice(0, 40);
  const pill = (l: string) => (l === "Critical" ? "bg-primary text-primary-foreground" : l === "Elevated" ? "border border-primary text-primary" : "text-muted-foreground");
  return (
    <section id="f04">
      <Rule label="04 — Regulator early-warning radar" />
      <div className={CARD}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={LABEL}>Forecast · {ds.period} · {ds.totalRows} real filings, ${ds.totalUsdMn.toLocaleString("en-IN")}m</p>
            <p className="font-display mt-1 text-3xl">{crit} real transfers need review now, {elev} to watch.</p>
            <p className="mt-2 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Auto-load: {ds.auto ? "loaded automatically from RBI" : "built-in copy"}
              {check ? ` · last RBI check ${new Date(check.checked_at).toLocaleString("en-IN")}` : " · daily RBI check scheduled"}
            </p>
            {stale ? (
              <p className="mt-2 border-l-4 border-primary pl-3 text-sm">
                RBI has published <strong>{check!.period}</strong>, but {check!.status === "blocked" ? "RBI's website blocked the automatic download" : "it could not be read"}. The radar keeps showing {ds.period} until the next daily try succeeds.
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">Recommended action: send Critical filings to RBI / CBDT for a closer look at the money trail; ask the AD bank for the board approval and audited net worth.</p>
          </div>
          <div className="flex gap-2">
            {(["all", "Critical", "Elevated"] as const).map((k) => (
              <button key={k} onClick={() => setShow(k)} className={`font-mono-ui border px-3 py-2 text-[10px] uppercase tracking-[0.14em] ${show === k ? "border-primary text-primary" : "border-rule/25"}`}>{k === "all" ? "All" : k}</button>
            ))}
          </div>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`${LABEL} border-b border-rule/20 text-left`}><th className="py-2">Level</th><th>Indian company</th><th>Overseas entity</th><th>Country</th><th className="text-right">$m</th><th className="text-right">₹ crore</th><th className="pl-4">Why flagged</th></tr></thead>
            <tbody>
              {shown.map((a, i) => (
                <tr key={`${a.party}-${a.jv}-${i}`} className="border-b border-rule/10 align-top">
                  <td className="py-2"><span className={`px-2 py-0.5 text-xs ${pill(a.level)}`}>{a.level} {a.score}</span><span className="ml-1 font-mono-ui text-[9px] uppercase text-primary">Real</span></td>
                  <td className="pr-2">{a.party}</td><td className="pr-2 text-xs text-muted-foreground">{a.jv} · {a.kind}</td><td>{a.country}</td>
                  <td className="text-right">{a.total.toFixed(2)}</td>
                  <td className="text-right">{usdMnToCrore(a.total, usd).toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
                  <td className="pl-4 text-xs text-muted-foreground">{a.reasons.join(" · ") || "Normal pattern"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Source: <a href={ds.url} target="_blank" rel="noreferrer" className="underline">{ds.source}</a>, released {ds.released}. Showing up to 40 of {real.length} filings ($1m+, or linked by party or overseas entity). Rupee values at the live ₹{usd.toFixed(2)}/USD. RBI publishes monthly, so these are last month's commitments — flags are review prompts, not findings of wrongdoing.
        </p>

        <div className="mt-8 border-t border-rule/20 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={LABEL}>Sample signals RBI does not publish</p>
              <p className="mt-1 text-sm text-muted-foreground">Ceiling use, repeat transfers inside 24 hours, shared receiving accounts and amounts just under a limit need bank-level data. These rows are samples.</p>
            </div>
            <button onClick={() => setLive((v) => !v)} className="font-mono-ui border border-rule/25 px-3 py-2 text-[10px] uppercase tracking-[0.14em]">{live ? "Pause samples" : "Resume samples"}</button>
          </div>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {sample.map((a) => (
                <tr key={a.id} className="border-b border-rule/10">
                  <td className="py-2"><span className={`px-2 py-0.5 text-xs ${pill(a.level)}`}>{a.level} {a.score}</span><span className="ml-1 font-mono-ui text-[9px] uppercase text-muted-foreground">Sample</span></td>
                  <td>{a.entity}</td><td>{a.hub}</td><td className="text-right">₹{a.crore.toLocaleString("en-IN")} cr</td>
                  <td className="pl-4 text-xs text-muted-foreground">{a.reasons.join(" · ") || "Normal pattern"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
