import { ForecastLede } from "@/components/site/ForecastLede";
import { Button } from "@/components/ui/button";
import { useTreasuryFocus } from "@/lib/treasury-focus";
import { useTreasuryScenario } from "@/lib/treasury-scenario";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { createFileRoute } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { CompanyPicker } from "@/components/site/CompanyPicker";
import { LanguagePicker, useNarrator } from "@/components/site/VoiceGuide";
import {
  EvidenceAudit,
  GapMatrix,
  PermissionMatrix,
  ProgressImport,
  StepEvidence,
} from "@/components/site/EvidenceTracker";
import { useEvidenceState, type EvidenceStatus } from "@/lib/evidence-state";
import { ROLE_LABEL, canSetStatus, usePermissions } from "@/lib/evidence-permissions";
import { useSession } from "@/lib/session";
import { findHub } from "@/data/hub-catalog";
import { HubOptions } from "@/components/site/HubOptions";
import { COUNTRY_META } from "@/data/currencies";
import { LISTED_1000, NETWORTH_FY, findListed, networthNote } from "@/data/listed";
import { AD_BANKS, banksForCountry } from "@/data/banks";
import { CLASS_META, findPurpose, purposesFor, type InvestmentClass } from "@/data/purposes";
import { MoneyFlow3D, type FlowNode } from "@/components/site/MoneyFlow3D";
import { RegulatorConsole } from "@/components/site/RegulatorConsole";
import { quorumWindow } from "@/lib/quorum";
import {
  MANUAL_DAYS,
  REGULATOR_ACTIONS,
  fmtClock,
  narrationFor,
  stepsFor,
  totalSeconds,
  type RouteKey,
} from "@/lib/routes-detail";
import {
  buildTranscript,
  downloadTranscriptCsv,
  downloadTranscriptDocx,
  downloadTranscriptJson,
  downloadTranscriptText,
  translateRows,
} from "@/lib/transcript";

const TITLE = "Automatic vs Approval Route — CorpVidesh AI";
const DESC =
  "Both FEMA outbound routes executed step by step in under nine minutes, with manual input points, what each of the six regulators actually does, and voice narration in 38+ languages.";

export const Route = createFileRoute("/routes")({
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
  component: RouteDesk,
});

const ROUTES: RouteKey[] = ["Automatic", "Approval"];

/** Rail seconds elapsed per real second while the demonstration runs. */
const SPEED = 8;

function RouteDesk() {
  const [scenario] = useTreasuryScenario();
  const [scenarioCompany] = useTreasuryFocus();
  const [route, setRoute] = useState<RouteKey>("Automatic");
  const [mode, setMode] = useState<"automated" | "manual">("automated");
  const [language, setLanguage] = useState("English (India)");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [investClass, setInvestClass] = useState<InvestmentClass>("ODI");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [openStep, setOpenStep] = useState(0);
  const [regFocus, setRegFocus] = useState("ALL");
  const raf = useRef<number | null>(null);
  const narrator = useNarrator();
  const { session } = useSession();
  const perms = usePermissions(session);
  const guard = useCallback(
    (item: { stepId: string; reviewer: string }, status: EvidenceStatus) =>
      canSetStatus(session, perms.config, item, status),
    [perms.config, session],
  );
  const evidence = useEvidenceState(route, guard);
  const [exporting, setExporting] = useState<"txt" | "docx" | "csv" | "json" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportTranscript = async (kind: "txt" | "docx" | "csv" | "json") => {
    setExportError(null);
    setExporting(kind);
    try {
      const rows = await translateRows(buildTranscript(route), language);
      if (kind === "txt") downloadTranscriptText(route, language, rows);
      else if (kind === "csv") downloadTranscriptCsv(route, language, rows);
      else if (kind === "json") downloadTranscriptJson(route, language, rows);
      else await downloadTranscriptDocx(route, language, rows);
    } catch (e) {
      setExportError(e instanceof Error ? e.message.slice(0, 160) : "Transcript export failed");
    } finally {
      setExporting(null);
    }
  };

  const steps = useMemo(() => stepsFor(route), [route]);
  const total = totalSeconds(route);
  const inputs = steps.filter((s) => s.input);
  const missing = inputs.filter((s) => !fields[s.input!.key]?.trim());

  // Intake resolution: filer → audited net worth; hub → jurisdiction bank list.
  const filer = findListed(fields["entity"] ?? "");
  const hub = findHub(fields["hub"] ?? "") ?? null;
  const hubMeta = hub ? (COUNTRY_META[hub.country] ?? null) : null;
  const overseasBanks = useMemo(
    () => (hub ? banksForCountry(hub.country, hub.city) : []),
    [hub],
  );
  const adBank = AD_BANKS.find((b) => b.name === (fields["adbank"] ?? "")) ?? null;
  const overseasBank = fields["obank"] ?? "";
  const amountCr = Number(fields["amount"] ?? 0) || 0;
  const purpose = findPurpose(fields["purpose"] ?? "") ?? null;
  const classMeta = CLASS_META[investClass];
  const opiCap = filer ? filer.netWorth * 0.5 : 0;
  const opiBreach = investClass === "OPI" && !!filer && amountCr > opiCap;

  useEffect(() => {
    if (!filer) return;
    setFields((v) =>
      v["networth"] === String(filer.netWorth) ? v : { ...v, networth: String(filer.netWorth) },
    );
  }, [filer]);

  useEffect(() => {
    setFields((v) => (v["obank"] ? { ...v, obank: "" } : v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields["hub"]]);

  const ceiling = filer ? filer.ceiling : 0;
  const utilisation = ceiling ? ((filer!.used + amountCr) / ceiling) * 100 : 0;
  const withinCeiling = ceiling ? filer!.used + amountCr <= ceiling : true;
  const netCr = amountCr; // Investment principal is not a generic income-withholding base.

  const flowNodes: FlowNode[] = [
    { key: "filer", label: filer ? filer.name.slice(0, 26) : "Indian party", sub: "Treasury · INR account" },
    { key: "ad", label: adBank ? adBank.name.slice(0, 26) : "AD Category-I bank", sub: adBank ? adBank.swift : "Form A2 · 15CA/15CB" },
    { key: "gift", label: "GIFT IFSC rail", sub: "Six regulators · one ledger" },
    ...(route === "Approval"
      ? [{ key: "rbi", label: "RBI — Overseas Investment", sub: "Approval-route sanction" } as FlowNode]
      : []),
    { key: "nostro", label: "Correspondent / nostro", sub: hubMeta ? `INR → ${hubMeta.currency}` : "FX conversion" },
    { key: "obank", label: overseasBank ? overseasBank.slice(0, 26) : "Overseas bank", sub: hub ? `${hub.city} · ${hub.country}` : "Target jurisdiction" },
  ];
  const legIndex = Math.min(flowNodes.length - 2, Math.floor((elapsed / total) * (flowNodes.length - 1)));

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const tick = (now: number) => {
      const d = ((now - last) / 1000) * SPEED;
      last = now;
      setElapsed((e) => {
        const next = e + d;
        if (next >= total) {
          setRunning(false);
          return total;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [running, total]);

  useEffect(() => {
    setElapsed(0);
    setRunning(false);
    setOpenStep(0);
  }, [route]);

  const bounds = useMemo(() => {
    let cursor = 0;
    return steps.map((s) => {
      const start = cursor;
      cursor += s.seconds[route];
      return { start, end: cursor };
    });
  }, [steps, route]);

  const activeIndex = Math.max(
    0,
    bounds.findIndex((b) => elapsed < b.end),
  );
  const stateOf = (i: number) =>
    elapsed >= bounds[i]!.end ? "cleared" : elapsed > bounds[i]!.start ? "running" : "queued";

  // Regulator quorum clock: seconds since the AD bank dispatched the packet.
  const quorumWin = useMemo(() => quorumWindow(route), [route]);
  const dispatchAt = total * 0.35;
  const quorumClock =
    elapsed <= dispatchAt
      ? 0
      : Math.min(
          quorumWin.close + 4,
          ((elapsed - dispatchAt) / Math.max(1, total - dispatchAt)) * (quorumWin.close + 4),
        );

  const detail = steps[openStep]!;

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-14">
        <Rule label="Automatic route and Approval route — full execution detail" />
        <Button variant="outline" className="mb-4 max-w-full whitespace-normal rounded-none" disabled={running} onClick={() => {
          setFields((v) => ({ ...v, entity: scenarioCompany, hub: scenario.hub, purpose: scenario.purpose, amount: String(scenario.amountCr), justification: findPurpose(scenario.purpose)?.plain ?? "", obank: "" }));
          setInvestClass(scenario.purpose.startsWith("OPI") ? "OPI" : "ODI");
        }}>Use selected treasury scenario · {scenario.hub} · ₹{scenario.amountCr.toLocaleString("en-IN")} cr</Button>
        <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-primary">
          For Swiss venture capital funds and Indian government agencies
        </p>
        <h1 className="font-display mt-5 max-w-5xl text-5xl leading-[1.03] sm:text-6xl lg:text-[86px]">
          Two statutory routes. One rail.
          <span className="text-primary"> Both cleared in under nine minutes.</span>
        </h1>
        <p className="mt-7 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Indian law offers a company two ways to send investment capital abroad. The Automatic route
          needs no prior consent; the Approval route requires the Reserve Bank to say yes first. Below,
          each route is executed step by step — showing every manual input a human must supply, every
          act each of the six regulators performs, and the exact time each step consumes. Every line can
          be heard aloud in 38+ languages.
        </p>

        <div className="mt-10 grid gap-px bg-rule/15 lg:grid-cols-2">
          {ROUTES.map((r) => {
            const sel = r === route;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoute(r)}
                aria-pressed={sel}
                className={`bg-background p-7 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
                  sel ? "bg-primary text-primary-foreground" : "hover:bg-secondary/40"
                }`}
              >
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] opacity-80">
                  {r === "Automatic" ? "Rule 7 — within the ceiling" : "Rule 10 — beyond the ceiling"}
                </p>
                <p className="font-display mt-3 text-4xl">{r} route</p>
                <p className="mt-3 max-w-md text-sm leading-relaxed opacity-90">
                  {r === "Automatic"
                    ? "The commitment sits inside 400% of audited net worth and in a permitted activity. No prior consent is needed — the regulators are informed, not asked."
                    : "The commitment sits outside the ceiling, or in a restricted sector. A Reserve Bank officer must be persuaded before a single rupee may leave."}
                </p>
                <p className="font-mono-ui tnum mt-5 text-[11px] uppercase tracking-[0.16em]">
                  Rail: {fmtClock(totalSeconds(r))} · Manual practice: {MANUAL_DAYS[r]} days ·{" "}
                  {stepsFor(r).length} steps
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="Routes desk" focus={["clearance", "rework", "headroom"]} />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Manual inputs — what a human must still supply" />
        <div className="grid gap-px bg-rule/15 lg:grid-cols-[1.35fr_1fr]">
          <div className="bg-background p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-3xl">The {route.toLowerCase()} route intake</h2>
              <div className="flex gap-px bg-rule/20">
                {(["automated", "manual"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={`font-mono-ui px-3 py-2 text-[10px] uppercase tracking-[0.14em] ${
                      mode === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                    }`}
                  >
                    {m === "automated" ? "Automated rail" : "Manual practice"}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The rail never invents a fact. These are the only fields a person types; everything else is
              derived, cited and proved by the system.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {inputs.map((s) => {
                const f = s.input!;
                if (f.key === "entity") {
                  return (
                    <label key={f.key} className="block">
                      <span className="font-mono-ui block text-[9px] uppercase tracking-[0.16em] text-primary">
                        Indian party (entity name) — top 1,000 NSE / BSE listed
                      </span>
                      <CompanyPicker
                        value={fields["entity"] ?? ""}
                        onChange={(name) => setFields((v) => ({ ...v, entity: name }))}
                        className="mt-1.5"
                      />
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Search by name, filter by sector, or use quick match chips. Selecting a filer fills the net worth field below.
                      </span>
                    </label>
                  );
                }
                if (f.key === "hub") {
                  return (
                    <div key={f.key} className="grid gap-4">
                      <label className="block">
                        <span className="font-mono-ui block text-[9px] uppercase tracking-[0.16em] text-primary">
                          Target financial hub — 52 global + 10 African corridors
                        </span>
                        <select
                          value={fields["hub"] ?? ""}
                          onChange={(e) => setFields((v) => ({ ...v, hub: e.target.value }))}
                          className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                        >
                          <option value="">Select the hub…</option>
                          <HubOptions />
                        </select>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {hub
                            ? `${hub.country} · ${hubMeta?.currency ?? "—"} · treaty ${hub.treaty} · withholding ${hub.wht}`
                            : f.hint}
                        </span>
                      </label>
                      <label className="block">
                        <span className="font-mono-ui block text-[9px] uppercase tracking-[0.16em] text-primary">
                          Overseas beneficiary bank — top 15 in {hub ? hub.country : "the hub"}
                        </span>
                        <select
                          value={overseasBank}
                          onChange={(e) => setFields((v) => ({ ...v, obank: e.target.value }))}
                          disabled={!hub}
                          className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                        >
                          <option value="">{hub ? "Select the receiving bank…" : "Select a hub first"}</option>
                          {overseasBanks.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          The account that will actually be credited in {hub ? hub.city : "the hub"}.
                        </span>
                      </label>
                    </div>
                  );
                }
                if (f.key === "adbank") {
                  return (
                    <label key={f.key} className="block">
                      <span className="font-mono-ui block text-[9px] uppercase tracking-[0.16em] text-primary">
                        AD Category-I bank — top 15 authorised dealers
                      </span>
                      <select
                        value={fields["adbank"] ?? ""}
                        onChange={(e) => setFields((v) => ({ ...v, adbank: e.target.value }))}
                        className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                      >
                        <option value="">Select the authorised dealer…</option>
                        {AD_BANKS.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name} · {b.licence}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {adBank
                          ? `${adBank.swift} · ${adBank.giftBranch ? "GIFT IFSC banking unit" : "no GIFT unit — domestic branch rail"} — ${adBank.note}`
                          : f.hint}
                      </span>
                    </label>
                  );
                }
                if (f.key === "networth") {
                  return (
                    <label key={f.key} className="block">
                      <span className="font-mono-ui block text-[9px] uppercase tracking-[0.16em] text-primary">
                        Audited net worth (INR crore) — {NETWORTH_FY}
                      </span>
                      <input
                        type="number"
                        value={fields["networth"] ?? ""}
                        onChange={(e) => setFields((v) => ({ ...v, networth: e.target.value }))}
                        className="tnum mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                      />
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {filer
                          ? `${filer.balanceSheet ? "Filled from the filed 31 Mar 2026 balance sheet" : "Illustrative figure (no filed balance sheet loaded)"} for ${filer.name}. Rule 7 ceiling ₹${filer.ceiling.toLocaleString("en-IN")} crore.`
                          : f.hint}
                      </span>
                    </label>
                  );
                }
                if (f.key === "justification") {
                  const list = purposesFor(investClass);
                  return (
                    <div key={f.key} className="grid gap-4 sm:col-span-2">
                      <div>
                        <span className="font-mono-ui block text-[9px] uppercase tracking-[0.16em] text-primary">
                          Justification for the approval-route exposure — investment class
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {(["ODI", "OPI"] as InvestmentClass[]).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setInvestClass(c);
                                setFields((v) => ({ ...v, purpose: "", justification: "" }));
                              }}
                              aria-pressed={investClass === c}
                              className={`font-mono-ui border px-4 py-2 text-[10px] uppercase tracking-[0.16em] ${
                                investClass === c
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-rule/30 text-muted-foreground hover:border-primary hover:text-primary"
                              }`}
                            >
                              {CLASS_META[c].title}
                            </button>
                          ))}
                        </div>
                        <span className="mt-1 block text-xs text-muted-foreground">{classMeta.rule}</span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="font-mono-ui block text-[9px] uppercase tracking-[0.16em] text-primary">
                            {investClass} reason — top 100 permitted purposes
                          </span>
                          <select
                            value={fields["purpose"] ?? ""}
                            onChange={(e) => {
                              const p = findPurpose(e.target.value);
                              setFields((v) => ({
                                ...v,
                                purpose: e.target.value,
                                justification: p ? `${p.code} · ${p.label} — ${p.basis}` : "",
                              }));
                            }}
                            className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                          >
                            <option value="">Select why the money is going abroad…</option>
                            {list.map((p, i) => (
                              <option key={p.code} value={p.code}>
                                {String(i + 1).padStart(3, "0")} · {p.label}
                              </option>
                            ))}
                          </select>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {purpose ? purpose.basis : `${list.length} reasons, each mapped to its rule in the Overseas Investment Rules 2022.`}
                          </span>
                        </label>

                        <label className="block">
                          <span className="font-mono-ui block text-[9px] uppercase tracking-[0.16em] text-primary">
                            Board note supporting the excess commitment
                          </span>
                          <textarea
                            rows={3}
                            value={fields["justification"] ?? ""}
                            onChange={(e) => setFields((v) => ({ ...v, justification: e.target.value }))}
                            className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                          />
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Pre-filled from the selected purpose. Edit freely — the RBI Overseas Investment Division reads this line.
                          </span>
                        </label>
                      </div>

                      <div className="border-l-2 border-primary bg-secondary/30 p-4">
                        <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
                          Why this class, and what it does to the limit
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {classMeta.note}{" "}
                          {purpose
                            ? `Selected purpose ${purpose.code}: ${purpose.plain} Statutory basis: ${purpose.basis}.`
                            : "Select a purpose above and the rail will state the statutory basis and the plain-words reason a regulator reads."}
                          {filer && investClass === "OPI"
                            ? ` The portfolio cap for ${filer.name} is 50% of ₹${filer.netWorth.toLocaleString("en-IN")} crore, or ₹${Math.round(opiCap).toLocaleString("en-IN")} crore${opiBreach ? ` — this ₹${amountCr.toLocaleString("en-IN")} crore proposal exceeds it, which is exactly why it sits on the approval route.` : "; this proposal sits inside it."}`
                            : ""}
                          {filer && investClass === "ODI"
                            ? ` The direct-investment ceiling for ${filer.name} is 400% of net worth, or ₹${filer.ceiling.toLocaleString("en-IN")} crore, of which ₹${filer.used.toLocaleString("en-IN")} crore is already committed.`
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                }
                return (
                  <label key={f.key} className="block">
                    <span className="font-mono-ui block text-[9px] uppercase tracking-[0.16em] text-primary">
                      {f.label}
                    </span>
                    {f.kind === "select" ? (
                      <select
                        value={fields[f.key] ?? ""}
                        onChange={(e) => setFields((v) => ({ ...v, [f.key]: e.target.value }))}
                        className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                      >
                        <option value="">Select…</option>
                        {f.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.kind === "number" ? "number" : "text"}
                        value={fields[f.key] ?? ""}
                        onChange={(e) => setFields((v) => ({ ...v, [f.key]: e.target.value }))}
                        className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                      />
                    )}
                    <span className="mt-1 block text-xs text-muted-foreground">{f.hint}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-6 border-l-2 border-primary bg-secondary/30 p-4">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
                How this audited net worth is calculated, and for which year
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {filer
                  ? networthNote(filer)
                  : `Select an Indian party above and the desk will state its audited net worth for ${NETWORTH_FY}, show the exact build-up — paid-up share capital plus free reserves and securities premium, less accumulated losses, deferred revenue expenditure and miscellaneous expenditure not written off, with revaluation reserves excluded — and derive the Rule 7 ceiling of 400% of that figure.`}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setElapsed(0);
                  setRunning(true);
                }}
                className="font-mono-ui border border-primary bg-primary px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-primary-foreground"
              >
                Execute the {route.toLowerCase()} route
              </button>
              <button
                type="button"
                onClick={() => {
                  setRunning(false);
                  setElapsed(0);
                }}
                className="font-mono-ui border border-rule/30 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Reset
              </button>
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {missing.length === 0
                  ? "All manual inputs supplied"
                  : `${missing.length} manual input${missing.length > 1 ? "s" : ""} outstanding — the rail will run in demonstration mode`}
              </span>
            </div>
          </div>

          <div className="bg-background p-6">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
              Rail clock
            </p>
            <p className="font-display tnum mt-3 text-6xl text-primary">{fmtClock(elapsed)}</p>
            <p className="font-mono-ui tnum mt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              of {fmtClock(total)} total · target under 9m 00s
            </p>
            <div className="mt-5 h-2 w-full bg-secondary" role="img" aria-label={`${Math.round((elapsed / total) * 100)} percent complete`}>
              <div className="h-2 bg-primary" style={{ width: `${(elapsed / total) * 100}%` }} />
            </div>
            <dl className="mt-6 divide-y divide-rule/12">
              {[
                ["Steps cleared", `${bounds.filter((b) => elapsed >= b.end).length} / ${steps.length}`],
                ["Currently executing", running ? steps[activeIndex]!.title : elapsed >= total ? "Complete" : "Idle"],
                ["Manual practice", `${MANUAL_DAYS[route]} days across five parties`],
                ["Time saved", `${MANUAL_DAYS[route]} days → ${fmtClock(total)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="tnum text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Execution theatre — where the money actually goes" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display max-w-4xl text-5xl lg:text-6xl">
            Press execute and watch the rupees leave India.
          </h2>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
            {running ? "Settling live" : elapsed >= total ? "Settled" : "Awaiting execution"}
          </p>
        </div>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          The corridor below is the real path of the money on the {route.toLowerCase()} route:
          the Indian party's rupee account, the AD Category-I bank that is legally the only door out
          of India, the GIFT IFSC rail the six regulators read,{" "}
          {route === "Approval"
            ? "the RBI Overseas Investment Division that sanctions the excess commitment, "
            : ""}
          the correspondent bank that converts
          the rupees, and the overseas bank account that is finally credited.
        </p>

        <div className="mt-8 grid gap-px bg-rule/15 xl:grid-cols-[1.4fr_1fr]">
          <div className="bg-background">
            <MoneyFlow3D
              progress={total ? elapsed / total : 0}
              running={running}
              nodes={flowNodes}
              legIndex={legIndex}
              amountLabel={amountCr ? `₹${amountCr.toLocaleString("en-IN")} cr` : "₹— cr"}
              creditLabel={
                amountCr && hubMeta
                  ? `${hubMeta.currency} equivalent of ₹${Math.round(netCr).toLocaleString("en-IN")} cr`
                  : "select hub and amount"
              }
            />
          </div>
          <div className="bg-background p-6">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
              What is happening on each leg
            </p>
            <ol className="mt-4 divide-y divide-rule/12">
              {[
                {
                  t: `Debit at ${filer ? filer.name : "the Indian party"}`,
                  d: `The rupee account is debited against a board resolution. Rule 7 test: ₹${(filer?.used ?? 0).toLocaleString("en-IN")} cr already committed plus ₹${amountCr.toLocaleString("en-IN")} cr proposed against a ceiling of ₹${ceiling.toLocaleString("en-IN")} cr — ${utilisation ? `${utilisation.toFixed(1)}% used` : "select a filer"}${withinCeiling ? ", inside the ceiling" : ", ceiling breached — approval route"}.`,
                },
                {
                  t: `${adBank ? adBank.name : "AD Category-I bank"} certifies and books`,
                  d: `Form A2 is lodged, Form 15CA/15CB are paired, the ODI unique identification number is drawn and the FEMA declaration is signed. ${adBank ? `Settlement runs on ${adBank.swift}${adBank.giftBranch ? " through its GIFT IFSC banking unit" : " through its domestic treasury branch"}.` : "No Indian rupee may leave the country except through such a bank."}`,
                },
                {
                  t: "GIFT IFSC rail — six regulators on one record",
                  d: "The signed packet is written once to the append-only ledger. RBI, IFSCA, SEBI, CBDT, Customs/DGFT and the FIU read the same line in parallel while the transaction is still forming.",
                },
                ...(route === "Approval"
                  ? [
                      {
                        t: "RBI Overseas Investment Division sanctions the excess",
                        d: `The approval route opens because the commitment sits beyond the ordinary limit. The Division reads the board note — ${purpose ? `${purpose.code} · ${purpose.label}` : "the justification selected above"} — against ${classMeta.title}, tests repayment capacity and policy fit, and records the sanction on the same ledger line rather than in a separate letter.`,
                      },
                    ]
                  : []),
                {
                  t: "Correspondent conversion and withholding",
                  d: `No generic treaty withholding is deducted from ₹${Math.round(netCr).toLocaleString("en-IN")} cr of investment principal. Separately chargeable income requires country-, payment- and eligibility-specific review; bank charges are assessed separately before conversion into ${hubMeta ? hubMeta.currency : "the hub currency"}.`,
                },
                {
                  t: `Credit at ${overseasBank || "the overseas bank"}`,
                  d: `${overseasBank || "The receiving bank"} in ${hub ? `${hub.city}, ${hub.country}` : "the hub"} credits the overseas entity's account and returns the SWIFT confirmation, which is written back to the same ledger line as proof of arrival. Manual practice for this corridor: ${hub ? hub.days : MANUAL_DAYS[route]} days.`,
                },
              ].map((leg, i) => {
                const st = legIndex > i ? "cleared" : legIndex === i && (running || elapsed > 0) ? "running" : "queued";
                return (
                  <li key={leg.t} className="py-3">
                    <div className="flex items-start gap-3">
                      <span className="font-mono-ui tnum mt-0.5 w-6 shrink-0 text-[10px] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{leg.t}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{leg.d}</p>
                      </div>
                      <span
                        className={`font-mono-ui mt-0.5 shrink-0 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${
                          st === "cleared"
                            ? "bg-primary text-primary-foreground"
                            : st === "running"
                              ? "border border-primary text-primary"
                              : "border border-rule/25 text-muted-foreground"
                        }`}
                      >
                        {st}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
              In plain words: money never teleports abroad. It moves from your bank account, through an
              Indian bank licensed to send it out, past the regulators who must be able to see it, into a
              named bank account overseas. The rail does not change that path — it removes the waiting
              between each leg.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Regulator approval console — six desks, one ledger line" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display max-w-4xl text-5xl lg:text-6xl">
            Every regulator signs its own queue, at the same second.
          </h2>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
            {quorumClock > 0
              ? `Dispatched · T+${quorumClock.toFixed(0)}s`
              : "Awaiting dispatch from the AD bank"}
          </p>
        </div>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          The moment the AD Category-I bank dispatches the signed packet, all six authorities attach to
          the same append-only line. Pick a desk from the dropdown to open its automated work queue —
          each item shows the statute behind it, the seconds it takes, and whether the engine clears it
          or a named officer must sign.
        </p>
        <div className="mt-8">
          <RegulatorConsole
            route={route}
            elapsed={quorumClock}
            running={running && quorumClock > 0}
            focus={regFocus}
            onFocus={setRegFocus}
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Step by step — under nine minutes" />
        <div className="grid gap-px bg-rule/15 lg:grid-cols-[1fr_1.1fr]">
          <div className="bg-background">
            <ol className="divide-y divide-rule/12">
              {steps.map((s, i) => {
                const st = stateOf(i);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setOpenStep(i)}
                      aria-current={i === openStep}
                      className={`flex w-full items-start gap-4 px-5 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
                        i === openStep ? "bg-secondary" : "hover:bg-secondary/40"
                      }`}
                    >
                      <span className="font-mono-ui tnum mt-0.5 w-6 shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-snug">{s.title}</span>
                        <span className="font-mono-ui mt-1 block text-[9px] uppercase tracking-[0.14em] text-primary">
                          {s.actor} · {s.seconds[route]}s
                          {s.input ? " · manual input" : ""}
                        </span>
                      </span>
                      <span
                        className={`font-mono-ui mt-0.5 shrink-0 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${
                          st === "cleared"
                            ? "bg-primary text-primary-foreground"
                            : st === "running"
                              ? "border border-primary text-primary"
                              : "border border-rule/25 text-muted-foreground"
                        }`}
                      >
                        {st}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="bg-background p-6">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
              Step {String(openStep + 1).padStart(2, "0")} — {detail.actor}
            </p>
            <h3 className="font-display mt-2 text-4xl leading-tight">{detail.title}</h3>
            <div className="mt-5 grid gap-px bg-rule/15 sm:grid-cols-2">
              <div className="bg-background p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
                  On the automated rail
                </p>
                <p className="mt-2 text-sm leading-relaxed">{detail.automated}</p>
              </div>
              <div className="bg-background p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  In manual practice today
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail.manual}</p>
              </div>
            </div>
            <dl className="mt-5 divide-y divide-rule/12">
              {[
                ["Statutory basis", detail.basis],
                ["Evidence produced", detail.evidence],
                ["Time on this route", `${detail.seconds[route]} seconds`],
                ["Manual input required", detail.input ? detail.input.label : "None — derived by the rail"],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[170px_1fr] sm:gap-4">
                  <dt className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    {k}
                  </dt>
                  <dd className="text-sm leading-relaxed">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
              In plain words: {detail.plain}
            </p>

            <StepEvidence
              route={route}
              stepId={detail.id}
              status={(k) => evidence.state[k] ?? "Outstanding"}
              onSet={evidence.set}
              can={(item, status) => guard({ stepId: detail.id, reviewer: item.reviewer }, status)}
              roleLabel={session ? ROLE_LABEL[session.role] : "no desk identity"}
            />

            <div className="mt-6">
              <PermissionMatrix
                config={perms.config}
                isAdmin={perms.isAdmin}
                stepId={detail.id}
                stepTitle={detail.title}
                onToggle={perms.setRoleStatuses}
                onScope={perms.setScope}
                onClearStep={perms.clearStepOverride}
                onReset={perms.resetAll}
              />
            </div>

            <div className="mt-6">
              <GapMatrix
                route={route}
                gaps={evidence.gaps}
                items={evidence.items}
                onReset={evidence.reset}
              />
            </div>

            <div className="mt-6">
              <ProgressImport route={route} items={evidence.items} onApply={evidence.applyImport} />
            </div>

            <div className="mt-6">
              <EvidenceAudit entries={evidence.audit} route={route} onClear={evidence.clearAudit} />
            </div>

            <div className="mt-6 border border-rule/20 p-4">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                Hear this step — 38+ languages
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <LanguagePicker value={language} onChange={setLanguage} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void narrator.speak(
                        narrationFor(route, detail, openStep, steps.length),
                        language,
                      )
                    }
                    className="font-mono-ui border border-primary bg-primary px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-primary-foreground"
                  >
                    {narrator.status === "preparing"
                      ? "Preparing…"
                      : narrator.status === "speaking"
                        ? "Speaking…"
                        : "Play narration"}
                  </button>
                  <button
                    type="button"
                    onClick={narrator.stop}
                    className="font-mono-ui border border-rule/30 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    Stop
                  </button>
                </div>
              </div>
              {narrator.error ? (
                <p className="mt-2 text-xs text-primary">Narration unavailable: {narrator.error}</p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  The script is translated and spoken live, so a regulator in Zurich, Delhi or Tokyo hears
                  the same statutory explanation in their own language.
                </p>
              )}

              <div className="mt-4 border-t border-rule/20 pt-4">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                  Download the full transcript — {route} route
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Every step of this route, in {language}. TXT and DOCX carry the readable script; CSV and
                  JSON are machine-readable, with statutory basis, per-step seconds and cumulative rail time
                  on every row.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void exportTranscript("txt")}
                    disabled={exporting !== null}
                    className="font-mono-ui border border-rule/30 px-3 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    {exporting === "txt" ? "Preparing…" : "Transcript · TXT"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportTranscript("docx")}
                    disabled={exporting !== null}
                    className="font-mono-ui border border-primary bg-primary px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-50"
                  >
                    {exporting === "docx" ? "Preparing…" : "Transcript · DOCX"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportTranscript("csv")}
                    disabled={exporting !== null}
                    className="font-mono-ui border border-rule/30 px-3 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    {exporting === "csv" ? "Preparing…" : "Timings · CSV"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportTranscript("json")}
                    disabled={exporting !== null}
                    className="font-mono-ui border border-rule/30 px-3 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    {exporting === "json" ? "Preparing…" : "Timings · JSON"}
                  </button>
                </div>
                {exportError ? (
                  <p className="mt-2 text-xs text-primary">Transcript unavailable: {exportError}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="What each regulator actually does" />
        <h2 className="font-display mb-3 max-w-4xl text-5xl lg:text-6xl">
          Six authorities. Two different jobs.
        </h2>
        <p className="mb-8 max-w-3xl text-base leading-relaxed text-muted-foreground">
          On the Automatic route the regulators verify and record. On the Approval route one of them —
          the Reserve Bank — adjudicates, and the others advise it. Read the last two columns to see
          exactly which part of that work is still done by a human hand.
        </p>
        <div className="hidden grid-cols-[190px_1fr_1fr_1fr] gap-4 border-b border-rule/20 px-5 py-3 font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground lg:grid">
          <span>Authority and scope</span>
          <span>On the Automatic route</span>
          <span>On the Approval route</span>
          <span>Human act vs machine act</span>
        </div>
        <div className="divide-y divide-rule/12 border-b border-rule/20">
          {REGULATOR_ACTIONS.map((r) => (
            <div key={r.code} className="grid gap-4 px-5 py-5 lg:grid-cols-[190px_1fr_1fr_1fr]">
              <div>
                <p className="font-display text-2xl text-primary">{r.code}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.name}</p>
                <p className="font-mono-ui mt-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  {r.scope}
                </p>
              </div>
              <p className="text-sm leading-relaxed">{r.automatic}</p>
              <p className="text-sm leading-relaxed">{r.approval}</p>
              <div className="space-y-2">
                <p className="text-sm leading-relaxed">
                  <span className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Human ·{" "}
                  </span>
                  {r.manualAct}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-primary">
                    Machine ·{" "}
                  </span>
                  {r.automatedAct}
                </p>
                <p className="font-mono-ui tnum text-[9px] uppercase tracking-[0.14em] text-primary">
                  {r.seconds}s inside the window
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-3xl border-l-2 border-primary pl-4 text-base leading-relaxed">
          All six read one signed dossier at the same instant. Nothing is re-keyed, nothing is posted
          onward, and every clearance is a hash-chained receipt a supervisor can verify later.
        </p>
      </section>
      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Continue on the rail" />
        <div className="mb-10">
          <DeskProcess3D desk="routes" />
        </div>
        <EngineRail desk="routes" />
      </section>
    </Frame>
  );
}
