import { ForecastLede } from "@/components/site/ForecastLede";
import { useEffect, useMemo, useState } from "react";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { Worklist } from "@/components/site/Worklist";
import { EngineRail } from "@/components/site/EngineRail";
import { useSession } from "@/lib/session";
import { loadApplications, type PortalApplication } from "@/lib/portal";
import { loadDecisions, type DecisionMap } from "@/lib/regulator";
import { downloadReadyListPDF, type ReadyListBlock } from "@/lib/readylist.pdf";
import {
  corporatePreFiling,
  corporateTasksFor,
  regulatorStanding,
  regulatorTasksFor,
} from "@/lib/worklist";

export const Route = createFileRoute("/worklist")({
  component: WorklistPage,
  head: () => ({
    meta: [
      { title: "Ready List — Corporate and Regulator Work Matrix | CorpVidesh AI" },
      {
        name: "description",
        content:
          "One ready-to-do matrix for Indian corporate treasuries and the six GIFT IFSC regulators: every outbound filing task, its owner, statutory basis and live state.",
      },
      { property: "og:title", content: "Ready List — Corporate and Regulator Work Matrix" },
      {
        property: "og:description",
        content:
          "Every outbound-investment task, executed once, on one desk: treasury, AD bank rail and the six-regulator window.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/** Which surface owns which job — the anti-duplication contract. */
const OWNERSHIP: { desk: string; to: string; owns: string; notHere: string }[] = [
  { desk: "Treasury console", to: "/console", owns: "Rule 7 headroom, entity net worth, mechanism stages", notHere: "No filing is submitted here" },
  { desk: "GIFT IFSC desk", to: "/gift", owns: "Hub selection, currency, live FX conversion", notHere: "No route determination here" },
  { desk: "Corporate filing desk", to: "/portal", owns: "Route, annexures, submission, own filings only", notHere: "No approvals are signed here" },
  { desk: "AD bank processing", to: "/processing", owns: "Bank-side rail, live tape, dispatch to regulators", notHere: "No documents are uploaded here" },
  { desk: "Regulator approvals", to: "/regulator", owns: "Six-regulator window, sign or query, officer actions", notHere: "No corporate filing detail beyond scope" },
  { desk: "Mechanism matrix", to: "/mechanism", owns: "Layer-by-layer build, technology reasoning", notHere: "No live filing state" },
];

function WorklistPage() {
  const { session, ready } = useSession();
  const [apps, setApps] = useState<PortalApplication[]>([]);
  const [decisions, setDecisions] = useState<DecisionMap>({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setApps(loadApplications());
    setDecisions(loadDecisions());
    const t = window.setInterval(() => {
      setNow(Date.now());
      setApps(loadApplications());
      setDecisions(loadDecisions());
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const role = session?.role ?? null;

  const mine = useMemo(() => {
    if (session?.role !== "corporate") return [];
    return apps.filter((a) => a.ownerId === session.id);
  }, [apps, session]);

  const live = mine[0] ?? null;
  const queue = useMemo(() => apps.slice(0, 3), [apps]);

  const corporateBlocks = useMemo<ReadyListBlock[]>(() => {
    if (role === "regulator") return [];
    return live
      ? [
          {
            title: `Corporate ready list — ${live.ref}`,
            caption: `${live.company} · ${live.route} route · INR ${live.amountCr.toLocaleString("en-IN")} Cr to ${live.hub}.`,
            tasks: corporateTasksFor(live, now),
          },
        ]
      : [
          {
            title: "Corporate ready list — before you file",
            caption: "Five steps from entity selection to submission.",
            tasks: corporatePreFiling(),
          },
        ];
  }, [live, now, role]);

  const regulatorBlocks = useMemo<ReadyListBlock[]>(() => {
    if (role === "corporate") return [];
    const code = session?.role === "regulator" ? session.code : undefined;
    return queue.length
      ? queue.map((a) => ({
          title: `Regulator ready list — ${a.ref}`,
          caption: `${a.company} · ${a.route} route · INR ${a.amountCr.toLocaleString("en-IN")} Cr to ${a.hub}.`,
          tasks: regulatorTasksFor(a, now, decisions, code),
        }))
      : [
          {
            title: "Regulator ready list — standing duties",
            caption: "The six-regulator window and what each authority tests when a file lands.",
            tasks: regulatorStanding(code),
          },
        ];
  }, [queue, now, decisions, role, session]);

  const onExport = () =>
    downloadReadyListPDF({
      role: role ?? "Guest",
      blocks: [...corporateBlocks, ...regulatorBlocks],
      ownership: OWNERSHIP.map((o) => ({ desk: o.desk, owns: o.owns, notHere: o.notHere })),
    });

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-20 pt-16">
        <Rule label="Ready list" />
        <h1 className="font-display max-w-4xl text-5xl leading-[1.04] lg:text-6xl">
          One matrix. Every task owned once.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          {role === "regulator"
            ? "Your window, your files, your signature. Nothing on this list is executed on any other screen."
            : "What the treasury must do, in order, and what the bank and the six regulators do in return — with the rule behind every step."}
        </p>
        {!ready ? null : !session ? (
          <Link
            to="/access"
            className="font-mono-ui mt-8 inline-block bg-primary px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
          >
            Take a desk identity →
          </Link>
        ) : null}
        <div className="mt-8">
          <button
            type="button"
            onClick={onExport}
            className="font-mono-ui border border-primary px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Export ready list PDF ↓
          </button>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            One click: every task on this matrix, the desk ownership matrix, and the current state of the
            Mechanism Matrix including whichever layer you have expanded.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="Ready list" focus={["rework", "clearance"]} />
      </section>

      <section className="mx-auto max-w-[1400px] space-y-10 px-6 pb-16">
        {role !== "regulator" ? (
          live ? (
            <Worklist
              title={`Corporate ready list — ${live.ref}`}
              caption={`${live.company} · ${live.route} route · ₹${live.amountCr.toLocaleString("en-IN")} Cr to ${live.hub}. Live state of every step on your file.`}
              tasks={corporateTasksFor(live, now)}
            />
          ) : (
            <Worklist
              title="Corporate ready list — before you file"
              caption="Five steps from entity selection to submission. Each one is executed on exactly one desk."
              tasks={corporatePreFiling()}
            />
          )
        ) : null}

        {role !== "corporate" ? (
          queue.length ? (
            queue.map((a) => (
              <Worklist
                key={a.ref}
                title={`Regulator ready list — ${a.ref}`}
                caption={`${a.company} · ${a.route} route · ₹${a.amountCr.toLocaleString("en-IN")} Cr to ${a.hub}. Only the desk you hold office at can sign.`}
                tasks={regulatorTasksFor(
                  a,
                  now,
                  decisions,
                  session?.role === "regulator" ? session.code : undefined,
                )}
              />
            ))
          ) : (
            <Worklist
              title="Regulator ready list — standing duties"
              caption="The six-regulator window and what each authority tests when a file lands."
              tasks={regulatorStanding(session?.role === "regulator" ? session.code : undefined)}
            />
          )
        ) : null}
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-24">
        <Rule label="Desk ownership matrix" />
        <div className="overflow-x-auto border border-rule/25">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <caption className="sr-only">
              Which desk owns which function, and what is deliberately not repeated there
            </caption>
            <thead>
              <tr className="border-b border-rule/25 bg-primary/[0.04]">
                {["Desk", "Owns", "Deliberately not here"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="font-mono-ui px-4 py-3 text-[9.5px] uppercase tracking-[0.16em] text-primary"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OWNERSHIP.map((o) => (
                <tr key={o.desk} className="border-b border-rule/15 align-top">
                  <td className="px-4 py-3">
                    <Link
                      to={o.to}
                      className="font-mono-ui text-[11px] uppercase tracking-[0.12em] text-primary underline-offset-4 hover:underline"
                    >
                      {o.desk}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">{o.owns}</td>
                  <td className="px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">{o.notHere}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 border-l-2 border-primary bg-primary/[0.04] px-4 py-3">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">In plain words</p>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Every job in this prototype has one home. The treasury never signs an approval, the regulator never
            uploads a document, and the bank never decides the route. That is why nothing here is duplicated.
          </p>
        </div>
        <div className="mt-10">
          <div className="mb-10">
            <DeskProcess3D desk="worklist" />
          </div>
          <EngineRail desk="worklist" session={session} activeRef={live?.ref ?? null} />
        </div>
      </section>
    </Frame>
  );
}