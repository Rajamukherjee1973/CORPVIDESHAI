import { ForecastLede } from "@/components/site/ForecastLede";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { createFileRoute } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { COMPANIES } from "@/data/companies";
import { HUBS } from "@/data/hubs";
import { COUNTRY_META, flag } from "@/data/currencies";

const TITLE = "Application Processing Rail | CorpVidesh AI";
const DESC =
  "Watch an outbound investment file clear end to end: Rule 7 route determination, document intake, parallel clearance across six Indian regulators and UIN mint.";

export const Route = createFileRoute("/apply")({
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
  component: ApplyPage,
});

const CR = 1_00_00_000;
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const DOCS_AUTO: [string, string][] = [
  ["Board resolution authorising the financial commitment", "Companies Act, s.179(3)"],
  ["Form FC — Part I (investment particulars)", "FEMA (OI) Regulations 2022"],
  ["Valuation certificate for the overseas entity", "Rule 19, OI Rules 2022"],
  ["Statutory auditor's net-worth certificate", "Rule 7 — 400% ceiling"],
  ["KYC of the Indian party, filed through the AD bank", "Master Direction — OI"],
  ["Form 15CA / 15CB for the remittance", "Income-tax Act, s.195"],
];
const DOCS_APPROVAL: [string, string][] = [
  ["Application to RBI through the AD Category-I bank", "Rule 10, OI Rules 2022"],
  ["Justification note for the approval-route exposure", "Reg. 6, OI Regulations"],
  ["No-objection from lenders / investigating agencies", "Rule 10(2), OI Rules 2022"],
];

type Stage = {
  key: string;
  title: string;
  actor: string;
  ms: number;
  detail: string;
  evidence: string;
  plain: string;
};

const STAGES: Stage[] = [
  { key: "intake", title: "Intake and identity", actor: "Treasury desk", ms: 1200, detail: "Entity, PAN, LEI and AD-bank mandate bound to the ticket; documents hashed on receipt.", evidence: "Intake manifest", plain: "The system checks who is asking and locks the paperwork so it cannot be swapped later." },
  { key: "reason", title: "FEMA reasoning", actor: "CorpVidesh AI engine", ms: 1600, detail: "Rule 7 headroom, sector eligibility and Rule 9/19 tests computed against the audited net worth.", evidence: "Reasoned determination", plain: "The law is applied to the numbers automatically, with the rule cited for each conclusion." },
  { key: "route", title: "Route determination", actor: "Rules engine", ms: 900, detail: "Automatic route where the commitment stays inside the 400% ceiling and the sector is unrestricted; otherwise the approval file is assembled.", evidence: "Route certificate", plain: "It decides whether the company may simply proceed or must first get permission." },
  { key: "docs", title: "Document completeness", actor: "Document AI", ms: 1300, detail: "Every mandated annexure matched to its statutory source; gaps flagged before filing rather than after.", evidence: "Completeness report", plain: "It checks nothing is missing before the file goes to the regulators." },
  { key: "parallel", title: "Parallel regulatory clearance", actor: "RBI · IFSCA · MoF · FIU · DPIIT · CBDT", ms: 3200, detail: "Six endpoints receive the same signed dossier at the same instant instead of one after another.", evidence: "Six clearance receipts", plain: "All six regulators look at the file together, not one after the other — this is where the weeks disappear." },
  { key: "tax", title: "Tax and treaty position", actor: "CBDT rail", ms: 1100, detail: "s.195 withholding, treaty relief and 15CA/15CB linkage resolved for the target corridor.", evidence: "Tax position note", plain: "The tax to be deducted before the money leaves is settled up front." },
  { key: "zk", title: "Zero-knowledge disclosure", actor: "Groth16 circuit", ms: 1000, detail: "Proof that the commitment sits inside the ceiling, without exposing the underlying balance sheet.", evidence: "ZK proof artefact", plain: "The regulator can verify the limit is respected without seeing private numbers." },
  { key: "uin", title: "UIN mint", actor: "RBI / AD bank", ms: 900, detail: "Unique Identification Number allotted and bound to the corridor and the settlement instruction.", evidence: "UIN allotment", plain: "The investment gets its official number so every later remittance can be tracked." },
  { key: "settle", title: "Hub settlement instruction", actor: "AD bank · GIFT IFSC", ms: 1000, detail: "Remittance released to the target hub with the cleared amount, currency and value date.", evidence: "Settlement advice", plain: "The money is actually sent to the chosen financial centre." },
  { key: "ledger", title: "Immutable ledger commit", actor: "Federated audit ledger", ms: 800, detail: "Every event hash-chained across sovereign nodes; annual performance reporting pre-populated.", evidence: "Ledger block", plain: "A permanent, tamper-proof record is written that everyone can rely on later." },
];

const REGULATORS = [
  { code: "RBI", scope: "Financial commitment, Rule 7 ceiling, UIN" },
  { code: "IFSCA", scope: "GIFT IFSC unit conduct and the offshore leg" },
  { code: "MoF", scope: "Policy conformity for outbound capital" },
  { code: "FIU-IND", scope: "Money-laundering and beneficial-ownership screening" },
  { code: "DPIIT", scope: "Sector conditions and strategic-sector flags" },
  { code: "CBDT", scope: "Withholding, treaty relief and 15CA/15CB" },
];

function hash(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let out = "";
  let x = h;
  for (let i = 0; i < 8; i++) {
    x = Math.imul(x ^ (x >>> 15), 0x2545f491) >>> 0;
    out += x.toString(16).padStart(8, "0");
  }
  return out.slice(0, 56);
}

function ApplyPage() {
  const [companyName, setCompanyName] = useState(COMPANIES[0]!.name);
  const [hubCity, setHubCity] = useState("Singapore");
  const [amountCr, setAmountCr] = useState(1240);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const timers = useRef<number[]>([]);

  const company = COMPANIES.find((c) => c.name === companyName) ?? COMPANIES[0]!;
  const hub = HUBS.find((h) => h.city === hubCity) ?? HUBS[0]!;
  const meta = COUNTRY_META[hub.country] ?? { iso2: "UN", currency: "USD", currencyName: "US Dollar" };

  const headroomAfter = company.ceiling - company.used - amountCr;
  const restricted = company.route === "Approval" && company.headroom > 0;
  const breach = headroomAfter < 0;
  const route: "Automatic" | "Approval" = breach || restricted ? "Approval" : "Automatic";

  const docs = useMemo(
    () => (route === "Approval" ? [...DOCS_AUTO, ...DOCS_APPROVAL] : DOCS_AUTO),
    [route],
  );
  const submitted = docs.filter(([d]) => checked[d]).length;
  const ready = submitted === docs.length;

  const ticket = `CV-${hash(company.name + hub.city + amountCr).slice(0, 8).toUpperCase()}`;
  const uin = `UIN/${new Date().getFullYear()}/${hash(ticket).slice(0, 10).toUpperCase()}`;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(false);
    setDone(false);
    setStep(-1);
    setElapsed(0);
  }

  function submit() {
    reset();
    setRunning(true);
    let t = 0;
    STAGES.forEach((s, i) => {
      t += s.ms;
      timers.current.push(
        window.setTimeout(() => {
          setStep(i);
          setElapsed(t / 1000);
          if (i === STAGES.length - 1) {
            setRunning(false);
            setDone(true);
          }
        }, t),
      );
    });
  }

  const totalSecs = STAGES.reduce((a, s) => a + s.ms, 0) / 1000;

  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pt-16">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">
          Treasury → clearance, live
        </p>
        <h1 className="font-display mt-4 max-w-4xl text-5xl leading-[1.02] md:text-7xl">
          How an application is processed once the route is picked and the documents are in.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Pick a listed company, a hub and an amount. The rail determines the route under Rule 7, checks the
          documentation against the statute that demands it, then runs the file across all six regulators at
          once — {totalSecs.toFixed(0)} seconds on this desk against the 47 days the serial paper route takes.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="Clearance simulator" focus={["clearance", "headroom"]} />
      </section>

      <section className="mx-auto mt-14 max-w-[1400px] px-6">
        <Rule label="Step 1 — the ticket" />
        <div className="grid gap-px border border-rule/25 bg-rule/15 lg:grid-cols-4">
          <Field label={`Listed entity (${COMPANIES.length})`}>
            <select
              aria-label="Listed entity"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                reset();
              }}
              className="w-full bg-transparent text-lg outline-none"
            >
              {COMPANIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.rank}. {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Target hub (${HUBS.length})`}>
            <select
              aria-label="Target hub"
              value={hubCity}
              onChange={(e) => {
                setHubCity(e.target.value);
                reset();
              }}
              className="w-full bg-transparent text-lg outline-none"
            >
              {HUBS.map((h) => (
                <option key={h.city} value={h.city}>
                  {flag(COUNTRY_META[h.country]?.iso2 ?? "UN")} {h.city} — {h.country}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount to send abroad (INR crore)">
            <input
              aria-label="Amount to send abroad in INR crore"
              type="number"
              min={0}
              value={amountCr}
              onChange={(e) => {
                setAmountCr(Math.max(0, Number(e.target.value) || 0));
                reset();
              }}
              className="tnum w-full bg-transparent text-lg outline-none"
            />
          </Field>
          <Field label="Determined route">
            <p className="font-display text-3xl text-primary">{route}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {breach
                ? "Commitment exceeds the 400% ceiling"
                : restricted
                  ? "Sector condition forces prior approval"
                  : "Inside the Rule 7 ceiling, unrestricted sector"}
            </p>
          </Field>
        </div>

        <div className="mt-px grid gap-px bg-rule/15 md:grid-cols-4">
          <Stat k="Net worth" v={`${inr(company.netWorth)} Cr`} />
          <Stat k="400% ceiling (Rule 7)" v={`${inr(company.ceiling)} Cr`} />
          <Stat k="Headroom after this ticket" v={`${inr(headroomAfter)} Cr`} />
          <Stat k="Value leaving India" v={inr(amountCr * CR)} />
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1400px] px-6">
        <Rule label="Step 2 — documentation" />
        <div className="grid gap-px bg-rule/15 lg:grid-cols-[2fr_1fr]">
          <div className="bg-background">
            {docs.map(([d, src]) => (
              <label
                key={d}
                className="flex cursor-pointer items-start gap-4 border-b border-rule/10 px-6 py-4 hover:bg-secondary"
              >
                <input
                  type="checkbox"
                  checked={!!checked[d]}
                  onChange={(e) => {
                    setChecked((c) => ({ ...c, [d]: e.target.checked }));
                    reset();
                  }}
                  className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                />
                <span>
                  <span className="block text-base">{d}</span>
                  <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">
                    {src}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div className="bg-background p-6">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Filing readiness
            </p>
            <p className="tnum font-display mt-2 text-6xl">
              {submitted}/{docs.length}
            </p>
            <div className="mt-4 h-2 w-full bg-secondary">
              <div
                className="h-2 bg-primary transition-all"
                style={{ width: `${(submitted / docs.length) * 100}%` }}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => setChecked(Object.fromEntries(docs.map(([d]) => [d, true])))}
                className="font-mono-ui border border-rule/25 px-3 py-2 text-[11px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
              >
                Attach all
              </button>
              <button
                onClick={() => {
                  setChecked({});
                  reset();
                }}
                className="font-mono-ui border border-rule/25 px-3 py-2 text-[11px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
              >
                Clear
              </button>
            </div>
            <button
              disabled={!ready || running}
              onClick={submit}
              className="font-mono-ui mt-6 w-full bg-primary px-4 py-4 text-[12px] uppercase tracking-[0.18em] text-primary-foreground disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
            >
              {running ? "Processing…" : done ? "Re-run application" : `Submit ${route.toLowerCase()}-route application`}
            </button>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
                In plain words —
              </span>{" "}
              attach every paper the law asks for; the button only unlocks when the file is complete, because
              an incomplete file is what causes the delay in the first place.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1400px] px-6">
        <Rule label="Step 3 — processing" />
        <div className="grid gap-px bg-rule/15 md:grid-cols-4">
          <Stat k="Ticket" v={ticket} />
          <Stat k="Corridor" v={`GIFT IFSC → ${hub.city}`} />
          <Stat k="Elapsed on this rail" v={`${elapsed.toFixed(1)} s`} />
          <Stat k="Serial paper equivalent" v="47 days" />
        </div>

        <div className="mt-px grid gap-px bg-rule/15 lg:grid-cols-2">
          {STAGES.map((s, i) => {
            const state = step > i ? "done" : step === i ? (done && i === STAGES.length - 1 ? "done" : "active") : "idle";
            return (
              <div
                key={s.key}
                className={`bg-background p-6 transition-colors ${state === "active" ? "bg-secondary" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                    {String(i + 1).padStart(2, "0")} · {s.actor}
                  </p>
                  <span
                    className={`font-mono-ui text-[10px] uppercase tracking-[0.16em] ${
                      state === "idle" ? "text-muted-foreground" : "text-primary"
                    }`}
                  >
                    {state === "done" ? "Cleared" : state === "active" ? "Running" : "Queued"}
                  </span>
                </div>
                <p className="font-display mt-2 text-3xl leading-tight">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
                <div className="mt-3 h-1 w-full bg-secondary">
                  <div
                    className="h-1 bg-primary transition-all duration-500"
                    style={{ width: state === "idle" ? "0%" : state === "active" ? "60%" : "100%" }}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  <span className="font-mono-ui uppercase tracking-[0.14em] text-primary">Evidence — </span>
                  {s.evidence}
                  {state === "done" ? ` · ${hash(ticket + s.key).slice(0, 16)}` : ""}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-mono-ui uppercase tracking-[0.14em] text-primary">In plain words — </span>
                  {s.plain}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1400px] px-6">
        <Rule label="Parallel regulator window" />
        <div className="grid gap-px bg-rule/15 md:grid-cols-3">
          {REGULATORS.map((r, i) => {
            const idx = STAGES.findIndex((s) => s.key === "parallel");
            const active = step >= idx;
            return (
              <div key={r.code} className="bg-background p-6">
                <div className="flex items-center justify-between">
                  <p className="font-display text-3xl">{r.code}</p>
                  <span
                    className={`font-mono-ui text-[10px] uppercase tracking-[0.16em] ${active ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {active ? "Receipt issued" : "Awaiting file"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.scope}</p>
                <p className="tnum mt-3 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {active ? hash(ticket + r.code + i).slice(0, 24) : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1400px] px-6">
        <Rule label="Outcome" />
        <div className="grid gap-px border border-rule/25 bg-rule/15 md:grid-cols-3">
          <Stat k="Status" v={done ? (route === "Approval" ? "Approval file cleared" : "Cleared — automatic route") : "Not yet submitted"} />
          <Stat k="UIN" v={done ? uin : "—"} />
          <Stat k="Landing hub" v={`${flag(meta.iso2)} ${hub.city} · ${meta.currency}`} />
        </div>
        <div className="mt-px border border-rule/25 p-6">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Immutable ledger block
          </p>
          <p className="tnum mt-3 break-all font-mono-ui text-sm">
            {done ? hash(ticket + uin + amountCr) : "block written on clearance"}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">
              In plain words —
            </span>{" "}
            once cleared, the whole file is sealed with a fingerprint. Change one figure later and the
            fingerprint changes, so the record cannot be quietly edited — that is what turns compliance into
            integrity.
          </p>
        </div>
      </section>
      <div className="h-10" />
      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Continue on the rail" />
        <div className="mb-10">
          <DeskProcess3D desk="apply" />
        </div>
        <EngineRail desk="apply" />
      </section>
    </Frame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-background px-5 py-4">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-background px-5 py-5">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
      <p className="tnum font-display mt-2 break-words text-3xl">{v}</p>
    </div>
  );
}
