import { ForecastLede } from "@/components/site/ForecastLede";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { createFileRoute } from "@tanstack/react-router";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { useSession } from "@/lib/session";
import { ENGINE_META } from "@/lib/regulator";
import {
  ANSWER_LABELS,
  AUTO_STEPS,
  AUTO_TOTAL_S,
  DOC_STATUS_LABEL,
  MANUAL_BASELINE_DAYS,
  SCENARIOS_195,
  assess,
  computeMoney,
  csvOf,
  docGaps,
  docPack,
  download,
  explain,
  filingPlan,
  purposeCode,
  reconcile,
  type Answers,
  type Explanation,
  type Remittance,
} from "@/lib/section195";
import {
  ADVISORY_STATUS_LABEL,
  AO_ORDER_LABEL,
  DEFAULT_OPTIONS,
  PATTERN_LABEL,
  SERVICE_CLASS_LABEL,
  advisoryRows,
  femaAdvisory,
  predict195,
  type AdvisoryOptions,
  type Severity,
} from "@/lib/section195-advisory";
import { HUBS } from "@/data/hubs";
import { COUNTRY_META, FALLBACK_RATES } from "@/data/currencies";
import { NATURES_195, NATURE_FAMILIES } from "@/data/nature195";
import { useFxStream } from "@/lib/fx-stream";

/** Neutral fact set a nature-of-transaction preset is layered onto. */
const BASE_FACTS: Answers = {
  copyrightTransferred: false,
  rightToExploit: false,
  useOfProcessOrIP: false,
  dedicatedEquipment: false,
  humanServices: false,
  makeAvailable: false,
  peInIndia: false,
  standardisedProduct: false,
  treatyAvailable: true,
  treatyPackComplete: true,
  panFurnished: false,
  taxBorneByPayer: false,
};

const SEV_CLASS: Record<Severity, string> = {
  clear: "border-rule/30 text-muted-foreground",
  watch: "border-primary text-primary",
  act: "border-primary bg-primary text-primary-foreground",
};

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block bg-background p-4">
      <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
      >
        {options.map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}

const TITLE = "Section 195 Compliance Engine — Chargeability, TRC/10F, 15CA/15CB | CorpVidesh AI";
const DESC =
  "Determine whether an overseas payment is Royalty, Fee for Technical Services or non-chargeable business income, validate the TRC and Form 10F pack, and generate and reconcile Form 15CA and 15CB automatically.";

export const Route = createFileRoute("/section195")({
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
  component: Section195Page,
});

function Plain({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 border-l-2 border-primary bg-primary/[0.04] px-4 py-3">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">In plain words</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

const inr0 = (n: number) => `₹ ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;

function useClock(total: number, speed: number) {
  const [t, setT] = useState(0);
  const [on, setOn] = useState(false);
  const base = useRef(0);
  const start = useRef(0);
  useEffect(() => {
    if (!on) return;
    start.current = Date.now();
    base.current = t >= total ? 0 : t;
    const id = window.setInterval(() => {
      const next = base.current + ((Date.now() - start.current) / 1000) * speed;
      if (next >= total) {
        setT(total);
        setOn(false);
        return;
      }
      setT(next);
    }, 50);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, total, speed]);
  return { t, on, toggle: () => setOn((v) => !v), reset: () => { setOn(false); setT(0); }, setT };
}

function Section195Page() {
  const { session } = useSession();
  const [id, setId] = useState(SCENARIOS_195[0]!.id);
  const scenario = SCENARIOS_195.find((s) => s.id === id)!;
  const [answers, setAnswers] = useState<Answers>(scenario.remittance.answers);
  const [amount, setAmount] = useState(String(scenario.remittance.invoiceFx));
  const [ytd, setYtd] = useState(scenario.ytd);
  const [speed, setSpeed] = useState(4);
  const [opts, setOpts] = useState<AdvisoryOptions>(DEFAULT_OPTIONS);
  const [hubCity, setHubCity] = useState(HUBS[0]!.city);
  const [natureId, setNatureId] = useState(NATURES_195[0]!.id);
  const [matrix, setMatrix] = useState(false);
  const clock = useClock(AUTO_TOTAL_S, speed);
  const tape = useFxStream();

  const hub = HUBS.find((h) => h.city === hubCity) ?? HUBS[0]!;
  const hubMeta = COUNTRY_META[hub.country] ?? { iso2: "UN", currency: "USD", currencyName: "US Dollar" };
  const nature = NATURES_195.find((n) => n.id === natureId) ?? NATURES_195[0]!;
  const liveRate =
    tape.inrPer[hubMeta.currency] ??
    (FALLBACK_RATES[hubMeta.currency] ? 1 / FALLBACK_RATES[hubMeta.currency]! : 1);

  function pick(nextId: string) {
    const s = SCENARIOS_195.find((x) => x.id === nextId)!;
    setId(nextId);
    setMatrix(false);
    setAnswers(s.remittance.answers);
    setAmount(String(s.remittance.invoiceFx));
    setYtd(s.ytd);
    clock.reset();
  }

  function pickMatrix(city: string, nid: string) {
    const n = NATURES_195.find((x) => x.id === nid) ?? NATURES_195[0]!;
    const h = HUBS.find((x) => x.city === city) ?? HUBS[0]!;
    const treaty = !/no dtaa/i.test(h.treaty);
    setHubCity(city);
    setNatureId(nid);
    setMatrix(true);
    setAnswers({ ...BASE_FACTS, treatyAvailable: treaty, treatyPackComplete: treaty, ...n.facts });
    clock.reset();
  }

  const remittance: Remittance = matrix
    ? {
        vendor: `${nature.label.split(" — ")[0]} counterparty, ${hub.city}`,
        country: hub.country,
        currency: hubMeta.currency,
        invoiceFx: Math.max(0, Number(amount) || 0),
        fxRate: liveRate,
        purpose: nature.purpose,
        answers,
      }
    : {
        ...scenario.remittance,
        invoiceFx: Math.max(0, Number(amount) || 0),
        answers,
      };
  const charge = useMemo(() => assess(answers), [answers]);
  const money = computeMoney(remittance, charge, ytd);
  const plan = filingPlan(charge, money.ytd);
  const docs = docPack(remittance, charge);
  const gaps = docGaps(docs);
  const recon = reconcile(remittance, charge, money, plan);
  const predictions = useMemo(
    () => predict195(remittance, charge, money, docs, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remittance, charge, money, docs, opts],
  );
  const fema = useMemo(
    () => femaAdvisory(remittance, charge, money, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remittance, charge, money, opts],
  );
  const ctx = { r: remittance, charge, money, plan };

  const exportRows = () => [
    ["Field", "Value", "Statutory basis"],
    ["Vendor", remittance.vendor, "—"],
    ["Country of residence", remittance.country, "s.90(4) TRC"],
    ["Nature of remittance", charge.classification, "s.9(1)(vi) / s.9(1)(vii)"],
    ["Chargeable in India", charge.chargeable ? "Yes" : "No", "s.195(1)"],
    ["Rate applied", `${(charge.appliedRate * 100).toFixed(2)}%`, charge.rateBasis],
    ["Gross amount (INR)", money.grossedUp.toFixed(0), "s.195A"],
    ["Tax withheld (INR)", money.tds.toFixed(0), "s.195 / s.206AA"],
    ["Net to vendor (INR)", money.netToVendor.toFixed(0), "—"],
    ["Form 15CA part", `Part ${plan.part}`, plan.statute],
    ["Form 15CB required", plan.needs15CB ? "Yes" : "No", "Rule 37BB(2)"],
    ["RBI purpose code", purposeCode(charge), "FEMA reporting"],
    ["Determination digest", charge.digest, "sealed on the federated ledger"],
    ...charge.hits.map((h) => [`Rule · ${h.rule}`, h.answer, h.statute]),
  ];

  return (
    <Frame>
      <div className="mx-auto max-w-[1400px] px-6 py-14">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-primary">
          Section 09 — Section 195 core compliance engine
        </p>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
          Royalty, technical service, or nothing at all. Decided in seconds, defended in citations.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Every rupee an Indian company pays a foreign supplier — an AI model API, a SaaS seat, an engineering
          consultant — has to be tested under section 195 before it leaves. This desk runs the three
          obligations end to end: chargeability, the residence-document pack, and the Form 15CA / 15CB filing
          with its reconciliation.
        </p>
        <Plain>
          Indian law says: before you pay a foreign supplier, work out whether India is owed tax on that
          payment, collect proof of where the supplier is taxed, hold back the right amount, and tell the tax
          department. Doing this by hand takes about {MANUAL_BASELINE_DAYS} working days per invoice. Here it
          takes under two minutes, with the reason for every decision written down.
        </Plain>

        {/* ------------------------------------------------ scenario */}
        <section className="mt-16">
          <Rule label="01 — Pick a live vendor payment" />
          <div className="grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-5">
            {SCENARIOS_195.map((s) => {
              const on = s.id === id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(s.id)}
                  aria-pressed={on}
                  className={`bg-background p-4 text-left ${on ? "outline outline-2 -outline-offset-2 outline-primary" : ""}`}
                >
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
                    {s.remittance.country}
                  </p>
                  <p className="mt-1.5 font-display text-lg leading-tight tracking-tight">{s.label}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.blurb}</p>
                </button>
              );
            })}
          </div>

          {/* ---- 52 hubs × 52 natures, consolidated ---- */}
          <div className="mt-px grid gap-px border border-rule/20 bg-rule/15 lg:grid-cols-2">
            <label className="block bg-background p-4">
              <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Destination hub — 52 international finance hubs
              </span>
              <select
                value={hubCity}
                onChange={(e) => pickMatrix(e.target.value, natureId)}
                className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {HUBS.map((h) => (
                  <option key={h.city} value={h.city}>
                    {h.city} — {h.country} ({(COUNTRY_META[h.country] ?? { currency: "USD" }).currency})
                  </option>
                ))}
              </select>
            </label>
            <label className="block bg-background p-4">
              <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Nature of transaction — 52 vendor payment types
              </span>
              <select
                value={natureId}
                onChange={(e) => pickMatrix(hubCity, e.target.value)}
                className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {NATURE_FAMILIES.map((f) => (
                  <optgroup key={f} label={f}>
                    {NATURES_195.filter((n) => n.family === f).map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          {matrix && (
            <div className="mt-px border border-rule/20">
              <p className="font-mono-ui border-b border-rule/15 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-primary">
                Consolidated result — {hub.city}, {hub.country} · {nature.label}
              </p>
              <div className="grid gap-px bg-rule/15 md:grid-cols-3 xl:grid-cols-6">
                {[
                  ["Settlement currency", `${hubMeta.currency} · ₹${remittance.fxRate.toFixed(2)}`],
                  ["Classification", charge.classification],
                  ["Rate applied", `${(charge.appliedRate * 100).toFixed(2)}%`],
                  ["Tax withheld", inr0(money.tds)],
                  ["Net to vendor", inr0(money.netToVendor)],
                  ["Filing", `15CA Part ${plan.part}${plan.needs15CB ? " + 15CB" : ""}`],
                  ["FEMA route", hub.route],
                  ["Treaty position", hub.treaty],
                  ["Hub s.195 view", hub.wht],
                  ["RBI purpose code", purposeCode(charge)],
                  ["Evidence gaps", `${gaps.blocking.length} blocking · ${gaps.advisory.length} advisory`],
                  ["Clearance on rail", `${Math.round(AUTO_TOTAL_S)} s vs ${MANUAL_BASELINE_DAYS} days`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-background p-4">
                    <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                    <p className="mt-1.5 font-display text-xl leading-tight tracking-tight text-primary">{v}</p>
                  </div>
                ))}
              </div>
              <p className="border-t border-rule/15 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                {nature.purpose}. Expected character before treaty testing: {nature.expect}. Priced on the live
                rupee tape ({tape.status === "live" ? "live feed" : "indicative feed"}), settled through{" "}
                {hub.city} on the {hub.route} route.
              </p>
            </div>
          )}

          <div className="mt-px grid gap-4 border border-rule/20 p-5 md:grid-cols-3">
            <label className="block">
              <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Invoice value ({remittance.currency})
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Already remitted to this vendor this FY (₹)
              </span>
              <input
                type="number"
                value={ytd}
                onChange={(e) => setYtd(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 w-full border border-rule/25 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </label>
            <div>
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Invoice in rupees at ₹ {remittance.fxRate.toFixed(2)} / {remittance.currency}
              </p>
              <p className="mt-1.5 font-display text-3xl tracking-tight text-primary">{inr0(money.invoiceInr)}</p>
            </div>
          </div>

          <div className="mt-px grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-3">
            {ANSWER_LABELS.map((q) => {
              const on = answers[q.key];
              return (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => setAnswers((v) => ({ ...v, [q.key]: !v[q.key] }))}
                  aria-pressed={on}
                  className="flex items-start gap-3 bg-background p-4 text-left"
                >
                  <span
                    className={`mt-0.5 block h-4 w-4 shrink-0 border ${on ? "border-primary bg-primary" : "border-rule/40"}`}
                    aria-hidden
                  />
                  <span>
                    <span className="block text-sm leading-snug">{q.label}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">{q.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <Plain>
            These twelve switches are the facts a tax officer would ask about. Flip any one and watch the
            classification, the rate, the paperwork and the filing change with it — that is the whole
            assessment, made visible.
          </Plain>
        </section>

        {/* ------------------------------------------------ options */}
        <section className="mt-20">
          <Rule label="01B — Transaction options the officer will ask about" />
          <div className="grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
            <Select
              label="Order / certificate on record"
              value={opts.aoOrder}
              onChange={(v) => setOpts((o) => ({ ...o, aoOrder: v as AdvisoryOptions["aoOrder"] }))}
              options={Object.entries(AO_ORDER_LABEL)}
            />
            <Select
              label="Payment pattern"
              value={opts.pattern}
              onChange={(v) => setOpts((o) => ({ ...o, pattern: v as AdvisoryOptions["pattern"] }))}
              options={Object.entries(PATTERN_LABEL)}
            />
            <Select
              label="FEMA service classification"
              value={opts.serviceClass}
              onChange={(v) => setOpts((o) => ({ ...o, serviceClass: v as AdvisoryOptions["serviceClass"] }))}
              options={Object.entries(SERVICE_CLASS_LABEL)}
            />
            <Select
              label="Remittance channel"
              value={opts.channel}
              onChange={(v) => setOpts((o) => ({ ...o, channel: v as AdvisoryOptions["channel"] }))}
              options={[
                ["ad-cat-1", "AD Category-I bank, India"],
                ["gift-ifsc", "IFSC Banking Unit, GIFT City"],
              ]}
            />
          </div>
          <div className="mt-px grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-3">
            {(
              [
                ["nonFiler", "Vendor is a s.206AB specified non-filer", "Higher rate is tested"],
                ["relatedParty", "Associated enterprise (group company)", "Transfer pricing and FEMA arm's length"],
                ["sepTested", "Significant economic presence tested on file", "s.9(1)(i) Expl. 2A"],
                ["adEvidenceFiled", "Contract, invoice and A2 lodged with the bank", "FEMA s.10(5) evidence"],
                ["lateDeposit", "Tax deposited after the due date", "s.201(1A) runs at 1.5% a month"],
              ] as const
            ).map(([key, label, hint]) => {
              const on = opts[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setOpts((o) => ({ ...o, [key]: !o[key] }))}
                  className="flex items-start gap-3 bg-background p-4 text-left"
                >
                  <span
                    className={`mt-0.5 block h-4 w-4 shrink-0 border ${on ? "border-primary bg-primary" : "border-rule/40"}`}
                    aria-hidden
                  />
                  <span>
                    <span className="block text-sm leading-snug">{label}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">{hint}</span>
                  </span>
                </button>
              );
            })}
            <label className="bg-background p-4">
              <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Departmental queries on this vendor (last 3 years) — {opts.priorQueries}
              </span>
              <input
                type="range"
                min={0}
                max={6}
                value={opts.priorQueries}
                onChange={(e) => setOpts((o) => ({ ...o, priorQueries: Number(e.target.value) }))}
                className="mt-3 w-full accent-[hsl(var(--primary))]"
              />
            </label>
          </div>
          <Plain>
            These are the questions that decide whether the payment goes out quietly or comes back as a notice:
            is there an order on file, does the payment repeat, which bank channel, and has anyone asked about
            this supplier before. Change any of them and the forecast below re-prices immediately.
          </Plain>
        </section>

        {/* ------------------------------------------------ predictions */}
        <section className="mt-20">
          <Rule label="01C — Predictive results, not a report" />
          <div className="grid gap-px border border-rule/20 bg-rule/15 lg:grid-cols-2">
            {predictions.map((p) => (
              <article key={p.id} className="bg-background p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-lg leading-tight tracking-tight">{p.label}</p>
                  <span
                    className={`font-mono-ui shrink-0 border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${SEV_CLASS[p.severity]}`}
                  >
                    {p.severity === "act" ? "Act now" : p.severity === "watch" ? "Watch" : "Clear"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <span className="font-display text-3xl tracking-tight text-primary">{p.p50}</span>
                  <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    p90 {p.p90} · confidence {(p.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="font-mono-ui mt-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  {p.basis}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {p.drivers.map((d) => (
                    <li key={d} className="border-l border-rule/25 pl-3 text-xs leading-relaxed text-muted-foreground">
                      {d}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-l-2 border-primary bg-primary/[0.04] px-3 py-2 text-sm leading-relaxed">
                  <span className="font-mono-ui mr-2 text-[9px] uppercase tracking-[0.16em] text-primary">Do this</span>
                  {p.action}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.comparator}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------ FEMA advisory */}
        <section className="mt-20">
          <Rule label="01D — FEMA law advisory on the same facts" />
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Section 195 decides what India taxes. FEMA decides whether the money may leave at all, and the AD
            Category-I bank has to be satisfied on both before it releases a rupee. This advisory reads the
            same determination and prices the exchange-control leg next to the tax leg.
          </p>
          <ol className="mt-6 border border-rule/20">
            {fema.map((f, i) => (
              <li
                key={f.id}
                className={`grid gap-3 border-b border-rule/12 px-4 py-4 last:border-b-0 lg:grid-cols-[1.4fr_1.6fr] ${
                  f.status === "blocking" ? "bg-primary/[0.06]" : ""
                }`}
              >
                <div>
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")} · {f.provision}
                  </p>
                  <p className="mt-1.5 font-display text-lg leading-tight tracking-tight">{f.title}</p>
                  <span
                    className={`font-mono-ui mt-2 inline-block border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${
                      f.status === "blocking"
                        ? "border-primary bg-primary text-primary-foreground"
                        : f.status === "attention"
                          ? "border-primary text-primary"
                          : "border-rule/30 text-muted-foreground"
                    }`}
                  >
                    {ADVISORY_STATUS_LABEL[f.status]}
                  </span>
                </div>
                <div>
                  <p className="text-sm leading-relaxed">{f.detail}</p>
                  <p className="mt-2 text-sm leading-relaxed text-primary">Action: {f.action}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">In plain words: {f.plain}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                download(
                  "corpvidesh-195-advisory.csv",
                  csvOf(advisoryRows(predictions, fema)),
                  "text/csv",
                )
              }
              className="font-mono-ui border border-primary px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-primary"
            >
              Export forecast + FEMA advisory · CSV
            </button>
            <button
              type="button"
              onClick={() =>
                download(
                  "corpvidesh-195-advisory.json",
                  JSON.stringify({ remittance, charge, predictions, fema, options: opts }, null, 2),
                  "application/json",
                )
              }
              className="font-mono-ui border border-rule/30 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              Export JSON
            </button>
          </div>
          <Plain>
            Two laws, one screen. The tax engine says how much India keeps; the FEMA advisory says whether the
            bank may send the rest, what the banker must see first, and what it costs if the answer is wrong —
            up to three times the amount remitted.
          </Plain>
        </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="Section 195 desk" focus={["cost", "rework"]} />
      </section>

        {/* ------------------------------------------------ determination */}
        <section className="mt-20">
          <Rule label="02 — Chargeability determination" />
          <div className="grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Classification", charge.classification],
              ["Chargeable in India", charge.chargeable ? "Yes" : "No"],
              ["Rate applied", `${(charge.appliedRate * 100).toFixed(0)}%`],
              ["Engine confidence", `${(charge.confidence * 100).toFixed(0)}%`],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                <p className="mt-1.5 font-display text-2xl leading-tight tracking-tight text-primary">{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-muted-foreground">{charge.rateBasis}</p>

          <ol className="mt-6 border border-rule/20">
            {charge.hits.map((h) => (
              <li
                key={h.id}
                className={`grid gap-3 border-b border-rule/12 px-4 py-4 last:border-b-0 lg:grid-cols-[1.6fr_0.5fr_1.6fr] lg:items-start ${h.decisive ? "bg-primary/[0.04]" : ""}`}
              >
                <div>
                  <p className="text-sm leading-snug">{h.rule}</p>
                  <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    {h.statute} · {ENGINE_META[h.engine].label}
                  </p>
                </div>
                <p
                  className={`font-mono-ui text-[11px] uppercase tracking-[0.16em] ${h.answer === "Yes" ? "text-primary" : "text-muted-foreground"}`}
                >
                  {h.answer}
                  {h.decisive ? " · decisive" : ""}
                </p>
                <div>
                  <p className="text-xs leading-relaxed">{h.effect}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">In plain words: {h.plain}</p>
                </div>
              </li>
            ))}
          </ol>

          <ExplainPanel answers={answers} />

          <div className="mt-px grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Gross (after s.195A gross-up)", inr0(money.grossedUp)],
              ["Tax withheld", inr0(money.tds)],
              ["Net paid to the vendor", inr0(money.netToVendor)],
              ["RBI purpose code", purposeCode(charge)],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                <p className="mt-1.5 font-display text-2xl tracking-tight text-primary">{v}</p>
              </div>
            ))}
          </div>
          <Plain>
            A subscription to a foreign AI tool is usually just a purchase, so no Indian tax is held back — but
            the moment source code, a secret method or dedicated hardware is involved, the same payment becomes
            a royalty taxed at source. The engine draws that line the way the Supreme Court drew it, and cites
            the case.
          </Plain>
        </section>

        {/* ------------------------------------------------ documents */}
        <section className="mt-20">
          <Rule label="03 — Non-resident documentation tracker" />
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`font-mono-ui px-4 py-2 text-[11px] uppercase tracking-[0.16em] ${gaps.clear ? "bg-primary text-primary-foreground" : "border border-primary text-primary"}`}
            >
              {gaps.clear ? "Pack complete — remittance may proceed" : `${gaps.blocking.length} blocking gap(s) — remittance held`}
            </span>
            <button
              onClick={() =>
                download(
                  `trc-10f-pack-${remittance.vendor.replace(/\W+/g, "-").toLowerCase()}.csv`,
                  csvOf([
                    ["Document", "Statute", "Blocking", "Status", "Valid till", "Check performed"],
                    ...docs.map((d) => [d.name, d.statute, d.blocking ? "Yes" : "No", DOC_STATUS_LABEL[d.status], d.validTill ?? "—", d.check]),
                  ]),
                  "text/csv",
                )
              }
              className="font-mono-ui border border-rule/25 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
            >
              Export document register (CSV)
            </button>
          </div>

          <ul className="mt-6 border border-rule/20">
            {docs.map((d) => (
              <li key={d.id} className="grid gap-3 border-b border-rule/12 px-4 py-4 last:border-b-0 lg:grid-cols-[1.5fr_1.3fr_1.4fr]">
                <div>
                  <p className="text-sm leading-snug">{d.name}</p>
                  <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    {d.statute}
                  </p>
                  <p
                    className={`font-mono-ui mt-2 inline-block px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${d.status === "valid" ? "bg-primary text-primary-foreground" : "border border-primary text-primary"}`}
                  >
                    {DOC_STATUS_LABEL[d.status]}
                    {d.validTill ? ` · till ${d.validTill}` : ""}
                    {d.blocking ? " · blocking" : ""}
                  </p>
                </div>
                <div>
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    Machine-read fields · {ENGINE_META[d.engine].label}
                  </p>
                  <ul className="mt-2 grid gap-1">
                    {d.extracted.map((x) => (
                      <li key={x.label} className="text-xs leading-relaxed">
                        <span className="text-muted-foreground">{x.label} — </span>
                        {x.value}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs leading-relaxed">{d.check}</p>
                  <p className="mt-2 border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">
                    In plain words: {d.plain}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Plain>
            Treaty relief is not a claim, it is a file. If the residency certificate, the electronic Form 10F or
            the no-office declaration is missing or out of date on the day of payment, the cheaper treaty rate
            simply does not exist and the rate jumps. This tracker refuses to let the payment move until the
            file is whole.
          </Plain>
        </section>

        {/* ------------------------------------------------ filings */}
        <section className="mt-20">
          <Rule label="04 — Form 15CA / 15CB generation and reconciliation" />
          <div className="grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Form 15CA", `Part ${plan.part}`],
              ["Form 15CB certificate", plan.needs15CB ? "Required" : "Not required"],
              ["Aggregate this FY", inr0(money.ytd)],
              ["Reconciliation", recon.every((r) => r.matched) ? "4 sources agree" : "Break detected"],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                <p className="mt-1.5 font-display text-2xl tracking-tight text-primary">{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-muted-foreground">
            {plan.reason} <span className="text-primary">{plan.statute}</span>
          </p>

          <div className="mt-6 overflow-x-auto border border-rule/20">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-rule/20">
                  {["Field", "Engine determination", "Form 15CB", "Form 15CA", "AD bank advice", "Match"].map((h) => (
                    <th key={h} className="font-mono-ui px-4 py-2 text-left text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recon.map((r) => (
                  <tr key={r.field} className="border-b border-rule/12">
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{r.field}</td>
                    <td className="px-4 py-2.5 text-sm">{r.fromDetermination}</td>
                    <td className="px-4 py-2.5 text-sm">{r.from15CB}</td>
                    <td className="px-4 py-2.5 text-sm">{r.from15CA}</td>
                    <td className="px-4 py-2.5 text-sm">{r.fromBankAdvice}</td>
                    <td className="font-mono-ui px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-primary">
                      {r.matched ? "matched" : "break"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => download(`15ca-15cb-determination-${charge.digest}.csv`, csvOf(exportRows()), "text/csv")}
              className="font-mono-ui bg-primary px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
            >
              Export determination (CSV)
            </button>
            <button
              onClick={() =>
                download(
                  `15ca-part-${plan.part}-${charge.digest}.json`,
                  JSON.stringify({ remittance, charge, money, plan, reconciliation: recon }, null, 2),
                  "application/json",
                )
              }
              className="font-mono-ui border border-rule/25 px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
            >
              Machine-readable filing pack (JSON)
            </button>
            <span className="font-mono-ui self-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              determination digest {charge.digest}
            </span>
          </div>
          <Plain>
            Form 15CB is the accountant's certificate and Form 15CA is the declaration the bank needs before it
            releases money abroad. Because both are produced from one determination, the certificate, the
            declaration, the bank advice and the quarterly TDS return can never quietly disagree — which is
            exactly the mismatch that triggers notices years later.
          </Plain>
        </section>

        {/* ------------------------------------------------ automation */}
        <section className="mt-20">
          <Rule label="05 — The automation rail, replayed" />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={clock.toggle}
              className="font-mono-ui bg-primary px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
            >
              {clock.on ? "Pause" : clock.t > 0 && clock.t < AUTO_TOTAL_S ? "Resume" : "Run the section 195 rail"}
            </button>
            <button
              onClick={clock.reset}
              className="font-mono-ui border border-rule/25 px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
            >
              Reset
            </button>
            {[1, 2, 4, 10].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={`font-mono-ui border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${speed === s ? "border-primary bg-primary text-primary-foreground" : "border-rule/25 text-muted-foreground hover:border-primary hover:text-primary"}`}
              >
                {s}×
              </button>
            ))}
            <span className="font-mono-ui text-[11px] uppercase tracking-[0.16em] text-primary">
              T+{clock.t.toFixed(0)}s / {AUTO_TOTAL_S}s
            </span>
          </div>

          <ul className="mt-6 border border-rule/20">
            {AUTO_STEPS.map((s) => {
              const started = clock.t >= s.atS;
              const done = clock.t >= s.atS + s.durationS;
              const pct = Math.min(100, Math.max(0, ((clock.t - s.atS) / s.durationS) * 100));
              return (
                <li key={s.id} className="grid gap-3 border-b border-rule/12 px-4 py-3.5 last:border-b-0 lg:grid-cols-[1.5fr_1.2fr_1.5fr] lg:items-center">
                  <div>
                    <p className="text-sm leading-snug">{s.title}</p>
                    <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                      +{s.atS}s → +{s.atS + s.durationS}s · {ENGINE_META[s.engine].label}
                    </p>
                  </div>
                  <div className="h-3 w-full border border-rule/25">
                    <div className="h-full bg-primary" style={{ width: `${started ? pct : 0}%` }} />
                  </div>
                  <div>
                    <p className={`text-xs leading-relaxed ${done ? "text-primary" : "text-muted-foreground"}`}>
                      {done ? s.detail(ctx) : started ? "running" : "queued"}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">In plain words: {s.plain}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-px grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Manual baseline per invoice", `${MANUAL_BASELINE_DAYS} working days`],
              ["On this rail", `${AUTO_TOTAL_S} seconds`],
              ["Cycle-time compression", `${Math.round((MANUAL_BASELINE_DAYS * 8 * 3600) / AUTO_TOTAL_S).toLocaleString("en-IN")}×`],
              ["Human touchpoints left", plan.needs15CB ? "1 — the CA signature" : "0"],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</p>
                <p className="mt-1.5 font-display text-2xl tracking-tight text-primary">{v}</p>
              </div>
            ))}
          </div>
          <Plain>
            Nothing here removes the chartered accountant — it removes the retyping. The only human act left is
            the signature that the law actually reserves for a human, and it is captured with a digital
            signature and a UDIN so it can be proved later.
          </Plain>
        </section>

        {/* ------------------------------------------------ architecture */}
        <section className="mt-20">
          <Rule label="06 — How the section 195 workflow is built" />
          <div className="grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
            {[
              [
                "Deterministic rule tree",
                "Chargeability is decided by an ordered set of statutory tests, not by a model's opinion. The same facts always produce the same answer and the same citations.",
              ],
              [
                "Reasoning layer",
                "Language models read the agreement, extract the scope clause and map it onto the tests. They propose facts; the rule tree decides law.",
              ],
              [
                "Document intelligence",
                "TRC, Form 10F, No-PE and beneficial-ownership papers are parsed, dated, cross-matched and expiry-tracked in an India-resident region.",
              ],
              [
                "Sealed determination",
                "Every determination is hashed with its inputs and committed to the federated ledger the regulators hold, so it can be re-proved years later.",
              ],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-5">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">{k}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v}</p>
              </div>
            ))}
          </div>
          <pre className="mt-6 overflow-x-auto border border-rule/20 p-5 font-mono-ui text-[11px] leading-relaxed text-muted-foreground">
{`invoice + agreement
      │  document intelligence  (extract scope, amount, currency, vendor)
      ▼
chargeability rule tree   s.9(1)(vi) · s.9(1)(vii) · Art. 12 DTAA · Engineering Analysis (SC)
      │        ├── Royalty / Equipment royalty
      │        ├── Fee for Technical Services (make-available tested)
      │        └── Business income — not chargeable
      ▼
rate selection            s.115A  vs  treaty s.90(2)  vs  s.206AA / Rule 37BC
      ▼
document gate             TRC (s.90(4)) · Form 10F (Rule 21AB, e-filed) · No-PE · BO declaration
      │  blocking gaps hold the remittance
      ▼
filing engine             Rule 37BB → 15CA Part A / B / C / D  ·  15CB draft → CA digital signature
      ▼
reconciliation            determination ↔ 15CB ↔ 15CA ↔ AD bank advice ↔ 27Q ↔ challan
      ▼
ledger commit             hashed determination sealed to every regulator node`}
          </pre>
          <Plain>
            The law decides, the machine assembles. Models are used where judgement about words is needed —
            reading a contract — and never where the statute already gives a rule.
          </Plain>
        </section>

        <div className="mt-20">
          <div className="mb-10">
            <DeskProcess3D desk="corporate" />
          </div>
          <EngineRail desk="corporate" session={session} />
        </div>
      </div>
    </Frame>
  );
}

/** One-click explainability: the exact branch walk, the facts that carried it,
 *  the rate build-up and every single-fact flip that would change the answer. */
function ExplainPanel({ answers }: { answers: Answers }) {
  const [open, setOpen] = useState(false);
  const ex: Explanation = useMemo(() => explain(answers), [answers]);
  const movers = ex.counterfactuals.filter((c) => c.changes);

  const exportExplain = () =>
    download(
      `corpvidesh-why-${ex.classification.replace(/\W+/g, "-").toLowerCase()}.csv`,
      csvOf([
        ["Section", "Item", "Detail"],
        ...ex.narrative.map((n, i) => ["Summary", `Line ${i + 1}`, n]),
        ...ex.path.map((b) => [
          "Rule path",
          `Branch ${b.order} · ${b.question}`,
          `${b.evaluated ? (b.taken ? "TAKEN" : "not taken") : "not reached"} · ${b.test} · ${b.statute} · ${b.outcome}`,
        ]),
        ...ex.decisiveFacts.map((f) => ["Decisive fact", `${f.label} = ${f.value ? "Yes" : "No"}`, f.why]),
        ...ex.rateStory.map((r) => ["Rate build-up", r.step, `${r.statute} — ${r.result}`]),
        ...ex.counterfactuals.map((c) => [
          "If this fact flipped",
          `${c.label}: ${c.from ? "Yes" : "No"} → ${c.to ? "Yes" : "No"}`,
          c.effect,
        ]),
        ["Determination digest", ex.digest, "sealed on the federated ledger"],
      ]),
      "text/csv",
    );

  return (
    <div className="mt-px border border-rule/20">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-primary/[0.04] px-4 py-3">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Why this classification
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {ex.classification} · decided at branch {ex.decidedAt.replace("b", "")} of 4 ·{" "}
            {movers.length} of 12 facts could change it
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="font-mono-ui border border-primary bg-primary px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-primary-foreground"
          >
            {open ? "Hide the reasoning" : "Explain this determination"}
          </button>
          {open ? (
            <button
              onClick={exportExplain}
              className="font-mono-ui border border-rule/30 px-4 py-2 text-[10px] uppercase tracking-[0.16em]"
            >
              Export CSV
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="border-t border-rule/20 p-5">
          <ul className="grid gap-2">
            {ex.narrative.map((n) => (
              <li key={n} className="text-sm leading-relaxed text-muted-foreground">
                — {n}
              </li>
            ))}
          </ul>

          <p className="font-mono-ui mt-6 text-[10px] uppercase tracking-[0.18em] text-primary">
            Rule path walked
          </p>
          <ol className="mt-2 grid gap-px bg-rule/15">
            {ex.path.map((b) => (
              <li
                key={b.id}
                className={`bg-background p-4 ${b.taken && b.evaluated ? "border-l-2 border-primary" : b.evaluated ? "" : "opacity-55"}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="text-sm leading-snug">
                    <span className="font-mono-ui mr-2 text-[11px] text-primary">
                      {String(b.order).padStart(2, "0")}
                    </span>
                    {b.question}
                  </p>
                  <span
                    className={`font-mono-ui text-[10px] uppercase tracking-[0.14em] ${
                      !b.evaluated ? "text-muted-foreground" : b.taken ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {!b.evaluated ? "not reached" : b.taken ? "branch taken" : "branch not taken"}
                  </span>
                </div>
                <p className="font-mono-ui mt-2 text-[10px] tracking-[0.08em] text-primary">{b.test}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {b.facts.map((f) => (
                    <span
                      key={f}
                      className={`font-mono-ui border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${
                        answers[f] ? "border-primary bg-primary/10 text-primary" : "border-rule/30 text-muted-foreground"
                      }`}
                    >
                      {ANSWER_LABELS.find((x) => x.key === f)?.label ?? f} · {answers[f] ? "Yes" : "No"}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed">{b.outcome}</p>
                <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  {b.statute}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">In plain words: {b.plain}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                Fact switches that carried the answer
              </p>
              <ul className="mt-2 grid gap-px bg-rule/15">
                {ex.decisiveFacts.map((f) => (
                  <li key={f.key + f.why} className="bg-background p-3">
                    <p className="text-sm">
                      {f.label} ·{" "}
                      <span className="font-mono-ui text-[11px] text-primary">{f.value ? "Yes" : "No"}</span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.why}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
                Rate build-up
              </p>
              <ul className="mt-2 grid gap-px bg-rule/15">
                {ex.rateStory.map((r) => (
                  <li key={r.step} className="bg-background p-3">
                    <p className="text-sm">
                      {r.step} — <span className="text-muted-foreground">{r.result}</span>
                    </p>
                    <p className="font-mono-ui mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                      {r.statute}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="font-mono-ui mt-6 text-[10px] uppercase tracking-[0.18em] text-primary">
            Flip one fact, see the answer move
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-rule/20">
                  {["Fact switch", "Flip", "Classification then", "Rate then", "Effect"].map((h) => (
                    <th
                      key={h}
                      className="font-mono-ui px-3 py-2 text-left text-[9px] uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ex.counterfactuals.map((c) => (
                  <tr key={c.key} className={`border-b border-rule/12 ${c.changes ? "bg-primary/[0.04]" : ""}`}>
                    <td className="px-3 py-2 text-sm">{c.label}</td>
                    <td className="font-mono-ui px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {c.from ? "Yes" : "No"} → {c.to ? "Yes" : "No"}
                    </td>
                    <td className={`px-3 py-2 text-sm ${c.changes ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                      {c.classification}
                    </td>
                    <td className={`font-mono-ui px-3 py-2 text-[11px] ${c.changes ? "text-primary" : "text-muted-foreground"}`}>
                      {(c.appliedRate * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">{c.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Plain>
            This panel is the whole assessment written out: which question the engine asked, which answer you
            gave, which branch it therefore took, and which single change would have produced a different tax
            bill. A tax officer can check every line against the section printed next to it.
          </Plain>
        </div>
      ) : null}
    </div>
  );
}
