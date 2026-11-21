import { useEffect, useMemo, useState } from "react";
import { COMPANIES } from "@/data/companies";
import { HUBS } from "@/data/hubs";
import { COUNTRY_META, FALLBACK_RATES, flag } from "@/data/currencies";

const CR = 1_00_00_000; // one crore

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}
function fx(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 }).format(n);
}

const GIFT = { city: "GIFT IFSC, Gandhinagar", iso2: "IN", currency: "INR", currencyName: "Indian Rupee" };

export function GiftDesk() {
  const [exchange, setExchange] = useState("All");
  const [companyName, setCompanyName] = useState(COMPANIES[0]!.name);
  const [hubCity, setHubCity] = useState("Singapore");
  const [amountCr, setAmountCr] = useState(1240);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [rateState, setRateState] = useState<"loading" | "live" | "indicative">("loading");
  const [asOf, setAsOf] = useState<string>("");

  useEffect(() => {
    let alive = true;
    fetch("https://open.er-api.com/v6/latest/INR")
      .then((r) => r.json())
      .then((d: { result?: string; rates?: Record<string, number>; time_last_update_utc?: string }) => {
        if (!alive || d.result !== "success" || !d.rates) throw new Error("bad feed");
        setRates({ ...FALLBACK_RATES, ...d.rates });
        setAsOf(d.time_last_update_utc ?? "");
        setRateState("live");
      })
      .catch(() => alive && setRateState("indicative"));
    return () => {
      alive = false;
    };
  }, []);

  const list = useMemo(
    () => COMPANIES.filter((c) => exchange === "All" || c.exchange.includes(exchange)),
    [exchange],
  );

  useEffect(() => {
    if (!list.some((c) => c.name === companyName) && list[0]) setCompanyName(list[0].name);
  }, [list, companyName]);

  const company = COMPANIES.find((c) => c.name === companyName) ?? COMPANIES[0]!;
  const hub = HUBS.find((h) => h.city === hubCity) ?? HUBS[0]!;
  const meta = COUNTRY_META[hub.country] ?? { iso2: "UN", currency: "USD", currencyName: "US Dollar" };
  const rate = rates[meta.currency] ?? FALLBACK_RATES[meta.currency] ?? 0;

  const headroomAfter = company.ceiling - company.used - amountCr;
  const utilisation = ((company.used + amountCr) / company.ceiling) * 100;
  const restricted = company.route === "Approval" && company.headroom > 0;
  const breach = headroomAfter < 0;
  const route: "Automatic" | "Approval" = breach || restricted ? "Approval" : "Automatic";
  const targetValue = amountCr * CR * rate;

  return (
    <div className="border border-rule/25">
      {/* controls */}
      <div className="grid gap-px bg-rule/15 lg:grid-cols-4">
        <Field label="Exchange">
          <select
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            className="w-full bg-transparent text-lg outline-none"
          >
            {["All", "NSE", "BSE"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label={`Listed entity (${list.length})`}>
          <select
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full bg-transparent text-lg outline-none"
          >
            {list.map((c) => (
              <option key={c.name} value={c.name}>
                {c.rank}. {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Target hub (${HUBS.length})`}>
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
        <Field label="Amount to send abroad (INR crore)">
          <input
            type="number"
            min={0}
            value={amountCr}
            onChange={(e) => setAmountCr(Math.max(0, Number(e.target.value) || 0))}
            className="tnum w-full bg-transparent text-lg outline-none"
          />
        </Field>
      </div>

      {/* corridor */}
      <div className="grid gap-px border-t border-rule/15 bg-rule/15 lg:grid-cols-[1fr_auto_1fr]">
        <Node
          side="Source — GIFT City, Gujarat"
          flagChar={GIFT.iso2}
          place={GIFT.city}
          currency={`${GIFT.currency} · ${GIFT.currencyName}`}
          value={`₹ ${inr(amountCr * CR)}`}
          sub={`₹ ${inr(amountCr)} crore leaving India`}
        />
        <div className="flex flex-col items-center justify-center bg-background px-8 py-6">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {rateState === "live" ? "Live rate" : rateState === "loading" ? "Fetching rate" : "Indicative rate"}
          </p>
          <p className="tnum font-display mt-2 text-2xl">
            1 INR = {rate < 1 ? rate.toFixed(4) : rate.toFixed(2)} {meta.currency}
          </p>
          <p className="tnum mt-1 text-xs text-muted-foreground">
            1 {meta.currency} = ₹{rate ? (1 / rate).toFixed(2) : "—"}
          </p>
          <span className="mt-4 block h-px w-24 bg-primary" />
          <p className="font-mono-ui mt-4 text-[10px] uppercase tracking-[0.16em] text-primary">
            {hub.route} corridor
          </p>
        </div>
        <Node
          side="Target hub"
          flagChar={meta.iso2}
          place={`${hub.city}, ${hub.country}`}
          currency={`${meta.currency} · ${meta.currencyName}`}
          value={`${meta.currency} ${fx(targetValue)}`}
          sub={`Settles in ${meta.currency} at the rate shown`}
        />
      </div>

      {/* determination */}
      <div className="grid gap-px border-t border-rule/15 bg-rule/15 md:grid-cols-2 xl:grid-cols-4">
        <Stat k="Net worth (audited)" v={`₹ ${inr(company.netWorth)} Cr`} />
        <Stat k="Rule 7 ceiling — 400%" v={`₹ ${inr(company.ceiling)} Cr`} />
        <Stat k="Already committed" v={`₹ ${inr(company.used)} Cr`} />
        <Stat
          k="Headroom after this remittance"
          v={`₹ ${inr(headroomAfter)} Cr`}
          tone={headroomAfter < 0 ? "alert" : undefined}
        />
      </div>

      <div className="border-t border-rule/15 bg-background p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`font-display px-4 py-1.5 text-2xl ${
              route === "Automatic"
                ? "bg-primary text-primary-foreground"
                : "border border-primary text-primary"
            }`}
          >
            {route} route
          </span>
          <span className="tnum font-mono-ui text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Ceiling utilisation {utilisation.toFixed(1)}%
          </span>
          <span className="font-mono-ui text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Treaty {hub.treaty} · s.195 {hub.wht} · today {hub.days} days · on rail 9 min
          </span>
        </div>
        <div className="mt-4 h-2 w-full bg-secondary">
          <div
            className="h-2 bg-primary transition-all"
            style={{ width: `${Math.min(100, utilisation)}%` }}
          />
        </div>
        <p className="mt-4 text-sm leading-relaxed">
          {breach
            ? "This commitment takes the group past 400% of net worth — prior RBI approval is required under Rule 9 before the remittance can leave."
            : restricted
              ? "Headroom exists, but the entity's activity is a restricted one — the approval route applies irrespective of the ceiling."
              : utilisation > 75
                ? "Within the 400% ceiling, so the automatic route applies — flagged above the 75% internal alert for treasury attention."
                : "Within the 400% ceiling — the automatic route applies under Rule 7, no prior approval needed."}
        </p>
        <p className="mt-3 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
          In plain words: a company may commit up to four times its own net worth abroad without
          asking the RBI first. Pick the company, pick the hub, type the rupee amount — the desk
          shows what lands at the other end in that hub's currency and whether the file goes the
          automatic or the approval way.
        </p>
        {asOf ? (
          <p className="font-mono-ui mt-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Rates as of {asOf}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block bg-background p-5">
      <span className="font-mono-ui block text-[10px] uppercase tracking-[0.18em] text-primary">
        {label}
      </span>
      <span className="mt-2 block border-b border-rule/30 pb-1.5">{children}</span>
    </label>
  );
}

function Node({
  side,
  flagChar,
  place,
  currency,
  value,
  sub,
}: {
  side: string;
  flagChar: string;
  place: string;
  currency: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-background p-6">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">{side}</p>
      <div className="mt-3 flex items-center gap-3">
        <img
          src={`https://flagcdn.com/w80/${flagChar.toLowerCase()}.png`}
          alt={`${place} flag`}
          width={40}
          height={27}
          className="border border-rule/20"
          loading="lazy"
        />
        <div>
          <p className="font-display text-2xl leading-tight">{place}</p>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {currency}
          </p>
        </div>
      </div>
      <p className="tnum font-display mt-5 text-4xl">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: "alert" | undefined }) {
  return (
    <div className="bg-background p-5">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {k}
      </p>
      <p className={`tnum font-display mt-2 text-3xl ${tone === "alert" ? "text-primary" : ""}`}>
        {v}
      </p>
    </div>
  );
}
