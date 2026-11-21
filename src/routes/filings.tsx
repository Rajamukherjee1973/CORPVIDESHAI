import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame } from "@/components/site/Frame";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Download } from "lucide-react";
import { scoreRbiFlow, usdMnToCrore } from "@/lib/frontier";
import { useFxStream } from "@/lib/fx-stream";
import { filingsFor, groupByCompany } from "@/lib/filings";
import { useFilingsDataset } from "@/lib/use-filings-dataset";
import { latestSubmission } from "@/lib/filing-submissions";
import { useRegulatorFilings } from "@/lib/use-regulator-filings";

const TITLE = "Outbound Filings Register — Company ODI Transfers for Regulators | CorpVidesh AI";
const DESC = "Every Indian company's outbound overseas investment from RBI's monthly release, with amounts, reporting dates, required Form FC and APR filings and risk flags for regulator review.";

export const Route = createFileRoute("/filings")({
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
  component: FilingsPage,
});

const LABEL = "font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground";
const usd = (v: number) => `$${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}m`;

function FilingsPage() {
  const ds = useFilingsDataset();
  const { records, user, error: recordsError, isLoading } = useRegulatorFilings();
  const tape = useFxStream();
  const usdInr = tape.inrPer["USD"] ?? 95;
  const [q, setQ] = useState("");
  const [flag, setFlag] = useState<"all" | "flagged">("all");
  const [open, setOpen] = useState<string | null>(null);

  const companies = useMemo(() => groupByCompany(ds.rows, ds.period).map((c) => {
    const scored = c.rows.map(scoreRbiFlow);
    const worst = scored.some((s) => s.level === "Critical") ? "Critical" : scored.some((s) => s.level === "Elevated") ? "Elevated" : "Watch";
    return { ...c, scored, worst };
  }), [ds]);
  const shown = companies.filter((c) => (flag === "all" || c.worst !== "Watch") && (!q || `${c.party} ${c.countries.join(" ")} ${c.rows.map((r) => r.jv).join(" ")}`.toLowerCase().includes(q.toLowerCase())));

  function exportCsv() {
    const lines = [["Company", "Overseas entity", "Country", "Activity", "Reporting month", "Equity $m", "Loan $m", "Guarantee $m", "Total $m", "Filing", "Due by", "Risk", "Form FC status (simulation only)", "Simulated filed date", "Officer declaration (signed-in account)", "Authority declaration"].join(",")];
    for (const c of shown) for (const r of c.scored) {
      const fs = filingsFor(r, ds.period);
      const submission = latestSubmission(records, c.party, ds.period);
      lines.push([c.party, r.jv, r.country, r.activity, ds.period, r.equity, r.loan, r.guarantee, r.total, fs.map((f) => f.form).join(" + "), fs.map((f) => f.due).join(" / "), r.level, submission ? "Filed (simulation)" : (!user ? "Sign in to view" : recordsError || isLoading ? "Status unavailable" : "Not recorded (simulation)"), submission?.filedOn ?? "", submission?.officer ?? "", submission?.authority ?? ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `odi-filings-${ds.period.replace(" ", "-")}.csv`;
    a.click();
  }

  return (
    <Frame>
      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className={LABEL}>Regulator review · Outbound filings register</p>
        <h1 className="font-display mt-3 text-4xl text-primary md:text-5xl">Who sent money abroad, how much, and what they must file</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Real company transfers from RBI's overseas investment release for {ds.period}
          {ds.released ? ` (published ${ds.released})` : ""}. RBI publishes the month, not the day of each transfer, so filing due dates use the latest possible date in that month.{" "}
          <a href={ds.url} target="_blank" rel="noreferrer" className="text-primary underline">Source</a>
        </p>

        <div className="mt-8 grid gap-px bg-rule/15 sm:grid-cols-4">
          {[["Companies", companies.length], ["Transfers", ds.rows.length], ["Total", usd(companies.reduce((s, c) => s + c.totalUsdMn, 0))], ["Flagged for review", companies.filter((c) => c.worst !== "Watch").length]].map(([k, v]) => (
            <div key={k} className="bg-background p-5"><p className={LABEL}>{k}</p><p className="font-display tnum mt-2 text-2xl text-primary">{v}</p></div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, overseas entity or country" className="w-full max-w-sm border-b border-rule/25 bg-transparent pb-1 text-sm outline-none focus:border-primary" />
          {(["all", "flagged"] as const).map((f) => (
            <Button key={f} type="button" variant={flag === f ? "default" : "outline"} size="sm" onClick={() => setFlag(f)}>{f === "all" ? "All companies" : "Flagged only"}</Button>
          ))}
          <Button asChild variant="outline"><Link to="/regulator-portal">Regulator portal</Link></Button>
          <Button asChild variant="outline"><Link to="/filing-submission"><ClipboardCheck /> Record Form FC</Link></Button>
          <Button type="button" onClick={exportCsv} className="sm:ml-auto"><Download /> Export CSV</Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Form FC demonstration statuses are account-protected and saved in Lovable Cloud, not verified RBI or AD-bank records. “Not recorded” does not mean unfiled.</p>

        {!user && <p className="mt-3 text-sm text-primary">Sign in to view saved filing statuses. Public RBI transfers remain available below.</p>}
        {isLoading && <p className="mt-3 text-sm">Loading saved filing statuses…</p>}
        {recordsError && <p role="alert" className="mt-3 text-sm text-destructive">{recordsError.message} Saved status is unavailable.</p>}
        <div className="mt-4 border border-rule/20">
          {shown.slice(0, 150).map((c) => (
            <div key={c.party} className="border-b border-rule/10">
              <Button type="button" variant="ghost" aria-expanded={open === c.party} onClick={() => setOpen(open === c.party ? null : c.party)} className="flex h-auto w-full flex-wrap items-baseline justify-between gap-3 whitespace-normal rounded-none px-5 py-4 text-left">
                <span>
                  <span className="text-sm font-medium">{c.party}</span>
                  <span className="font-mono-ui ml-3 text-[10px] text-muted-foreground">{c.rows.length} transfer{c.rows.length > 1 ? "s" : ""} · {c.countries.join(", ")}</span>
                  <span className="mt-2 block text-xs text-primary">Form FC · {latestSubmission(records, c.party, ds.period) ? `Filed (simulation) · ${latestSubmission(records, c.party, ds.period)?.filedOn}` : (!user ? "Sign in to view" : recordsError || isLoading ? "Status unavailable" : "Not recorded (simulation)")}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className={`font-mono-ui px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${c.worst === "Critical" ? "bg-primary text-primary-foreground" : c.worst === "Elevated" ? "border border-primary text-primary" : "text-muted-foreground"}`}>{c.worst}</span>
                  <span className="tnum text-sm text-primary">{usd(c.totalUsdMn)} · ₹{usdMnToCrore(c.totalUsdMn, usdInr).toLocaleString("en-IN", { maximumFractionDigits: 0 })} cr</span>
                </span>
              </Button>
              {open === c.party && (
                <div className="overflow-x-auto px-5 pb-5">
                  <table className="w-full min-w-[900px] text-left text-xs">
                    <thead><tr className={`${LABEL} border-b border-rule/20`}>{["Overseas entity", "Country", "Month", "Equity", "Loan", "Guarantee", "Total", "Filings required · due by", "Why flagged"].map((h) => <th key={h} className="py-2 pr-3 font-normal">{h}</th>)}</tr></thead>
                    <tbody>
                      {c.scored.map((r, i) => (
                        <tr key={i} className="border-b border-rule/10 align-top">
                          <td className="py-2 pr-3">{r.jv}<br /><span className="text-muted-foreground">{r.kind} · {r.activity}</span></td>
                          <td className="py-2 pr-3">{r.country}</td>
                          <td className="py-2 pr-3">{ds.period}</td>
                          <td className="tnum py-2 pr-3">{usd(r.equity)}</td>
                          <td className="tnum py-2 pr-3">{usd(r.loan)}</td>
                          <td className="tnum py-2 pr-3">{usd(r.guarantee)}</td>
                          <td className="tnum py-2 pr-3 text-primary">{usd(r.total)}</td>
                          <td className="py-2 pr-3">
                            <ul className="space-y-1">
                              {filingsFor(r, ds.period).map((f) => <li key={f.form} title={f.basis}>{f.form} · <span className="tnum text-muted-foreground">{f.due}</span>{f.part !== "annual" && latestSubmission(records, c.party, ds.period) && <span className="mt-1 block text-primary">Filed (simulation) · {latestSubmission(records, c.party, ds.period)?.filedOn}<br />{latestSubmission(records, c.party, ds.period)?.officer} · {latestSubmission(records, c.party, ds.period)?.authority}</span>}</li>)}
                            </ul>
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">{r.reasons.join("; ") || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          {!shown.length && <p className="px-5 py-8 text-sm text-muted-foreground">No companies match.</p>}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Showing up to 150 companies; export includes all matches. Actual filing status is held by AD banks and RBI’s FIRMS portal and is not public. Company/month Form FC simulations apply to the company’s listed Form FC entries only, not APR. Prototype — not legal advice.</p>
      </section>
    </Frame>
  );
}
