import { useEffect, useMemo, useState } from "react";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { DeskGate } from "@/components/site/Gate";
import { AdBankDesk } from "@/components/site/AdBankTicker";
import { RegTimeline } from "@/components/site/RegTimeline";
import { ChainSyncPanel } from "@/components/site/ChainSync";
import { useSession } from "@/lib/session";
import { loadApplications, progressFor, PORTAL_STAGES, type PortalApplication } from "@/lib/portal";
import {
  ENGINE_META,
  REG_TASKS,
  adEventsFor,
  autoDecisions,
  automaticRouteDecisions,
  bankFor,
  loadDecisions,
  type Decision,
} from "@/lib/regulator";

const TITLE = "Processing Desk — How Your Filing Clears at the AD Bank and Regulators | CorpVidesh AI";
const DESC =
  "Follow a submitted outbound filing through the AD Category-I bank rail and the six-regulator window, on the Automatic route or the Approval route, with every checkpoint and signature shown live.";

export const Route = createFileRoute("/processing")({
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
  component: ProcessingPage,
});

const time = (t: number) =>
  new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function ProcessingPage() {
  const { ref } = Route.useSearch();
  const { session, ready } = useSession();
  const [apps, setApps] = useState<PortalApplication[]>([]);
  const [now, setNow] = useState(0);
  const [activeRef, setActiveRef] = useState<string | null>(ref ?? null);

  useEffect(() => {
    const sync = () => {
      const all = loadApplications();
      // Role scoping: a treasury only ever sees files it raised.
      const scoped =
        session?.role === "corporate" ? all.filter((a) => a.ownerId === session.id) : all;
      setApps(scoped);
      setNow(Date.now());
      setActiveRef((cur) => cur ?? scoped[0]?.ref ?? null);
    };
    sync();
    const id = window.setInterval(sync, 700);
    return () => window.clearInterval(id);
  }, [session?.role, session?.role === "corporate" ? session.id : ""]);

  useEffect(() => {
    if (ref) setActiveRef(ref);
  }, [ref]);

  const active = apps.find((a) => a.ref === activeRef) ?? null;

  const decisions = useMemo<Record<string, Decision>>(() => {
    if (!active) return {};
    const machine =
      active.route === "Automatic" ? automaticRouteDecisions(active, now) : autoDecisions(active, now);
    return { ...machine, ...(loadDecisions()[active.ref] ?? {}) };
  }, [active, now]);

  if (ready && !session) {
    return (
      <DeskGate
        desk="The processing desk follows a filing that belongs to someone."
        need="Sign in as the corporate treasury that raised the filing, or as a regulator officer, and this screen opens on that file."
        holding={null}
      />
    );
  }

  const p = active && now ? progressFor(active, now) : null;

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-8 pt-14">
        <Rule label="Processing desk — AD Category-I bank and the supervisory window" />
        <h1 className="font-display max-w-4xl text-5xl leading-[1.04] lg:text-6xl">
          What actually happens to the file after you press submit.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Every submitted application lands at an AD Category-I bank first. The bank works the file desk by
          desk and pushes it into the six-regulator window. On the Automatic route the window clears by
          machine and merely records the result; on the Approval route it stops until named officers sign.
        </p>
        <div className="mt-6 border-l-2 border-primary bg-primary/[0.04] px-4 py-3">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">In plain words</p>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            This is the back office made visible: your bank checking the paperwork, then the regulators
            either ticking it off automatically or personally signing it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="flex flex-wrap gap-px bg-rule/15">
          {apps.length === 0 ? (
            <p className="bg-background p-5 text-sm text-muted-foreground">
              No filing is visible from this desk yet.{" "}
              {session?.role === "corporate" ? (
                <Link to="/portal" className="text-primary underline-offset-4 hover:underline">
                  File one from the corporate portal.
                </Link>
              ) : (
                "Nothing has been filed on the rail."
              )}
            </p>
          ) : (
            apps.map((a) => {
              const ap = progressFor(a, now);
              return (
                <button
                  key={a.ref}
                  onClick={() => setActiveRef(a.ref)}
                  className={`bg-background px-4 py-3 text-left ${
                    a.ref === activeRef ? "outline outline-1 outline-primary" : ""
                  }`}
                >
                  <span className="font-mono-ui block text-[10px] uppercase tracking-[0.14em] text-primary">
                    {a.ref} · {a.route}
                  </span>
                  <span className="mt-1 block text-sm">{a.company}</span>
                  <span className="font-mono-ui tnum text-[10px] text-muted-foreground">
                    {Math.round(ap.percent)}% cleared
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {active && p ? (
        <>
          <section className="mx-auto max-w-[1400px] px-6 py-8">
            <Rule label={`Filing ${active.ref} — ${active.route.toLowerCase()} route`} />
            <div className="grid gap-px bg-rule/15 md:grid-cols-4">
              {[
                ["Indian party", active.company],
                ["Corridor", `${active.hub}, ${active.country}`],
                ["Commitment", `₹${active.amountCr.toLocaleString("en-IN")} Cr`],
                ["Handling bank", bankFor(active)],
              ].map(([k, v]) => (
                <div key={k} className="bg-background p-5">
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                  <p className="mt-1.5 text-lg">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Route basis: {active.routeBasis}. Checkpoint {Math.min(p.currentIndex + 1, PORTAL_STAGES.length)} of{" "}
              {PORTAL_STAGES.length} — {PORTAL_STAGES[p.currentIndex]!.title}.
            </p>
          </section>

          <section className="mx-auto max-w-[1400px] px-6 py-8">
            <Rule label="AD Category-I bank — desk by desk on this file" />
            <AdBankDesk events={adEventsFor(active, now)} />
            <div className="mt-6">
              <div className="mb-10">
                <DeskProcess3D desk="processing" />
              </div>
              <EngineRail desk="processing" session={session} activeRef={active.ref} />
            </div>
          </section>

          <section className="mx-auto max-w-[1400px] px-6 py-8">
            <Rule
              label={
                active.route === "Approval"
                  ? "Six-regulator window — prior permission being taken"
                  : "Six-regulator window — machine cleared, noted on the record"
              }
            />
            <div className="grid gap-px bg-rule/15 md:grid-cols-2 xl:grid-cols-3">
              {REG_TASKS.map((t) => {
                const d = decisions[t.code];
                return (
                  <div key={t.code} className="bg-background p-5">
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
                        {d?.status ?? "pending"}
                      </span>
                    </div>
                    <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {t.scope} · {active.route === "Approval" && t.mode === "manual" ? "manual signature" : "automated"}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed">{t.test}</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.plain}</p>
                    <p className="font-mono-ui mt-3 border border-rule/20 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                      {ENGINE_META[t.engine].label}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {d ? `${d.officer} · ${time(d.at)} — ${d.note}` : "Waiting for the parallel window to open."}
                    </p>
                  </div>
                );
              })}
            </div>
            {session?.role === "regulator" ? (
              <Link
                to="/regulator"
                search={{ ref: active.ref }}
                className="font-mono-ui mt-6 inline-block bg-primary px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
              >
                Open this file in the approvals queue
              </Link>
            ) : (
              <p className="font-mono-ui mt-6 border border-rule/25 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Read-only — signatures are reserved for the officers named above.
              </p>
            )}
          </section>

          <section className="mx-auto max-w-[1400px] px-6 py-8">
            <Rule label="Regulator action timeline — manual and automated nodes" />
            <RegTimeline app={active} now={now} desk={session?.role === "regulator" ? "regulator" : "corporate"} />
          </section>

          <section className="mx-auto max-w-[1400px] px-6 py-8 pb-20">
            <Rule label="Federated ledger — checkpoint ingestion" />
            <ChainSyncPanel apps={[active]} now={now} desk={session?.role === "regulator" ? "regulator" : "corporate"} />
          </section>
        </>
      ) : null}
    </Frame>
  );
}
