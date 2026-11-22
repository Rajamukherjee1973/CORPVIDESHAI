import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Circle, Fingerprint, KeyRound, Play, RotateCcw, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyPicker } from "./CompanyPicker";
import { HubOptions } from "./HubOptions";
import { findListed } from "@/data/listed";
import { useTreasuryFocus } from "@/lib/treasury-focus";
import { useTreasuryScenario } from "@/lib/treasury-scenario";
import {
  DESKS, DESK_ORDER, FAULTS, SIGNERS, appendBlock, buildFileNumber, canSign, canonical, checkFileNumber, deskRef,
  evaluateDesks, firstBrokenBlock, sha256Hex,
  type DeskBlock, type DeskCode, type DeskStatus, type Fault,
} from "@/lib/regulator-desk";

const STEPS = [
  ["Intake", "Treasury packet assembled"],
  ["Seal", "SHA-256 fingerprint taken"],
  ["Number", "File number issued"],
  ["Integrity gate", "Seal and beneficiary lock re-checked"],
  ["Six desks", "Parallel checks run"],
  ["Decision", "Route and outcome fixed"],
  ["Sign / release", "Officer quorum or noted"],
] as const;

const OUTCOME: Record<string, string> = {
  "rejected-at-intake": "Rejected at intake — seal broken",
  held: "Held — returned to applicant",
  queried: "Queried — awaiting applicant's reply",
  "awaiting-signatures": "Approval route — awaiting officer signatures",
  noted: "Automatic route — noted on the record",
  approved: "Approved (demo) — AD bank may remit",
};

const STATUS_LABEL: Record<DeskStatus | "pending" | "checking", string> = { clear: "Clear", refer: "Refer", query: "Query", hold: "Hold", blocked: "Blocked", pending: "Waiting", checking: "Checking" };
const BENEFICIARY = "DBS-SG-0042-778100";
const SEQ_KEY = "cv-regdesk-seq";
const short = (h: string) => (h === "GENESIS" ? "GENESIS" : `${h.slice(0, 8)}…`);

function nodeClass(s: DeskStatus | "pending" | "checking") {
  switch (s) {
    case "clear": return { c: "fill-foreground stroke-foreground", t: "fill-background" };
    case "hold": case "query": return { c: "fill-primary stroke-primary", t: "fill-primary-foreground" };
    case "refer": return { c: "fill-background stroke-primary", t: "fill-primary" };
    case "blocked": return { c: "fill-muted stroke-muted-foreground", t: "fill-muted-foreground" };
    case "checking": return { c: "fill-background stroke-primary animate-pulse motion-reduce:animate-none", t: "fill-foreground" };
    default: return { c: "fill-background stroke-border", t: "fill-muted-foreground" };
  }
}

export function SixRegulatorDesk({ compact = false }: { compact?: boolean }) {
  const ringId = useId().replace(/:/g, "");
  const [name, setName] = useTreasuryFocus();
  const [scenario, setScenario] = useTreasuryScenario();
  const company = findListed(name);
  const investment: "ODI" | "OPI" = scenario.purpose.startsWith("OPI") ? "OPI" : "ODI";
  const facts = { investment, amountCr: scenario.amountCr, netWorthCr: company?.netWorth ?? 1, existingCr: company?.used ?? 0 };

  const [faults, setFaults] = useState<Fault[]>([]);
  const [selected, setSelected] = useState<DeskCode>("RBI");
  const [phase, setPhase] = useState(-1);
  const [seal, setSeal] = useState("");
  const [presented, setPresented] = useState("");
  const [benLock, setBenLock] = useState<[string, string] | null>(null);
  const [fileNo, setFileNo] = useState<ReturnType<typeof buildFileNumber> | null>(null);
  const [chain, setChain] = useState<DeskBlock[]>([]);
  const [broken, setBroken] = useState(-1);
  const [acting, setActing] = useState<DeskCode>("RBI");
  const [signed, setSigned] = useState<DeskCode[]>([]);
  const [refusals, setRefusals] = useState(0);
  const [numberInput, setNumberInput] = useState("");

  const result = useMemo(() => evaluateDesks(facts, faults), [facts.investment, facts.amountCr, facts.netWorthCr, facts.existingCr, faults]); // eslint-disable-line react-hooks/exhaustive-deps
  const ran = phase >= 0;
  const approved = result.outcome === "awaiting-signatures" && SIGNERS.every((s) => signed.includes(s));
  const outcomeKey = approved ? "approved" : result.outcome;

  useEffect(() => { setPhase(-1); setSeal(""); setFileNo(null); setChain([]); setSigned([]); setRefusals(0); setBenLock(null); }, [name, scenario.hub, scenario.purpose, scenario.amountCr, faults]);
  useEffect(() => {
    if (phase < 0 || phase >= STEPS.length - 1) return;
    const id = setTimeout(() => setPhase((p) => p + 1), 650);
    return () => clearTimeout(id);
  }, [phase]);
  useEffect(() => { let live = true; void firstBrokenBlock(chain).then((i) => { if (live) setBroken(i); }); return () => { live = false; }; }, [chain]);

  async function run() {
    const packet = { company: company?.name ?? name, hub: scenario.hub, amountCr: scenario.amountCr, investment, purpose: scenario.purpose, beneficiary: BENEFICIARY, documents: ["board-resolution", "net-worth-certificate", "form-fc", "valuation", ...(faults.includes("tax") ? [] : ["trc-form-10f"]), ...(faults.includes("ibu") ? [] : ["ibu-mandate"])] };
    const s = await sha256Hex(canonical(packet));
    const p = faults.includes("tamper") ? await sha256Hex(canonical({ ...packet, amountCr: packet.amountCr * 10 })) : s;
    const ben = await sha256Hex(BENEFICIARY);
    const benNow = faults.includes("beneficiary") ? await sha256Hex("XX-OFFSHORE-9911-000000") : ben;
    let seq = 1;
    try { seq = (Number(sessionStorage.getItem(SEQ_KEY)) || 0) + 1; sessionStorage.setItem(SEQ_KEY, String(seq)); } catch { /* private mode */ }
    const f = buildFileNumber({ investment, route: result.route, hub: scenario.hub, year: new Date().getFullYear(), seq, hash: s });
    let c = await appendBlock([], { desk: "Treasury", action: `Packet sealed · ${company?.name ?? name} · ₹${scenario.amountCr.toLocaleString("en-IN")} cr → ${scenario.hub}`, ref: f.full });
    c = await appendBlock(c, { desk: "Registry", action: `File number issued (${result.route} route)`, ref: f.full });
    if (result.integrity === "broken") {
      c = await appendBlock(c, { desk: "Security", action: "Integrity gate: presented file hash ≠ seal — rejected before any desk", ref: f.full });
    } else {
      for (const [i, v] of result.verdicts.entries()) c = await appendBlock(c, { desk: v.code, action: `${STATUS_LABEL[v.status]} — ${v.note}`, ref: deskRef(f.full, v.code, i + 1) });
      if (faults.includes("impersonation")) c = await appendBlock(c, { desk: "Security", action: "Signature with CBDT key on the RBI slot refused", ref: deskRef(f.full, "RBI", 0) });
    }
    c = await appendBlock(c, { desk: "Decision", action: OUTCOME[result.outcome]!, ref: f.full });
    setSeal(s); setPresented(p); setBenLock([ben, benNow]); setFileNo(f); setNumberInput(f.full); setChain(c);
    setSigned([]); setRefusals(faults.includes("impersonation") ? 1 : 0); setPhase(0);
  }

  async function sign(target: DeskCode) {
    if (!fileNo || result.outcome !== "awaiting-signatures" || signed.includes(target)) return;
    if (!canSign(acting, target)) {
      setRefusals((n) => n + 1);
      setChain(await appendBlock(chain, { desk: "Security", action: `Signature with ${acting} key on the ${target} slot refused`, ref: deskRef(fileNo.full, target, 0) }));
      return;
    }
    const next = [...signed, target];
    let c = await appendBlock(chain, { desk: target, action: `Officer signature — ${target} approves`, ref: deskRef(fileNo.full, target, next.length) });
    if (SIGNERS.every((s) => next.includes(s))) c = await appendBlock(c, { desk: "Release", action: OUTCOME["approved"]!, ref: fileNo.full });
    setSigned(next); setChain(c);
  }

  function forge() {
    if (chain.length < 3) return;
    setChain(chain.map((b, i) => (i === 2 ? { ...b, action: `${b.action} [edited: amount raised to ₹${(scenario.amountCr * 10).toLocaleString("en-IN")} cr]` } : b)));
  }

  const statusOf = (code: DeskCode): DeskStatus | "pending" | "checking" => {
    if (phase < 4) return "pending";
    const idx = DESK_ORDER.indexOf(code);
    if (phase === 4 && idx > 2) return "checking";
    const st = result.verdicts.find((v) => v.code === code)?.status ?? "pending";
    return st === "refer" && signed.includes(code) ? "clear" : st;
  };
  const machine = DESK_ORDER.reduce((n, d) => n + DESKS[d].checks.filter((c) => c.kind === "machine").length, 0);
  const officer = DESK_ORDER.reduce((n, d) => n + DESKS[d].checks.filter((c) => c.kind === "officer").length, 0);
  const desk = DESKS[selected];
  const verdict = result.verdicts.find((v) => v.code === selected);
  const numberCheck = seal && numberInput ? checkFileNumber(numberInput, seal) : null;
  const toggle = (f: Fault) => setFaults((xs) => (xs.includes(f) ? xs.filter((x) => x !== f) : [...xs, f]));

  const R = 150, C = 210;
  const pos = (i: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6; return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) }; };

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-10" aria-labelledby={`${ringId}-h`}>
      <div className="border-t-4 border-primary pt-5">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">Six-regulator desk · what is checked · how approval is made · how files are numbered</p>
        <h2 id={`${ringId}-h`} className="font-display mt-3 text-4xl leading-none md:text-5xl">One file. Six desks. Every check in plain sight.</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">Seal a filing, watch it get its number, pass the security gate and fan out to six desks at once. Then try to break it — each attack is caught by a named desk or security layer, and every step is written to a tamper-evident record.</p>
      </div>

      {!compact && (
        <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_1fr]">
          <div className="min-w-0 bg-background p-3"><span className="font-mono-ui text-[10px] text-primary">COMPANY</span><CompanyPicker className="mt-1" value={name} onChange={setName} /></div>
          <label className="bg-background p-3 font-mono-ui text-[10px] text-primary">HUB<select aria-label="Regulator desk hub" className="mt-1 h-10 w-full border border-input bg-background px-2 text-sm text-foreground" value={scenario.hub} onChange={(e) => setScenario({ hub: e.target.value, currency: undefined })}><HubOptions /></select></label>
          <label className="bg-background p-3 font-mono-ui text-[10px] text-primary">₹ CRORE<input aria-label="Regulator desk amount" type="number" min={1} className="mt-1 h-10 w-full border border-input bg-background px-2 text-sm text-foreground" value={scenario.amountCr} onChange={(e) => setScenario({ amountCr: Math.max(0.01, Number(e.target.value) || 0) })} /></label>
          <div className="bg-background p-3 font-mono-ui text-[10px] text-primary">CEILING ({investment === "ODI" ? "400%" : "50%"} OF NET WORTH)
            <p className="mt-2 font-display text-xl text-foreground">₹{Math.round(result.ceiling).toLocaleString("en-IN")} cr</p>
            <p className="text-[10px] normal-case text-muted-foreground">Used ₹{Math.round(facts.existingCr).toLocaleString("en-IN")} cr · {company ? "sample/filed figures" : "company not found"}</p>
          </div>
        </div>
      )}

      {compact && (
        <p className="mt-5 border-y border-border py-3 font-mono-ui text-[11px] text-muted-foreground">
          Using the selection above · <span className="text-foreground">{company?.name ?? name}</span> · {scenario.hub} · ₹{scenario.amountCr.toLocaleString("en-IN")} cr {investment} · reference ceiling ₹{Math.round(result.ceiling).toLocaleString("en-IN")} cr
        </p>
      )}

      {/* Step rail */}
      <ol className="mt-6 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4 lg:grid-cols-7" aria-label="Approval steps">
        {STEPS.map(([k, n], i) => {
          const done = phase >= i, stop = result.integrity === "broken" && i > 3 && phase >= i;
          return (
            <li key={k} className={`p-3 transition-colors ${stop ? "bg-muted text-muted-foreground" : done ? (i === phase ? "bg-primary text-primary-foreground" : "bg-foreground text-background") : "bg-background"}`}>
              <span className="font-mono-ui text-[10px]">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-sm font-medium">{k}</p>
              <p className={`text-[11px] ${done && !stop ? "opacity-80" : "text-muted-foreground"}`}>{stop ? "Not reached" : n}</p>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={run}><Play className="mr-1 h-4 w-4" />{ran ? "Run the file again" : "Seal and run the file"}</Button>
        <span role="status" aria-live="polite" className={`font-mono-ui text-xs ${ran && phase >= 5 ? (["held", "queried", "rejected-at-intake"].includes(outcomeKey) ? "text-primary" : "text-foreground") : "text-muted-foreground"}`}>
          {ran && phase >= 5 ? OUTCOME[outcomeKey] : ran ? STEPS[phase]?.[1] : `Ready · ${faults.length ? `${faults.length} attack${faults.length > 1 ? "s" : ""} armed` : "clean file"}`}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Ring infographic */}
        <div className="border border-border p-4">
          <svg viewBox="0 0 420 420" className="mx-auto w-full max-w-[460px]" role="img" aria-label="Six regulator desks around the sealed file">
            <defs><path id={`${ringId}-ring`} d={`M ${C} ${C} m -195 0 a 195 195 0 1 1 390 0 a 195 195 0 1 1 -390 0`} /></defs>
            <circle cx={C} cy={C} r={195} fill="none" className={result.integrity === "broken" && ran ? "stroke-primary" : "stroke-border"} strokeWidth={result.integrity === "broken" && ran ? 3 : 1} strokeDasharray="3 4" />
            <text fontSize="9" letterSpacing="2" className="fill-muted-foreground font-mono-ui"><textPath href={`#${ringId}-ring`} startOffset="2%">SECURITY PERIMETER · SHA-256 SEAL · DESK-BOUND SIGNING KEYS · BENEFICIARY LOCK · APPEND-ONLY RECORD ·</textPath></text>
            {DESK_ORDER.map((d, i) => {
              const p = pos(i), s = statusOf(d);
              return <line key={`l-${d}`} x1={C} y1={C} x2={p.x} y2={p.y} strokeWidth={s === "pending" ? 1 : 2} strokeDasharray={s === "checking" || s === "pending" ? "4 4" : undefined} className={s === "hold" || s === "query" || s === "refer" ? "stroke-primary" : s === "pending" || s === "blocked" ? "stroke-border" : "stroke-foreground"} />;
            })}
            <rect x={C - 62} y={C - 40} width={124} height={80} className={result.integrity === "broken" && phase >= 3 ? "fill-primary/10 stroke-primary" : "fill-background stroke-foreground"} strokeWidth={1.5} />
            <text x={C} y={C - 20} textAnchor="middle" fontSize="9" className="fill-muted-foreground font-mono-ui">{phase >= 2 && fileNo ? fileNo.segments.slice(1, 4).map((s) => s.value).join("/") : "FILE"}</text>
            <text x={C} y={C + 2} textAnchor="middle" fontSize="13" className="fill-foreground font-mono-ui">{phase >= 2 && fileNo ? fileNo.full.split("/").at(-1) : "— —"}</text>
            <text x={C} y={C + 22} textAnchor="middle" fontSize="9" className={phase >= 5 && ["held", "queried", "rejected-at-intake"].includes(outcomeKey) ? "fill-primary font-mono-ui" : "fill-muted-foreground font-mono-ui"}>{phase >= 5 ? (approved ? "APPROVED (DEMO)" : result.outcome.replace(/-/g, " ").toUpperCase()) : phase >= 1 ? `SEAL ${seal.slice(0, 8)}` : "NOT SEALED"}</text>
            {DESK_ORDER.map((d, i) => {
              const p = pos(i), s = statusOf(d), k = nodeClass(s);
              const sig = SIGNERS.includes(d);
              return (
                <g key={d} role="button" tabIndex={0} aria-label={`${d} desk — ${STATUS_LABEL[s]}`} aria-pressed={selected === d} onClick={() => setSelected(d)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(d); } }} className="cursor-pointer outline-none">
                  {selected === d && <circle cx={p.x} cy={p.y} r={44} fill="none" className="stroke-primary" strokeWidth={1.5} />}
                  <circle cx={p.x} cy={p.y} r={36} className={k.c} strokeWidth={2} />
                  <text x={p.x} y={p.y - 2} textAnchor="middle" fontSize={d.length > 4 ? 11 : 14} fontWeight={600} className={k.t}>{d}</text>
                  <text x={p.x} y={p.y + 13} textAnchor="middle" fontSize="8" className={`${k.t} font-mono-ui`}>{STATUS_LABEL[s].toUpperCase()}</text>
                  {sig && <text x={p.x} y={p.y + (p.y > C ? 52 : -44)} textAnchor="middle" fontSize="8" className={signed.includes(d) ? "fill-foreground font-mono-ui" : "fill-muted-foreground font-mono-ui"}>{signed.includes(d) ? "✓ SIGNED" : "OFFICER SIGNS"}</text>}
                </g>
              );
            })}
          </svg>
          <dl className="mt-2 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
            {[
              ["Machine checks", String(machine)],
              ["Officer checks", String(officer)],
              ["Signatures", result.outcome === "awaiting-signatures" && ran ? `${signed.length} / ${SIGNERS.length}` : "none needed"],
              ["Seal", !ran ? "—" : result.integrity === "broken" ? "Broken" : "Intact"],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-3"><dt className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{k}</dt><dd className={`mt-1 font-display text-xl ${v === "Broken" ? "text-primary" : ""}`}>{v}</dd></div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-muted-foreground">Tap a desk to see what it checks. Black = clear · red = hold or query · red ring = refer for signature · grey = blocked.</p>
        </div>

        {/* Desk detail */}
        <div className="border border-border">
          <div role="tablist" aria-label="Regulator desks" className="grid grid-cols-3 gap-px bg-border sm:grid-cols-6">
            {DESK_ORDER.map((d) => (
              <button key={d} role="tab" aria-selected={selected === d} type="button" onClick={() => setSelected(d)} className={`px-2 py-2.5 font-mono-ui text-[11px] ${selected === d ? "bg-primary text-primary-foreground" : "bg-background hover:text-primary"}`}>{d}</button>
            ))}
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-2xl">{desk.name}</p>
              <span className={`border px-2 py-0.5 font-mono-ui text-[9px] uppercase tracking-[0.14em] ${desk.standing === "Statutory today" ? "border-foreground" : "border-primary text-primary"}`}>{desk.standing}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{desk.today}</p>
            <p className="mt-1 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Turnaround in this model: {desk.sla}</p>
            <ul className="mt-4 divide-y divide-border border border-border">
              {desk.checks.map((c) => {
                const failed = ran && phase >= 4 && (verdict?.failed.includes(c.id) ?? false);
                const blocked = ran && result.integrity === "broken";
                const ok = ran && phase >= 4 && !failed && !blocked;
                return (
                  <li key={c.id} className="flex gap-3 p-3">
                    <span className="mt-0.5">{failed ? <X className="h-4 w-4 text-primary" /> : ok ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${failed ? "text-primary" : ""}`}>{c.label}</span>
                      <span className="block text-[11px] text-muted-foreground">Reads: {c.reads}</span>
                    </span>
                    <span className={`h-fit border px-1.5 py-0.5 font-mono-ui text-[9px] uppercase ${c.kind === "officer" ? "border-foreground" : "border-border text-muted-foreground"}`}>{c.kind}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 border-l-2 border-primary bg-accent px-4 py-3 text-sm">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">Decision on this file</p>
              <p className="mt-1">{ran && phase >= 4 ? verdict?.note : "Run the file to see this desk's decision."}</p>
            </div>
            {SIGNERS.includes(selected) && ran && phase >= 6 && result.outcome === "awaiting-signatures" && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="sm" disabled={signed.includes(selected)} onClick={() => void sign(selected)}><KeyRound className="mr-1 h-3.5 w-3.5" />{signed.includes(selected) ? `${selected} signed` : `Sign ${selected} slot with ${acting} key`}</Button>
                {acting !== selected && !signed.includes(selected) && <span className="text-xs text-primary">Wrong key — this will be refused and logged.</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File number anatomy */}
      <div className="mt-6 border border-border p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary"><Fingerprint className="mr-1 inline h-3.5 w-3.5" />How the file is numbered</p>
          <p className="text-[11px] text-muted-foreground">In real filings the AD bank reports the ODI on RBI's FIRMS portal, which issues the UIN. This is the prototype's own register number.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4 lg:grid-cols-7">
          {(fileNo?.segments ?? buildFileNumber({ investment, route: result.route, hub: scenario.hub, year: 2026, seq: 0, hash: "????" }).segments).map((s, i) => (
            <div key={s.key} className={`bg-background p-3 ${phase >= 2 ? "" : "opacity-60"}`}>
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{String(i + 1).padStart(2, "0")} · {s.key}</p>
              <p className={`mt-1 font-mono-ui text-xl ${s.key === "Check" || s.key === "Route" ? "text-primary" : ""}`}>{phase >= 2 ? s.value : s.key === "Sequence" ? "000000" : s.key === "Check" ? "····" : s.value}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{s.meaning}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="text-xs text-muted-foreground">Verify a file number against the seal (try changing one character)
            <input aria-label="File number to verify" value={numberInput} onChange={(e) => setNumberInput(e.target.value)} placeholder="Run the file first" disabled={!seal} className="mt-1 block w-full border border-input bg-background px-3 py-2 font-mono-ui text-sm text-foreground" />
          </label>
          <p role="status" className={`font-mono-ui text-xs ${numberCheck ? (numberCheck.ok ? "text-foreground" : "text-primary") : "text-muted-foreground"}`}>{numberCheck ? `${numberCheck.ok ? "✓" : "✗"} ${numberCheck.reason}` : "—"}</p>
        </div>
        {benLock && (
          <div className="mt-4 grid gap-px border border-border bg-border text-xs sm:grid-cols-2">
            <div className="bg-background p-3"><p className="text-muted-foreground">File seal at sealing → presented at gate</p><p className={`mt-1 break-all font-mono-ui ${seal !== presented ? "text-primary" : ""}`}>{short(seal)} → {short(presented)} {seal === presented ? "match" : "MISMATCH"}</p></div>
            <div className="bg-background p-3"><p className="text-muted-foreground">Beneficiary lock at sealing → at payment</p><p className={`mt-1 break-all font-mono-ui ${benLock[0] !== benLock[1] ? "text-primary" : ""}`}>{short(benLock[0])} → {short(benLock[1])} {benLock[0] === benLock[1] ? "match" : "MISMATCH"}</p></div>
          </div>
        )}
      </div>

      {/* Attacks */}
      <div className="mt-6 border border-border p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary"><ShieldAlert className="mr-1 inline h-3.5 w-3.5" />Try to break it — arm an attack, then run the file</p>
          <Link to="/security" search={{ view: "rail" }} className="text-[11px] uppercase tracking-[0.16em] text-primary hover:underline">Full security demonstration →</Link>
        </div>
        <div className="mt-4 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {FAULTS.map((f) => {
            const on = faults.includes(f.id);
            return (
              <button key={f.id} type="button" aria-pressed={on} onClick={() => toggle(f.id)} className={`p-3 text-left transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}>
                <span className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{f.label}</span><span className={`border px-1.5 font-mono-ui text-[9px] ${on ? "border-primary-foreground" : "border-border text-muted-foreground"}`}>{f.caughtBy}</span></span>
                <span className={`mt-1 block text-[11px] ${on ? "text-primary-foreground/85" : "text-muted-foreground"}`}>{on ? f.layer : f.plain}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Signing keys + chain */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="border border-border p-5">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary"><KeyRound className="mr-1 inline h-3.5 w-3.5" />Officer signing keys</p>
          <p className="mt-2 text-sm text-muted-foreground">On an Approval-route file four officer desks must sign. Each key works only for its own desk; anything else is refused and written to the record.</p>
          <label className="mt-4 block text-xs text-muted-foreground">You are holding the signing key of
            <select aria-label="Signing key held" value={acting} onChange={(e) => setActing(e.target.value as DeskCode)} className="mt-1 block h-10 w-full border border-input bg-background px-2 text-sm text-foreground">
              {DESK_ORDER.map((d) => <option key={d} value={d}>{d} desk</option>)}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-px border border-border bg-border">
            {SIGNERS.map((s) => (
              <button key={s} type="button" disabled={!ran || phase < 6 || result.outcome !== "awaiting-signatures" || signed.includes(s)} onClick={() => void sign(s)} className={`p-3 text-left text-sm disabled:cursor-not-allowed ${signed.includes(s) ? "bg-foreground text-background" : "bg-background hover:bg-accent disabled:opacity-60"}`}>
                <span className="font-mono-ui text-[10px] uppercase">{signed.includes(s) ? "Signed" : "Sign slot"}</span>
                <span className="block font-display text-xl">{s}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {!ran ? "Run the file first." : result.outcome !== "awaiting-signatures" ? "No signatures on this file — " + (result.outcome === "noted" ? "the Automatic route is processed by the AD bank and only noted." : "it must be fixed before anyone can sign.") : approved ? "All four signed — release instruction written." : `${SIGNERS.length - signed.length} signature${SIGNERS.length - signed.length === 1 ? "" : "s"} left.`}
            {refusals > 0 && <span className="mt-1 block text-primary">{refusals} signing attempt{refusals > 1 ? "s" : ""} refused and logged.</span>}
          </p>
        </div>

        <div className="border border-border">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">{broken === -1 ? <ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> : <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />}Tamper-evident record · {chain.length} entries</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={chain.length < 3 || broken !== -1} onClick={forge}>Forge entry #2</Button>
              <Button size="sm" variant="ghost" disabled={!ran} onClick={() => void run()}><RotateCcw className="mr-1 h-3.5 w-3.5" />Re-seal</Button>
            </div>
          </div>
          <p role="status" className={`px-4 pt-3 text-xs ${broken === -1 ? "text-muted-foreground" : "text-primary"}`}>
            {chain.length === 0 ? "Entries appear when the file runs." : broken === -1 ? "Every entry's SHA-256 matches its content and links to the one before — verified in your browser." : `Entry #${broken} no longer matches its fingerprint — every later link is now untrusted.`}
          </p>
          <ol className="max-h-[360px] overflow-y-auto p-2">
            {chain.map((b) => {
              const bad = broken !== -1 && b.index >= broken;
              return (
                <li key={`${b.index}-${b.hash}`} className={`grid grid-cols-[34px_86px_1fr] gap-2 border-b border-border px-2 py-2 text-xs last:border-b-0 ${bad ? "bg-primary/5" : ""}`}>
                  <span className={`font-mono-ui ${bad ? "text-primary" : "text-muted-foreground"}`}>#{b.index}</span>
                  <span className={`font-mono-ui uppercase ${b.desk === "Security" ? "text-primary" : ""}`}>{b.desk}</span>
                  <span className="min-w-0">
                    <span className="block">{b.action}</span>
                    <span className="block truncate font-mono-ui text-[10px] text-muted-foreground">{b.ref} · {short(b.prev)} → {short(b.hash)}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Demonstration of a proposed supervisory model, not an official process. Under current law the AD Category-I bank processes Automatic-route overseas investments and RBI decides Approval-route cases; FIU-IND, CBDT, MoF and DPIIT do not approve individual investments, so their desks here are illustrative review lenses. Hashes are computed with your browser's WebCrypto; signing keys are simulated desk bindings, not digital signature certificates. No filing, approval or remittance leaves this page.
      </p>
    </section>
  );
}
