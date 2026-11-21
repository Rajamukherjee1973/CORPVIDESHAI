import { ForecastLede } from "@/components/site/ForecastLede";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { AdBankTicker } from "@/components/site/AdBankTicker";
import { DeskGate } from "@/components/site/Gate";
import { useSession } from "@/lib/session";
import { COMPANIES } from "@/data/companies";
import { HUBS } from "@/data/hubs";
import { COUNTRY_META, flag } from "@/data/currencies";
import { toast } from "sonner";
import { EmailOutbox, NotificationFeed } from "@/components/site/Notifications";
import { AuditLog } from "@/components/site/Audit";
import { DocChecklist } from "@/components/site/DocChecklist";
import { AuditConsole } from "@/components/site/AuditConsole";
import { ChainSyncPanel } from "@/components/site/ChainSync";
import { RegTimeline } from "@/components/site/RegTimeline";
import { UNIVERSES, UNIVERSE_KEYS, findCompany, type UniverseKey } from "@/data/universes";
import { logActivity, useActivity } from "@/lib/activity";
import { useLiveCheckpoints } from "@/lib/live";
import {
  CLEARERS,
  DOCS_APPROVAL,
  DOCS_AUTO,
  PORTAL_STAGES,
  REGULATORS,
  TOTAL_SECONDS,
  hash,
  loadApplications,
  progressFor,
  saveOwnApplications,
  stageProgress,
  type PortalApplication,
} from "@/lib/portal";

const TITLE = "Corporate Portal — File and Track an Outbound Application | CorpVidesh AI";
const DESC =
  "Submit the route and documentation for a listed Indian entity and track the filing end to end: Rule 7 determination, six-regulator parallel clearance, UIN allotment, settlement and the evidence ledger, live.";

export const Route = createFileRoute("/portal")({
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
  component: PortalPage,
});

const CR = 1_00_00_000;
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function PortalPage() {
  const { session, ready: sessionReady } = useSession();
  const mine = session?.role === "corporate" ? session : null;
  const [apps, setApps] = useState<PortalApplication[]>([]);
  const [activeRef, setActiveRef] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [lookup, setLookup] = useState("");
  const [lookupMsg, setLookupMsg] = useState("");
  const trackRef = useRef<HTMLDivElement>(null);
  const { notifications, unread, markAllRead, dropRef } = useLiveCheckpoints(apps, now, { desk: "corporate" });
  const activity = useActivity(session);

  // form state
  const [universe, setUniverse] = useState<UniverseKey>("NSE");
  const [companyName, setCompanyName] = useState(UNIVERSES.NSE.list[0]!.name);
  const [filingQuery, setFilingQuery] = useState("");
  const [filingStatus, setFilingStatus] = useState("ALL");
  const [filingHub, setFilingHub] = useState("ALL");
  const [filingStage, setFilingStage] = useState("ALL");
  const [hubCity, setHubCity] = useState("Singapore");
  const [amountCr, setAmountCr] = useState(1240);
  const [contact, setContact] = useState("Group Treasurer");
  const [email, setEmail] = useState("treasury@entity.co.in");
  const [routeChoice, setRouteChoice] = useState<"Auto" | "Automatic" | "Approval">("Auto");
  const [files, setFiles] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = loadApplications().filter((a) => a.ownerId === mine?.id);
    setApps(stored);
    setActiveRef(stored[0]?.ref ?? null);
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [mine?.id]);

  // The signatory on file is the signed-in desk, not a free-text guess.
  useEffect(() => {
    if (!mine) return;
    setCompanyName(mine.company);
    setContact(mine.contact);
    setEmail(mine.email);
  }, [mine?.id]);

  const company =
    UNIVERSES[universe].list.find((c) => c.name === companyName) ??
    findCompany(companyName) ??
    UNIVERSES[universe].list[0]!;
  const hub = HUBS.find((h) => h.city === hubCity) ?? HUBS[0]!;
  const meta = COUNTRY_META[hub.country] ?? { iso2: "UN", currency: "USD", currencyName: "US Dollar" };

  const headroomAfter = company.ceiling - company.used - amountCr;
  const breach = headroomAfter < 0;
  const restricted = company.route === "Approval" && company.headroom > 0;
  const determined: "Automatic" | "Approval" = breach || restricted ? "Approval" : "Automatic";
  const route = routeChoice === "Auto" ? determined : routeChoice;
  const mismatch = route !== determined;
  const routeBasis = breach
    ? "Commitment exceeds the 400% ceiling under Rule 7"
    : restricted
      ? "Sector condition forces prior approval"
      : "Inside the Rule 7 ceiling, unrestricted sector";

  const docs = useMemo(
    () => (route === "Approval" ? [...DOCS_AUTO, ...DOCS_APPROVAL] : DOCS_AUTO),
    [route],
  );
  const attached = docs.filter(([d]) => files[d]).length;
  const ready = attached === docs.length && !mismatch;

  const active = apps.find((a) => a.ref === activeRef) ?? null;

  // Advanced filing search — role scoping already limits `apps` to this desk.
  const visibleApps = apps.filter((a) => {
    const q = filingQuery.trim().toLowerCase();
    if (q && !`${a.company} ${a.hub} ${a.country} ${a.ref}`.toLowerCase().includes(q)) return false;
    if (filingHub !== "ALL" && a.hub !== filingHub) return false;
    const p = now ? progressFor(a, now) : null;
    if (filingStatus === "Cleared" && !p?.complete) return false;
    if (filingStatus === "In progress" && p?.complete) return false;
    if ((filingStatus === "Automatic" || filingStatus === "Approval") && a.route !== filingStatus) return false;
    if (filingStage !== "ALL") {
      const idx = PORTAL_STAGES.findIndex((s) => s.key === filingStage);
      if (!p || p.states[idx] === "queued") return false;
    }
    return true;
  });

  function submit() {
    const ref = `CV-${new Date().getFullYear()}-${hash(company.name + hub.city + amountCr + Date.now())
      .slice(0, 8)
      .toUpperCase()}`;
    const app: PortalApplication = {
      ref,
      company: company.name,
      sector: company.sector,
      hub: hub.city,
      country: hub.country,
      amountCr,
      route,
      routeBasis,
      netWorth: company.netWorth,
      ceiling: company.ceiling,
      headroomAfter,
      contact,
      email,
      documents: docs.map(([name, source]) => ({ name, source, file: files[name] ?? "attached.pdf" })),
      createdAt: Date.now(),
      ownerId: mine?.id ?? "",
    };
    const next = [app, ...apps];
    setApps(next);
    saveOwnApplications(mine?.id, next);
    setActiveRef(ref);
    setFiles({});
    setNow(Date.now());
    logActivity(session, {
      ref,
      company: company.name,
      action: "Filing submitted",
      detail: `${route} route to ${hub.city} for ₹${amountCr.toLocaleString("en-IN")} Cr, ${docs.length} documents attached.`,
      page: "/portal",
      ownerId: mine?.id ?? "",
    });
    window.setTimeout(() => trackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  function withdraw(ref: string) {
    dropRef(ref);
    const gone = apps.find((a) => a.ref === ref);
    logActivity(session, {
      ref,
      company: gone?.company ?? "",
      action: "Filing withdrawn",
      detail: "Treasury withdrew the filing from the clearance rail.",
      page: "/portal",
      ownerId: mine?.id ?? "",
    });
    const next = apps.filter((a) => a.ref !== ref);
    setApps(next);
    saveOwnApplications(mine?.id, next);
    if (activeRef === ref) setActiveRef(next[0]?.ref ?? null);
  }

  function runLookup() {
    const found = apps.find((a) => a.ref.toLowerCase() === lookup.trim().toLowerCase());
    if (found) {
      setActiveRef(found.ref);
      setLookupMsg("");
      trackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setLookupMsg("No filing on this desk carries that reference.");
    }
  }

  const prog = active && now ? progressFor(active, now) : null;

  if (sessionReady && !mine) {
    return (
      <DeskGate
        desk="The corporate application desk is for treasury users."
        need="Only a signed-in corporate treasury can register a filing or read its progress. Regulator officers work the approvals queue instead — a company's file is never open to another desk."
        holding={session?.role === "regulator" ? `${session.code} · ${session.officer}` : null}
      />
    );
  }

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pt-16">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">
          Corporate portal — file and track
        </p>
        <h1 className="font-display mt-4 max-w-4xl text-5xl leading-[1.02] md:text-7xl">
          Submit the route and the documents for your entity. Watch the file clear, live.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          This is the treasury-side desk. Register the filing, confirm the route the law gives you, attach each
          annexure against the statute that demands it, and then follow the ticket through all ten stages as they
          clear in real time. Filings stay on this device under their reference, so you can leave and come back.
        </p>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">In plain words — </span>
          this is the online counter where a company hands in its paperwork to send money abroad, and a tracking
          screen that shows exactly where the file has reached, like parcel tracking.
        </p>
        <div className="mt-8">
          <AdBankTicker apps={apps} now={now} />
          <div className="mt-6">
            <div className="mb-10">
              <DeskProcess3D desk="corporate" />
            </div>
            <EngineRail desk="corporate" session={session} activeRef={apps[0]?.ref ?? null} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Your AD Category-I bank is working the file above. The supervisory side of the same
            filing — including who must sign an Approval-route case — is on the{" "}
            <Link to="/regulator" search={{ ref: undefined }} className="text-primary underline underline-offset-4">
              Regulator Approval desk
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="Filing portal" focus={["clearance", "rework"]} />
      </section>

      {/* Step 1 */}
      <section className="mx-auto mt-14 max-w-[1400px] px-6">
        <Rule label="Step 1 — register the filing" />
        <div className="grid gap-px border border-rule/25 bg-rule/15 lg:grid-cols-3">
          <Field label="Company universe">
            <select
              value={universe}
              onChange={(e) => {
                const key = e.target.value as UniverseKey;
                setUniverse(key);
                setCompanyName(UNIVERSES[key].list[0]!.name);
              }}
              className="w-full bg-transparent text-lg outline-none"
            >
              {UNIVERSE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {UNIVERSES[k].label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">{UNIVERSES[universe].basis}</p>
          </Field>
          <Field label={`Indian party (${UNIVERSES[universe].list.length} entities in this universe)`}>
            <select
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-transparent text-lg outline-none"
            >
              {UNIVERSES[universe].list.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.rank}. {c.name}
                  {universe === "UNLISTED" && c.turnover
                    ? ` — turnover ₹${c.turnover.toLocaleString("en-IN")} Cr`
                    : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Target hub (${HUBS.length} centres)`}>
            <select
              value={hubCity}
              onChange={(e) => setHubCity(e.target.value)}
              className="w-full bg-transparent text-lg outline-none"
            >
              {HUBS.map((h) => (
                <option key={h.city} value={h.city}>
                  {flag(COUNTRY_META[h.country]?.iso2 ?? "UN")} {h.city} — {h.country}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount to be sent abroad (INR crore)">
            <input
              type="number"
              min={0}
              value={amountCr}
              onChange={(e) => setAmountCr(Math.max(0, Number(e.target.value) || 0))}
              className="tnum w-full bg-transparent text-lg outline-none"
            />
          </Field>
          <Field label="Authorised signatory">
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full bg-transparent text-lg outline-none"
            />
          </Field>
          <Field label="Notification address">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-lg outline-none"
            />
          </Field>
          <Field label="Route submitted">
            <select
              value={routeChoice}
              onChange={(e) => setRouteChoice(e.target.value as typeof routeChoice)}
              className="w-full bg-transparent text-lg outline-none"
            >
              <option value="Auto">Use the determined route ({determined})</option>
              <option value="Automatic">Automatic route</option>
              <option value="Approval">Approval route</option>
            </select>
            <p className={`mt-1 text-xs ${mismatch ? "text-primary" : "text-muted-foreground"}`}>
              {mismatch
                ? `The statute gives the ${determined.toLowerCase()} route here — correct the selection before filing.`
                : routeBasis}
            </p>
          </Field>
        </div>

        <div className="mt-px grid gap-px bg-rule/15 md:grid-cols-4">
          <Stat k="Audited net worth" v={`${inr(company.netWorth)} Cr`} />
          <Stat k="400% ceiling (Rule 7)" v={`${inr(company.ceiling)} Cr`} />
          <Stat k="Headroom after this filing" v={`${inr(headroomAfter)} Cr`} />
          <Stat k="Value leaving India" v={`${inr(amountCr * CR)} · ${meta.currency}`} />
        </div>
      </section>

      {/* Step 2 */}
      <section className="mx-auto mt-16 max-w-[1400px] px-6">
        <Rule label="Step 2 — documentation for the submitted route" />
        <div className="mb-px">
          <DocChecklist route={route} files={files} />
        </div>
        <div className="grid gap-px bg-rule/15 lg:grid-cols-[2fr_1fr]">
          <div className="bg-background">
            {docs.map(([d, src]) => (
              <div key={d} className="flex flex-wrap items-center justify-between gap-4 border-b border-rule/10 px-6 py-4">
                <span>
                  <span className="block text-base">{d}</span>
                  <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">{src}</span>
                </span>
                <span className="flex items-center gap-3">
                  {files[d] ? (
                    <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">
                      {files[d]}
                    </span>
                  ) : null}
                  <label className="font-mono-ui cursor-pointer border border-rule/25 px-3 py-2 text-[10px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary">
                    {files[d] ? "Replace" : "Attach"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setFiles((p) => ({ ...p, [d]: f ? f.name : "annexure.pdf" }));
                      }}
                    />
                  </label>
                </span>
              </div>
            ))}
          </div>
          <div className="bg-background p-6">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Filing readiness
            </p>
            <p className="tnum font-display mt-2 text-6xl">
              {attached}/{docs.length}
            </p>
            <div className="mt-4 h-2 w-full bg-secondary">
              <div className="h-2 bg-primary transition-all" style={{ width: `${(attached / docs.length) * 100}%` }} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  setFiles(Object.fromEntries(docs.map(([d], i) => [d, `annexure-${String(i + 1).padStart(2, "0")}.pdf`])))
                }
                className="font-mono-ui border border-rule/25 px-3 py-2 text-[11px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
              >
                Attach sample set
              </button>
              <button
                onClick={() => setFiles({})}
                className="font-mono-ui border border-rule/25 px-3 py-2 text-[11px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
              >
                Clear
              </button>
            </div>
            <button
              disabled={!ready}
              onClick={submit}
              className="font-mono-ui mt-6 w-full bg-primary px-4 py-4 text-[12px] uppercase tracking-[0.18em] text-primary-foreground disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
            >
              File {route.toLowerCase()}-route application
            </button>
            {active ? (
              <Link
                to="/processing"
                search={{ ref: active.ref }}
                className="font-mono-ui mt-px block w-full border border-primary px-4 py-3.5 text-center text-[11px] uppercase tracking-[0.16em] text-primary"
              >
                See {active.ref} being processed at the AD bank and regulators
              </Link>
            ) : null}
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">In plain words — </span>
              the counter only accepts a complete file on the correct route, because an incomplete or wrongly routed
              file is exactly what causes months of delay.
            </p>
          </div>
        </div>
      </section>

      {/* Step 3 — tracking */}
      <section ref={trackRef} className="mx-auto mt-16 max-w-[1400px] px-6">
        <Rule label="Step 3 — live status tracking" />
        <div className="grid gap-px bg-rule/15 lg:grid-cols-[1fr_2fr]">
          <div className="bg-background">
            <div className="border-b border-rule/10 p-6">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Track by reference
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={lookup}
                  onChange={(e) => setLookup(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runLookup()}
                  placeholder="CV-2026-XXXXXXXX"
                  className="font-mono-ui w-full border border-rule/25 px-3 py-2 text-[12px] uppercase tracking-[0.12em] outline-none focus:border-primary"
                />
                <button
                  onClick={runLookup}
                  className="font-mono-ui bg-primary px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-primary-foreground"
                >
                  Track
                </button>
              </div>
              {lookupMsg ? <p className="mt-2 text-xs text-primary">{lookupMsg}</p> : null}
            </div>
            <div className="grid gap-px border-b border-rule/10 bg-rule/15 sm:grid-cols-2">
              <div className="bg-background p-4">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Search</p>
                <input
                  value={filingQuery}
                  onChange={(e) => setFilingQuery(e.target.value)}
                  placeholder="company, hub or reference"
                  className="mt-1.5 w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="bg-background p-4">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                <select value={filingStatus} onChange={(e) => setFilingStatus(e.target.value)} className="mt-1.5 w-full bg-transparent text-sm outline-none">
                  <option value="ALL">Any status</option>
                  <option value="Cleared">Cleared</option>
                  <option value="In progress">In progress</option>
                  <option value="Automatic">Automatic route</option>
                  <option value="Approval">Approval route</option>
                </select>
              </div>
              <div className="bg-background p-4">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Hub</p>
                <select value={filingHub} onChange={(e) => setFilingHub(e.target.value)} className="mt-1.5 w-full bg-transparent text-sm outline-none">
                  <option value="ALL">All hubs</option>
                  {Array.from(new Set(apps.map((a) => a.hub))).sort().map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="bg-background p-4">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Current stage</p>
                <select value={filingStage} onChange={(e) => setFilingStage(e.target.value)} className="mt-1.5 w-full bg-transparent text-sm outline-none">
                  <option value="ALL">Any stage</option>
                  {PORTAL_STAGES.map((s, i) => (
                    <option key={s.key} value={s.key}>{String(i + 1).padStart(2, "0")} · {s.title}</option>
                  ))}
                </select>
              </div>
            </div>
            {visibleApps.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                {apps.length === 0
                  ? "No filings yet. Register one above and it will appear here with a live status."
                  : "No filing matches these filters. Clear the search, status, hub or stage to see the rest."}
              </p>
            ) : (
              visibleApps.map((a) => {
                const p = now ? progressFor(a, now) : null;
                return (
                  <button
                    key={a.ref}
                    onClick={() => setActiveRef(a.ref)}
                    className={`block w-full border-b border-rule/10 p-5 text-left transition-colors hover:bg-secondary ${
                      a.ref === activeRef ? "bg-secondary" : ""
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono-ui text-[11px] uppercase tracking-[0.14em] text-primary">{a.ref}</span>
                      <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {p ? (p.complete ? "Cleared" : `${p.percent.toFixed(0)}%`) : "—"}
                      </span>
                    </div>
                    <p className="mt-1 text-base leading-tight">{a.company}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.route} route · GIFT IFSC → {a.hub} · {inr(a.amountCr)} Cr
                    </p>
                    <div className="mt-3 h-1 w-full bg-secondary">
                      <div className="h-1 bg-primary transition-all" style={{ width: `${p?.percent ?? 0}%` }} />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="bg-background">
            {!active || !prog ? (
              <p className="p-6 text-sm text-muted-foreground">
                Select or file an application to open its live tracker.
              </p>
            ) : (
              <>
                <div className="grid gap-px bg-rule/15 md:grid-cols-4">
                  <Stat k="Reference" v={active.ref} />
                  <Stat k="Status" v={prog.complete ? "Cleared for settlement" : PORTAL_STAGES[prog.currentIndex]!.title} />
                  <Stat k="Elapsed" v={`${prog.elapsed.toFixed(1)} s`} />
                  <Stat k="Time remaining" v={prog.complete ? "—" : `${prog.etaSeconds.toFixed(0)} s`} />
                </div>
                <div className="h-2 w-full bg-secondary">
                  <div className="h-2 bg-primary transition-all" style={{ width: `${prog.percent}%` }} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/10 px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    {active.company} · {active.route} route · GIFT IFSC → {active.hub}, {active.country} ·{" "}
                    {inr(active.amountCr * CR)} · signatory {active.contact}
                  </p>
                  <button
                    onClick={() => withdraw(active.ref)}
                    className="font-mono-ui border border-rule/25 px-3 py-2 text-[10px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
                  >
                    Withdraw filing
                  </button>
                </div>

                <ol>
                  {PORTAL_STAGES.map((s, i) => {
                    const state = prog.states[i]!;
                    const frac = stageProgress(active, i, now);
                    return (
                      <li
                        key={s.key}
                        className={`border-b border-rule/10 px-6 py-5 ${state === "running" ? "bg-secondary" : ""}`}
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                            {String(i + 1).padStart(2, "0")} · {s.actor}
                          </p>
                          <span
                            className={`font-mono-ui text-[10px] uppercase tracking-[0.16em] ${
                              state === "queued" ? "text-muted-foreground" : "text-primary"
                            }`}
                          >
                            {state === "cleared" ? "Cleared" : state === "running" ? "Running" : "Queued"}
                          </span>
                        </div>
                        <p className="font-display mt-1.5 text-2xl leading-tight">{s.title}</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
                        <div className="mt-3 h-1 w-full bg-secondary">
                          <div className="h-1 bg-primary transition-all" style={{ width: `${frac * 100}%` }} />
                        </div>
                        <p className="mt-2.5 text-xs text-muted-foreground">
                          <span className="font-mono-ui uppercase tracking-[0.14em] text-primary">
                            {state === "cleared" ? "Cleared by — " : "Clearing authority — "}
                          </span>
                          {CLEARERS[s.key]!.officer}, {CLEARERS[s.key]!.designation} · {CLEARERS[s.key]!.node}
                        </p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          <span className="font-mono-ui uppercase tracking-[0.14em] text-primary">Evidence — </span>
                          {s.evidence}
                          {state === "cleared" ? ` · ${hash(active.ref + s.key).slice(0, 16)}` : ""}
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                          <span className="font-mono-ui uppercase tracking-[0.14em] text-primary">In plain words — </span>
                          {s.plain}
                        </p>
                      </li>
                    );
                  })}
                </ol>

                <div className="grid gap-px bg-rule/15 md:grid-cols-3">
                  {REGULATORS.map((r) => {
                    const idx = PORTAL_STAGES.findIndex((s) => s.key === "parallel");
                    const st = prog.states[idx]!;
                    return (
                      <div key={r.code} className="bg-background p-5">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-display text-2xl">{r.code}</p>
                          <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">
                            {st === "cleared" ? "Cleared" : st === "running" ? "Reviewing" : "Queued"}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{r.scope}</p>
                      </div>
                    );
                  })}
                </div>

                {prog.complete ? (
                  <div className="grid gap-px bg-rule/15 md:grid-cols-3">
                    <Stat k="UIN allotted" v={`UIN/${new Date(active.createdAt).getFullYear()}/${hash(active.ref).slice(0, 10).toUpperCase()}`} />
                    <Stat k="Ledger block" v={hash(active.ref + "ledger").slice(0, 20)} />
                    <Stat k="Serial paper equivalent" v={`47 days vs ${TOTAL_SECONDS}s`} />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">In plain words — </span>
          each row is one checkpoint the file must pass. The bar under a row fills while that checkpoint is working,
          and a fingerprint is written when it finishes — so nobody can later claim a step was skipped.
        </p>
      </section>

      <section className="mx-auto mt-16 max-w-[1400px] px-6">
        <Rule label="Step 4 — live ledger sync and action timeline" />
        <ChainSyncPanel apps={apps} now={now || Date.now()} desk="corporate" />
        <div className="mt-10">
          {active ? (
            <RegTimeline app={active} now={now || Date.now()} desk="corporate" />
          ) : (
            <p className="border border-rule/25 p-6 text-sm text-muted-foreground">
              Select one of your filings above to open its checkpoint-by-checkpoint timeline.
            </p>
          )}
        </div>

        <div className="mt-12" />
        <Rule label="Step 5 — audit log and evidence hash explorer" />
        {active ? (
          <AuditLog app={active} now={now || Date.now()} />
        ) : (
          <p className="border border-rule/25 p-6 text-sm text-muted-foreground">
            Select a filing above to open its audit log and evidence chain.
          </p>
        )}
        <div className="mt-10">
          <AuditConsole
            apps={apps}
            now={now || Date.now()}
            activity={activity}
            scope={mine ? `${mine.company} — own filings only` : "corporate desk"}
          />
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">In plain words — </span>
          this is the permanent record of the file: what happened, exactly when, who signed it, and the fingerprint of
          the paper they signed. Click any checkpoint to read its fingerprint, the documents behind it and the full
          chain back to the first block, or export the whole history as a spreadsheet or a signed-looking PDF for your
          auditor.
        </p>
      </section>

      <section className="mx-auto mt-16 max-w-[1400px] px-6">
        <Rule label="Step 5 — notifications at every stage" />
        <div className="grid gap-px border border-rule/25 bg-rule/15 lg:grid-cols-2">
          <NotificationFeed
            items={notifications}
            unread={unread}
            onMarkAll={markAllRead}
          />
          <EmailOutbox items={notifications} />
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">In plain words — </span>
          the moment a checkpoint is signed off, a pop-up alert appears on screen, the alert is logged in the feed on
          the left, and a written notice addressed to the treasury contact is raised on the right — each one naming
          the officer or engine that cleared the step, the node they sit on, and the fingerprint of the evidence they
          produced. Nothing clears silently.
        </p>
      </section>
    </Frame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-background p-6">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-background p-6">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{k}</p>
      <p className="tnum font-display mt-1.5 text-2xl leading-tight">{v}</p>
    </div>
  );
}
