import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { TopMarketTickers } from "@/components/site/TopMarketTickers";
import { TreasuryClearanceStudio } from "@/components/site/TreasuryClearanceStudio";
import { Deferred } from "@/components/site/Deferred";
import { ApplicationHub } from "@/components/site/ApplicationHub";
import { Button } from "@/components/ui/button";
import { Frame, Rule } from "@/components/site/Frame";
import { RegulatorTheatre, TreasuryTheatre } from "@/components/site/DeskTheatre";
import { COMPANIES } from "@/data/companies";
import { REG_TASKS } from "@/lib/regulator";
import {
  corporateIdFor,
  regulatorSessionFor,
  saveSession,
  sessionLabel,
  useSession,
} from "@/lib/session";

const TITLE = "Application Workspace — Corporate, Fund & GIFT | CorpVidesh AI";
const DESC =
  "Open the corporate treasury, fund proposal and GIFT review portals, or follow the connected evidence and investor presentation journey.";

export const Route = createFileRoute("/access")({
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
  component: Access,
});

function Access() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [company, setCompany] = useState(COMPANIES[0]?.name ?? "");
  const [contact, setContact] = useState("Group Treasurer");
  const [email, setEmail] = useState("treasury@entity.co.in");
  const [desksOpen, setDesksOpen] = useState(false);

  function enterCorporate() {
    saveSession({
      role: "corporate",
      id: corporateIdFor(company, email),
      company,
      contact,
      email,
    });
    void navigate({ to: "/portal" });
  }

  function enterInvestor() {
    saveSession({
      role: "investor",
      id: "obs:diligence",
      name: "Diligence observer",
      fund: "Investor data room",
    });
    void navigate({ to: "/investors" });
  }

  function enterAdmin() {
    saveSession({
      role: "admin",
      id: "admin:platform",
      name: "Platform administrator",
      office: "CorpVidesh AI operations",
    });
    void navigate({ to: "/routes" });
  }

  function enterRegulator(code: string) {
    const s = regulatorSessionFor(code);
    if (!s) return;
    saveSession(s);
    void navigate({ to: "/regulator", search: { ref: undefined } });
  }

  return (
    <Frame>
      <TopMarketTickers />
      <Deferred><TreasuryClearanceStudio /><ApplicationHub /></Deferred>
      <details className="mx-auto max-w-[1400px] px-6" onToggle={(e) => setDesksOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer border-y border-border py-4 font-mono-ui text-xs text-muted-foreground">Local desk simulations & animated walkthroughs</summary>
        <p className="mt-4 text-xs text-muted-foreground">Device-only demonstration selectors below are not sign-in and cannot authorize shared portal records.</p>
      {desksOpen ? (<>
      <section className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="grid gap-px bg-rule/15 lg:grid-cols-2">
          <div className="bg-background p-7">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
              Corporate treasury
            </p>
            <p className="font-display mt-3 text-3xl">File and track your own entity</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Registers the filing, attaches the annexures and follows the ten stages. Sees no other
              company's reference, and cannot open the approvals queue.
            </p>
            <div className="mt-6 space-y-px bg-rule/12">
              <label className="block bg-background p-4">
                <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  Indian party
                </span>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="mt-1.5 w-full bg-transparent text-lg outline-none"
                >
                  {COMPANIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.rank}. {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block bg-background p-4">
                <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  Authorised signatory
                </span>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="mt-1.5 w-full bg-transparent text-lg outline-none"
                />
              </label>
              <label className="block bg-background p-4">
                <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  Notice address
                </span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full bg-transparent text-lg outline-none"
                />
              </label>
            </div>
            <Button variant="ghost"
              onClick={enterCorporate}
              className="font-mono-ui mt-6 w-full bg-primary px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
            >
              Enter the corporate desk
            </Button>
          </div>

          <div className="bg-background p-7">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
              Regulator officer
            </p>
            <p className="font-display mt-3 text-3xl">Hold office at one authority</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Sees the approvals queue for every filing on the rail, but the approve and query
              actions unlock only on the desk of the authority signed in below.
            </p>
            <div className="mt-6 grid gap-px bg-rule/12 sm:grid-cols-2">
              {REG_TASKS.map((t) => (
                <Button variant="ghost"
                  key={t.code}
                  onClick={() => enterRegulator(t.code)}
                  className="h-auto flex-col items-start whitespace-normal rounded-none bg-background p-4 text-left transition-colors hover:bg-primary/[0.05]"
                >
                  <span className="font-display text-2xl text-primary">{t.code}</span>
                  <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    {t.scope}
                  </p>
                  <p className="mt-2 text-sm">{t.officer}</p>
                  <p className="font-mono-ui mt-2 text-[9px] uppercase tracking-[0.14em] text-primary">
                    {t.mode === "manual" ? "Signing desk" : "Automated desk"}
                  </p>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Corporate treasury desk — 3D simulation of one application" />
        <h2 className="font-display max-w-4xl text-5xl lg:text-6xl">
          What the application actually does after you press send.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          Before you sign in, watch a demonstration file run the full corridor: the treasury desk, the
          reasoning engine that fixes the route, the AD Category-I bank that is the only lawful door out
          of India, the GIFT IFSC ledger the six regulators read, and the overseas bank finally credited.
        </p>
        <div className="mt-8">
          <TreasuryTheatre />
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Rule label="Regulator desk — automated work queues in parallel" />
        <h2 className="font-display max-w-4xl text-5xl lg:text-6xl">
          Six authorities. Six queues. One window of seconds.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          Choose an authority from the dropdown to see exactly what it has to approve on an approval-route
          file, how many of those checks the engine clears on its own, and which few still need a named
          officer's signature.
        </p>
        <div className="mt-8">
          <RegulatorTheatre route="Approval" />
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Observer and operator desks — evidence permissions" />
        <div className="mt-6 grid gap-px bg-rule/15 lg:grid-cols-2">
          <div className="bg-background p-7">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
              Investor / observer
            </p>
            <p className="font-display mt-3 text-3xl">Read the file, change nothing</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Diligence access to the rail, the evidence checklist and the audit trail. By default no status
              button is live — the administrator may grant specific statuses per step.
            </p>
            <Button variant="ghost"
              onClick={enterInvestor}
              className="font-mono-ui mt-6 w-full border border-primary px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-primary"
            >
              Enter the investor desk
            </Button>
          </div>
          <div className="bg-background p-7">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
              Platform administrator
            </p>
            <p className="font-display mt-3 text-3xl">Set who may update what</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Opens the role permission matrix on every route step: allow or withdraw Outstanding, Prepared,
              Submitted and Validated for each desk, globally or step by step.
            </p>
            <Button variant="ghost"
              onClick={enterAdmin}
              className="font-mono-ui mt-6 w-full bg-primary px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
            >
              Enter the administrator desk
            </Button>
          </div>
        </div>
      </section>
      </>) : null}
      </details>
    </Frame>
  );
}
