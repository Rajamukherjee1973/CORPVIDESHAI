import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AFRICA_HUBS, AFRICAN_BLOCS, BLOC_HUBS_IN_52, africaHubsInBloc, type AfricaHub, type AfricanBloc } from "@/data/africa-hubs";
import { flag } from "@/data/currencies";
import { useFxStream } from "@/lib/fx-stream";
import { scenarioAmounts, useTreasuryScenario } from "@/lib/treasury-scenario";

type Filter = "All" | AfricanBloc | "Both";
const FILTERS: Filter[] = ["All", "SADC", "COMESA", "Both"];

/** Venn layout: SADC circle left, COMESA right, dual members in the overlap. */
const POS: Record<string, { x: number; y: number; anchor: "start" | "middle" | "end" }> = {
  Johannesburg: { x: 135, y: 62, anchor: "start" },
  Gaborone: { x: 100, y: 112, anchor: "start" },
  Windhoek: { x: 80, y: 172, anchor: "start" },
  "Dar es Salaam": { x: 85, y: 236, anchor: "start" },
  Maputo: { x: 112, y: 290, anchor: "start" },
  Luanda: { x: 155, y: 330, anchor: "start" },
  Lusaka: { x: 300, y: 140, anchor: "middle" },
  Victoria: { x: 300, y: 205, anchor: "middle" },
  Mauritius: { x: 300, y: 272, anchor: "middle" },
  Cairo: { x: 465, y: 62, anchor: "end" },
  Kigali: { x: 505, y: 112, anchor: "end" },
  Kampala: { x: 520, y: 176, anchor: "end" },
  "Addis Ababa": { x: 515, y: 244, anchor: "end" },
  Nairobi: { x: 480, y: 300, anchor: "end" },
};

function inrLabel(rate: number | undefined): string {
  if (!rate || !Number.isFinite(rate)) return "Unavailable";
  return rate < 1 ? `₹${(rate * 100).toFixed(2)} / 100` : `₹${rate.toFixed(3)}`;
}

function compact(n: number | null, code: string): string {
  if (n === null) return "—";
  return `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n)} ${code}`;
}

export function AfricaHubs() {
  const [filter, setFilter] = useState<Filter>("All");
  const [city, setCity] = useState(AFRICA_HUBS[0]!.city);
  const [scenario, setScenario] = useTreasuryScenario();
  const fx = useFxStream();
  const shown = useMemo(() => africaHubsInBloc(filter), [filter]);
  const active: AfricaHub = AFRICA_HUBS.find((h) => h.city === city) ?? AFRICA_HUBS[0]!;
  const rate = fx.inrPer[active.currency];
  const landed = scenarioAmounts(scenario.amountCr, rate).foreignAmount;
  const inScenario = scenario.hub === active.city;
  const counts = {
    sadc: AFRICA_HUBS.filter((h) => h.blocs.includes("SADC")).length,
    comesa: AFRICA_HUBS.filter((h) => h.blocs.includes("COMESA")).length,
    both: AFRICA_HUBS.filter((h) => h.blocs.length === 2).length,
    dtaa: AFRICA_HUBS.filter((h) => h.dtaa === "In force").length,
  };

  return (
    <div>
      <div className="grid gap-px border border-border bg-border sm:grid-cols-5">
        {[
          [String(AFRICA_HUBS.length), "New African hubs", "Added beside the 52"],
          [String(counts.sadc), "In SADC", "Southern Africa"],
          [String(counts.comesa), "In COMESA", "Eastern & Southern Africa"],
          [String(counts.both), "In both blocs", "Lusaka · Victoria"],
          [String(counts.dtaa), "India DTAA in force", "Others: domestic rates"],
        ].map(([v, k, n]) => (
          <div key={k} className="bg-background p-4">
            <p className="font-display text-4xl text-primary">{v}</p>
            <p className="mt-1 text-sm font-medium">{k}</p>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{n}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by trade bloc">
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="rounded-none" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "All" ? `All ${AFRICA_HUBS.length}` : f === "Both" ? "Both blocs" : f}
          </Button>
        ))}
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{shown.length} shown</span>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="min-w-0 border border-border p-3">
          <svg viewBox="0 0 600 380" className="w-full" role="img" aria-label="SADC and COMESA membership of the African hubs">
            <circle cx="220" cy="190" r="160" className="fill-primary/5 stroke-primary" strokeWidth="1.5" />
            <circle cx="380" cy="190" r="160" className="fill-foreground/[0.03] stroke-foreground" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x="60" y="24" className="fill-primary font-mono-ui" fontSize="12" letterSpacing="2">SADC · 16 MEMBERS</text>
            <text x="540" y="24" textAnchor="end" className="fill-foreground font-mono-ui" fontSize="12" letterSpacing="2">COMESA · 21 MEMBERS</text>
            <text x="300" y="364" textAnchor="middle" className="fill-muted-foreground font-mono-ui" fontSize="10" letterSpacing="1.5">OVERLAP · MEMBER OF BOTH</text>
            {BLOC_HUBS_IN_52.map((h) => {
              const p = POS[h.city]!;
              const dx = p.anchor === "end" ? -10 : p.anchor === "start" ? 10 : 0;
              return (
                <g key={h.city}>
                  <circle cx={p.x} cy={p.y} r="4.5" className="fill-background stroke-muted-foreground" strokeWidth="1.5" />
                  <text x={p.x + dx} y={p.anchor === "middle" ? p.y + 18 : p.y + 4} textAnchor={p.anchor} fontSize="11" className="fill-muted-foreground">{h.city} · in 52</text>
                </g>
              );
            })}
            {AFRICA_HUBS.map((h) => {
              const p = POS[h.city]!;
              const on = shown.includes(h);
              const sel = h.city === active.city;
              const dx = p.anchor === "end" ? -17 : p.anchor === "start" ? 17 : 0;
              return (
                <g key={h.city} role="button" tabIndex={0} aria-label={`Select ${h.city}`} aria-pressed={sel} className="cursor-pointer outline-none" opacity={on ? 1 : 0.25}
                  onClick={() => setCity(h.city)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCity(h.city); } }}>
                  {sel && <circle cx={p.x} cy={p.y} r="12" className="fill-primary/15 stroke-primary" strokeWidth="1" />}
                  <circle cx={p.x} cy={p.y} r={sel ? 6.5 : 5} className={sel ? "fill-primary" : "fill-foreground"} />
                  <text x={p.x + dx} y={p.anchor === "middle" ? p.y + 20 : p.y + 4} textAnchor={p.anchor} fontSize="13" fontWeight={sel ? 700 : 500} className={sel ? "fill-primary" : "fill-foreground"}>{h.city}</text>
                </g>
              );
            })}
          </svg>
          <p className="px-1 pb-1 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Solid dots: the 10 new hubs · hollow dots: bloc members already within the 52</p>
        </div>

        <div className="min-w-0 border-t-4 border-primary bg-secondary/30 p-5">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">Selected corridor · India → {active.city}</p>
          <h3 className="font-display mt-2 text-4xl leading-none">
            <span aria-hidden="true">{flag(active.iso2)} </span>{active.city}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{active.country} · {active.currencyName} ({active.currency})</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {active.blocs.map((b) => <span key={b} className={`px-2 py-0.5 font-mono-ui text-[10px] uppercase tracking-[0.14em] ${b === "SADC" ? "bg-primary text-primary-foreground" : "border border-foreground"}`}>{b}</span>)}
            <span className={`px-2 py-0.5 font-mono-ui text-[10px] uppercase tracking-[0.14em] ${active.dtaa === "In force" ? "border border-primary text-primary" : "border border-border text-muted-foreground"}`}>{active.dtaa === "In force" ? "India DTAA in force" : active.treaty}</span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-px border border-border bg-border text-sm">
            {[
              [`${active.currency}/INR live`, inrLabel(rate)],
              [`₹${scenario.amountCr.toLocaleString("en-IN")} cr lands as`, compact(landed, active.currency)],
              ["Paper route today", `${active.days} days (illustrative)`],
              ["Stock exchange", active.exchange],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0 bg-background p-3">
                <dt className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{k}</dt>
                <dd className="mt-1 break-words font-medium tnum">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 space-y-2 text-sm leading-relaxed">
            <p><b>Financial centre.</b> {active.centre}</p>
            <p><b>Why Indian corporates go.</b> {active.indianAngle}</p>
            <p><b>India arrangement.</b> {active.arrangement}{active.verify ? " — confirm current status before reliance." : "."}</p>
            <p className="text-muted-foreground"><b className="text-foreground">Desk note.</b> {active.note}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button className="rounded-none" onClick={() => setScenario({ hub: active.city })} disabled={inScenario}>
              {inScenario ? <><Check /> In treasury scenario</> : <>Use {active.city} as scenario hub</>}
            </Button>
            <Button asChild variant="outline" className="rounded-none">
              <Link to="/console" onClick={() => setScenario({ hub: active.city })}>Run clearance in Console <ArrowRight /></Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">FX: {fx.status === "live" ? fx.source : "indicative fallback until the feed answers"}. Movement between feed snapshots is simulated.</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto border border-border">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              {["Hub", "Bloc", "Currency", "Live vs INR", "India treaty", "Exchange", "Why Indian corporates go"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-mono-ui text-[10px] font-medium uppercase tracking-[0.14em]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((h) => (
              <tr key={h.city} className={`cursor-pointer border-t border-border even:bg-secondary/50 ${h.city === active.city ? "outline outline-2 -outline-offset-2 outline-primary" : ""}`} onClick={() => setCity(h.city)}>
                <td className="px-3 py-2 font-medium"><span aria-hidden="true">{flag(h.iso2)} </span>{h.city}<span className="block text-xs font-normal text-muted-foreground">{h.country}</span></td>
                <td className="px-3 py-2 font-mono-ui text-[11px]">{h.blocs.join(" + ")}</td>
                <td className="px-3 py-2">{h.currency}</td>
                <td className="tnum px-3 py-2">{inrLabel(fx.inrPer[h.currency])}</td>
                <td className="px-3 py-2 text-muted-foreground">{h.dtaa === "In force" ? "DTAA in force" : h.treaty}</td>
                <td className="px-3 py-2 text-muted-foreground">{h.exchange}</td>
                <td className="px-3 py-2 text-muted-foreground">{h.indianAngle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-px border border-border bg-border md:grid-cols-3">
        {(Object.keys(AFRICAN_BLOCS) as AfricanBloc[]).map((k) => {
          const b = AFRICAN_BLOCS[k];
          return (
            <div key={k} className="bg-background p-5">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">{k}</p>
              <h3 className="font-display mt-2 text-2xl leading-tight">{b.name}</h3>
              <p className="mt-3 text-sm">{b.members} member states · founded {b.founded} · secretariat {b.secretariat}</p>
              <p className="mt-2 text-sm text-muted-foreground">{b.note}</p>
            </div>
          );
        })}
        <div className="bg-background p-5">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">Together</p>
          <h3 className="font-display mt-2 text-2xl leading-tight">Tripartite FTA &amp; AfCFTA</h3>
          <p className="mt-3 text-sm">SADC, COMESA and the EAC form the Tripartite Free Trade Area (in force July 2024); all three sit inside the African Continental Free Trade Area.</p>
          <p className="mt-2 text-sm text-muted-foreground">Already within the 52: {BLOC_HUBS_IN_52.map((h) => `${h.city} (${h.blocs.join(" + ")})`).join(", ")}.</p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Treaty status follows India's published comprehensive DTAA list; trade-bloc membership confers no Indian tax or FEMA relief by itself.
        Clearance days are illustrative prototype estimates. Not tax, legal or investment advice, and not a regulator approval.
      </p>
    </div>
  );
}
