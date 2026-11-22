import { useEffect, useMemo, useState } from "react";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { SixRegulatorDesk } from "@/components/site/SixRegulatorDesk";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { AdBankDesk, AdBankTicker } from "@/components/site/AdBankTicker";
import { DeskGate } from "@/components/site/Gate";
import { canClear, useSession } from "@/lib/session";
import { loadApplications, progressFor, type PortalApplication } from "@/lib/portal";
import { AuditConsole } from "@/components/site/AuditConsole";
import { ChainSyncPanel } from "@/components/site/ChainSync";
import { RegTimeline } from "@/components/site/RegTimeline";
import { logActivity, useActivity } from "@/lib/activity";
import { useLiveCheckpoints } from "@/lib/live";
import {
  ENGINE_META,
  REG_TASKS,
  adEventsFor,
  autoDecisions,
  automaticRouteDecisions,
  bankFor,
  chainFor,
  loadDecisions,
  saveDecisions,
  type Decision,
  type DecisionMap,
} from "@/lib/regulator";

const TITLE = "Regulator Approval Desk — Automatic and Approval Route | CorpVidesh AI";
const DESC =
  "The supervisory counterpart to the corporate application desk: AD-bank processing tape, six-regulator approval actions on the Approval route, and the federated blockchain record of every manual and automated decision.";

export const Route = createFileRoute("/regulator")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search['ref'] === "string" ? (search['ref'] as string) : undefined,
  }),
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
  component: RegulatorPage,
});

const time = (t: number) =>
  new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function Plain({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 border-l-2 border-primary bg-primary/[0.04] px-4 py-3">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">In plain words</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function RegulatorPage() {
  const { ref: refParam } = Route.useSearch();
  const { session, ready: sessionReady } = useSession();
  const officer = session?.role === "regulator" ? session : null;
  const [apps, setApps] = useState<PortalApplication[]>([]);
  const [decisions, setDecisions] = useState<DecisionMap>({});
  const [now, setNow] = useState(0);
  const [activeRef, setActiveRef] = useState<string | null>(null);
  const activity = useActivity(session);
  useLiveCheckpoints(apps, now, { desk: "regulator" });

  useEffect(() => {
    const stored = loadApplications();
    setApps(stored);
    setDecisions(loadDecisions());
    setActiveRef(refParam ?? stored[0]?.ref ?? null);
    setNow(Date.now());
    const id = window.setInterval(() => {
      setNow(Date.now());
      setApps(loadApplications());
    }, 1000);
    return () => window.clearInterval(id);
  }, [refParam]);

  const active = apps.find((a) => a.ref === activeRef) ?? null;

  const effective = useMemo(() => {
    const map: DecisionMap = {};
    for (const app of apps) {
      const machine =
        app.route === "Automatic" ? automaticRouteDecisions(app, now) : autoDecisions(app, now);
      map[app.ref] = { ...machine, ...(decisions[app.ref] ?? {}) };
    }
    return map;
  }, [apps, decisions, now]);

  const chain = useMemo(() => chainFor(apps, now, effective), [apps, now, effective]);

  function decide(ref: string, code: string, status: Decision["status"]) {
    // A signer may only act at the authority they hold office at.
    if (!canClear(session, code)) return;
    const task = REG_TASKS.find((t) => t.code === code)!;
    const next: DecisionMap = {
      ...decisions,
      [ref]: {
        ...(decisions[ref] ?? {}),
        [code]: {
          status,
          officer: task.officer,
          at: Date.now(),
          note:
            status === "approved"
              ? `${task.test} Satisfied on the record before us.`
              : `Query raised: further material sought before ${task.code} can sign.`,
        },
      },
    };
    setDecisions(next);
    saveDecisions(next);
    const app = apps.find((a) => a.ref === ref);
    logActivity(session, {
      ref,
      company: app?.company ?? "",
      action: status === "approved" ? `${code} approval signed` : `${code} query raised`,
      detail: task.test,
      page: "/regulator",
      ownerId: app?.ownerId ?? "",
    });
  }

  const autoLane = apps.filter((a) => a.route === "Automatic");
  const approvalLane = apps.filter((a) => a.route === "Approval");

  if (sessionReady && !officer) {
    return (
      <DeskGate
        desk="The approvals queue is for regulator officers."
        need="Only a signed-in officer of RBI, IFSCA, MoF, FIU-IND, DPIIT or CBDT can open the supervisory queue. Corporate treasuries track their own filings on the application desk."
        holding={session?.role === "corporate" ? `${session.company} — ${session.contact}` : null}
      />
    );
  }

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-14">
        <Rule label="Regulator approval desk — supervisory side of the rail" />
        <h1 className="font-display max-w-4xl text-5xl lg:text-6xl">
          One filing. Two entirely different lanes.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          You are signed in at the{" "}
          <span className="text-primary">
            {officer?.code} desk — {officer?.officer}
          </span>
          , {officer?.scope.toLowerCase()}. This page is what the supervisor sees. An Automatic-route filing is machine-cleared and
          merely noted; an Approval-route filing stops here until six named desks sign it.
        </p>
        <Plain>
          Most overseas investments are allowed automatically — the computer checks them and the
          regulator only records what happened. A few need real permission first, and on those a
          human officer at each authority has to press approve before the money can move.
        </Plain>
      </section>

      <SixRegulatorDesk />

      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <Rule label="AD Category-I bank — live processing" />
        <AdBankTicker apps={apps} now={now} />
        <div className="mt-6">
          <div className="mb-10">
            <DeskProcess3D desk="regulator" />
          </div>
          <EngineRail desk="regulator" session={session} activeRef={activeRef} />
        </div>
        <Plain>
          Your bank is the pipe between the company and the regulators. Every action it takes on your
          file scrolls past above, in the order it happened.
        </Plain>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <Rule label="Queue — split by route" />
        <div className="grid gap-px bg-rule/15 lg:grid-cols-2">
          {[
            { label: "Automatic route — machine cleared, noted on the record", list: autoLane },
            { label: "Approval route — prior permission required", list: approvalLane },
          ].map((lane) => (
            <div key={lane.label} className="bg-background p-6">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                {lane.label}
              </p>
              <div className="mt-4 space-y-px bg-rule/12">
                {lane.list.length === 0 ? (
                  <p className="bg-background p-4 text-sm text-muted-foreground">
                    Nothing in this lane. File one from the Corporate Application desk.
                  </p>
                ) : (
                  lane.list.map((a) => {
                    const p = progressFor(a, now);
                    const signed = Object.values(effective[a.ref] ?? {}).filter(
                      (d) => d.status === "approved",
                    ).length;
                    return (
                      <button
                        key={a.ref}
                        onClick={() => setActiveRef(a.ref)}
                        className={`block w-full bg-background p-4 text-left transition-colors hover:bg-primary/[0.05] ${
                          a.ref === activeRef ? "outline outline-1 outline-primary" : ""
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-mono-ui text-[11px] uppercase tracking-[0.12em] text-primary">
                            {a.ref}
                          </span>
                          <span className="font-mono-ui tnum text-[10px] text-muted-foreground">
                            {Math.round(p.percent)}% · {signed}/6 signed
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm">{a.company}</p>
                        <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {a.hub} · ₹{a.amountCr.toLocaleString("en-IN")} Cr · {bankFor(a).split(" — ")[0]}
                        </p>
                        <div className="mt-3 h-1 bg-rule/15">
                          <div className="h-full bg-primary" style={{ width: `${p.percent}%` }} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {active && (
        <>
          <section className="mx-auto max-w-[1400px] px-6 py-8">
            <Rule label={`Under examination — ${active.ref}`} />
            <div className="grid gap-px bg-rule/15 lg:grid-cols-[1.15fr_1fr]">
              <div className="bg-background p-6">
                <p className="font-display text-3xl">{active.company}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {active.sector} · {active.hub}, {active.country}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-px bg-rule/12 sm:grid-cols-4">
                  {[
                    ["Route", active.route],
                    ["Commitment", `₹${active.amountCr.toLocaleString("en-IN")} Cr`],
                    ["Rule 7 ceiling", `₹${Math.round(active.ceiling).toLocaleString("en-IN")} Cr`],
                    ["Headroom after", `₹${Math.round(active.headroomAfter).toLocaleString("en-IN")} Cr`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-background p-4">
                      <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                        {k}
                      </p>
                      <p className="font-display mt-1 text-xl">{v}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-sm text-muted-foreground">Basis: {active.routeBasis}</p>
              </div>
              <div className="bg-background p-6">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  AD bank file — {bankFor(active)}
                </p>
                <div className="mt-4">
                  <AdBankDesk events={adEventsFor(active, now)} />
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-[1400px] px-6 py-8">
            <Rule
              label={
                active.route === "Approval"
                  ? "Six-regulator approval desk — manual signatures required"
                  : "Six-regulator window — automatic route, noted on the record"
              }
            />
            <div className="grid gap-px bg-rule/15 md:grid-cols-2 xl:grid-cols-3">
              {REG_TASKS.map((t) => {
                const d = effective[active.ref]?.[t.code];
                const manualNeeded = active.route === "Approval" && t.mode === "manual";
                const mine = canClear(session, t.code);
                return (
                  <div key={t.code} className="flex flex-col bg-background p-6">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-display text-2xl text-primary">{t.code}</span>
                      <span
                        className={`font-mono-ui border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${
                          d?.status === "approved"
                            ? "border-primary bg-primary text-primary-foreground"
                            : d?.status === "queried"
                              ? "border-primary text-primary"
                              : "border-rule/25 text-muted-foreground"
                        }`}
                      >
                        {d?.status === "approved" ? "approved" : d?.status === "queried" ? "queried" : "pending"}
                      </span>
                    </div>
                    <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {t.scope} · {t.mode === "automated" ? "automated" : "manual desk"}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed">{t.test}</p>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t.plain}</p>
                    <p className="font-mono-ui mt-3 border border-rule/20 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                      {ENGINE_META[t.engine].label}
                    </p>
                    <div className="mt-auto pt-5">
                      {d ? (
                        <p className="text-xs text-muted-foreground">
                          {d.officer} · {time(d.at)} — {d.note}
                        </p>
                      ) : manualNeeded && mine ? (
                        <div className="flex gap-px bg-rule/15">
                          <button
                            onClick={() => decide(active.ref, t.code, "approved")}
                            className="font-mono-ui flex-1 bg-primary px-3 py-2.5 text-[10px] uppercase tracking-[0.14em] text-primary-foreground"
                          >
                            Approve as {t.officer}
                          </button>
                          <button
                            onClick={() => decide(active.ref, t.code, "queried")}
                            className="font-mono-ui bg-background px-3 py-2.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
                          >
                            Query
                          </button>
                        </div>
                      ) : manualNeeded ? (
                        <p className="font-mono-ui border border-rule/20 px-2 py-1.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                          Read-only — {t.code} desk. Signature reserved for {t.officer}.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Waiting for the parallel window to open on this filing.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Plain>
              {active.route === "Approval"
                ? "This company asked to send more than the standard limit, or works in a guarded sector. Three officers must personally sign, while three checks run by machine. Until all six are green, nothing moves."
                : "Nothing here needs a signature. The checks ran by machine and each authority simply sees the result — that is the whole point of the automatic route."}
            </Plain>
          </section>
        </>
      )}

      <section className="mx-auto max-w-[1400px] px-6 py-8 pb-16">
        <Rule label="Federated blockchain — manual and automated decisions on one chain" />
        <div className="border border-rule/20">
          <div className="grid grid-cols-[92px_86px_1fr_150px_120px] gap-3 border-b border-rule/15 px-4 py-2.5 font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>Block</span>
            <span>Time</span>
            <span>Payload</span>
            <span>Node</span>
            <span>Origin</span>
          </div>
          {chain.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              The chain starts the moment a filing clears its first checkpoint.
            </p>
          ) : (
            chain.map((b) => (
              <div
                key={`${b.height}-${b.digest}`}
                className="grid grid-cols-[92px_86px_1fr_150px_120px] items-center gap-3 border-b border-rule/12 px-4 py-3 last:border-b-0"
              >
                <span className="font-mono-ui tnum text-[10px] text-primary">#{b.height}</span>
                <span className="font-mono-ui tnum text-[10px] text-muted-foreground">{time(b.at)}</span>
                <span className="text-sm">
                  {b.payload}
                  <span className="font-mono-ui ml-2 text-[9px] text-muted-foreground">
                    {b.ref} · {b.prev}→{b.digest}
                  </span>
                </span>
                <span className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {b.node}
                </span>
                <span
                  className={`font-mono-ui border px-2 py-0.5 text-center text-[9px] uppercase tracking-[0.12em] ${
                    b.mode === "manual" ? "border-primary text-primary" : "border-rule/25 text-muted-foreground"
                  }`}
                >
                  {b.mode}
                </span>
              </div>
            ))
          )}
        </div>
        <Plain>
          Every line above is sealed to the line before it, so nothing can be quietly changed later.
          Red tags are decisions a person took; grey tags are checks a machine ran. Each regulator
          keeps its own copy of this record, which is what makes it federated.
        </Plain>
        <div className="mt-12">
          <Rule label="Ledger sync — live node health" />
          <ChainSyncPanel apps={apps} now={now || Date.now()} desk="regulator" />
        </div>

        <div className="mt-12">
          <Rule label="Regulator action timeline — expand any checkpoint" />
          {active ? (
            <RegTimeline app={active} now={now || Date.now()} desk="regulator" />
          ) : (
            <p className="border border-rule/25 p-6 text-sm text-muted-foreground">
              Select a filing from either lane to open its checkpoint-by-checkpoint action timeline.
            </p>
          )}
          <Plain>
            Open any checkpoint to see exactly which parts a person approved and which parts a machine
            ran, together with the fingerprint of the evidence sealed at each one.
          </Plain>
        </div>

        <div className="mt-12">
          <AuditConsole
            apps={apps}
            now={now || Date.now()}
            activity={activity}
            scope={officer ? `${officer.officer} — ${officer.code} supervisory queue` : "supervisory queue"}
          />
        </div>
        <div className="mt-8 flex flex-wrap gap-px bg-rule/15">
          {[
            { to: "/portal", label: "Corporate application desk" },
            { to: "/apply", label: "Application flow simulator" },
            { to: "/supervisor", label: "Supervisor ledger" },
            { to: "/treasury", label: "Treasury live" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="font-mono-ui bg-background px-5 py-3 text-[10px] uppercase tracking-[0.14em] hover:text-primary"
            >
              {l.label} →
            </Link>
          ))}
        </div>
      </section>
    </Frame>
  );
}
