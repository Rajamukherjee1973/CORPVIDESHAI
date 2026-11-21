import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ClipboardCheck, ArrowRight } from "lucide-react";
import { Frame } from "@/components/site/Frame";
import { Button } from "@/components/ui/button";
import { groupByCompany } from "@/lib/filings";
import { useFilingsDataset } from "@/lib/use-filings-dataset";
import { latestSubmission } from "@/lib/filing-submissions";
import { secureFilingSchema } from "@/lib/regulator-filing-schema";
import { useRegulatorFilings } from "@/lib/use-regulator-filings";
import { appendRegulatorFiling } from "@/lib/regulator-filings.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";


const TITLE = "Form FC Submission Simulation | CorpVidesh AI";
const DESC = "Record a demonstration Form FC filing date, company and reviewing officer, linked to the outbound filings register. Not an RBI filing confirmation.";
export const Route = createFileRoute("/filing-submission")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SubmissionPage,
});

function SubmissionPage() {
  const ds = useFilingsDataset();
  const { user, ready, records, role, error: loadError, isLoading } = useRegulatorFilings();
  const save = useServerFn(appendRegulatorFiling);
  const queries = useQueryClient();
  const [saving, setSaving] = useState(false);
  const companies = useMemo(() => groupByCompany(ds.rows, ds.period), [ds]);
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("");
  const [filedOn, setFiledOn] = useState("");
  const [officer, setOfficer] = useState("");
  const [authority, setAuthority] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    setOfficer(user?.email ?? "");
  }, [user?.id]);
  const filtered = companies.filter((c) => c.party.toLowerCase().includes(q.toLowerCase()));
  const selected = companies.find((c) => c.party === company);
  const current = latestSubmission(records, company, ds.period);
  const canRecord = ready && !!user && !!role && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess(false);
    if (!selected) { setError("Select a company from this reporting month."); return; }
    const parsed = secureFilingSchema.safeParse({ company, period: ds.period, filedOn, officer, authority });
    if (!parsed.success) { setError("Enter a valid filing date, officer name and authority."); return; }
    setSaving(true);
    try { await save({ data: parsed.data }); await queries.invalidateQueries({ queryKey: ["regulator-filings"] }); setSuccess(true); }
    catch (err) { setError(err instanceof Error ? err.message : "The record could not be saved."); }
    finally { setSaving(false); }
  }
  const field = "mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  return <Frame>
    <section className="mx-auto max-w-6xl px-6 py-12">
      <p className="font-mono-ui text-xs uppercase text-primary">Regulator desk · Simulation only</p>
      <h1 className="font-display mt-3 text-4xl text-primary md:text-5xl">Form FC submissions</h1>
      <p className="mt-4 max-w-3xl text-sm text-muted-foreground">Account-protected demonstration records, saved in Lovable Cloud with an append-only history and transfer snapshot. A filed date is an officer declaration, not confirmation from RBI or an AD bank. It covers the company’s Form FC entries for the selected reporting month; APR remains separate.</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-rule/20 py-4">
        <span className="font-mono-ui text-sm">Reporting month · {ds.period}</span>
        <Button asChild variant="outline"><Link to="/filings">Filings register <ArrowRight /></Link></Button>
      </div>
      {!user && <div className="mt-6 border-l-2 border-primary bg-muted p-4">
        <p className="text-sm">Sign in with your portal account to record a demonstration filing. Local desk selections do not grant access.</p>
        <Button asChild variant="link" className="mt-2 px-0"><Link to="/regulator-portal">Regulator portal <ArrowRight /></Link></Button>
      </div>}
      {loadError && <p role="alert" className="mt-6 text-sm text-destructive">{loadError.message}</p>}
      <Button asChild variant="link" className="mt-4 px-0"><Link to="/regulator-portal">Account & access <ArrowRight /></Link></Button>
      <form onSubmit={submit} className="mt-8 max-w-3xl space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm">Search company<input aria-label="Search company" value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} className={field} placeholder="Company name" /></label>
          <label className="text-sm">Company<select aria-label="Company" value={company} onChange={(e) => { setCompany(e.target.value); setSuccess(false); }} required className={field}>
            <option value="">Select company</option>
            {selected && !filtered.some((c) => c.party === company) && <option value={company}>{company}</option>}
            {filtered.map((c) => <option key={c.party} value={c.party}>{c.party}</option>)}
          </select></label>
        </div>
        {selected && <div className="border-y border-rule/20 py-4 text-sm">
          <p>{selected.rows.length} outbound entries · ${selected.totalUsdMn.toLocaleString("en-IN")}m · {selected.countries.join(", ")}</p>
          <p className="mt-2 text-muted-foreground">Form FC: {current ? `Filed (simulation) · ${current.filedOn} · ${current.officer}, ${current.authority}` : "Not recorded (simulation)"}</p>
        </div>}
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="text-sm">Filing date<input type="date" aria-label="Filing date" required value={filedOn} onChange={(e) => { setFiledOn(e.target.value); setSuccess(false); }} className={field} /></label>
          <label className="text-sm">Officer name<input aria-label="Officer name" required maxLength={100} value={officer} onChange={(e) => setOfficer(e.target.value)} className={field} /></label>
          <label className="text-sm">Authority<input aria-label="Authority" required maxLength={100} value={authority} onChange={(e) => setAuthority(e.target.value)} className={field} /></label>
        </div>
        {current && <p className="text-xs text-muted-foreground">A new entry replaces the displayed date while retaining the earlier demonstration entry in history.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {success && <p role="status" className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 size={18} /> Form FC marked filed (simulation) · {filedOn}. Saved securely in Lovable Cloud.</p>}
        <Button type="submit" disabled={!canRecord || !selected}><ClipboardCheck /> {saving ? "Saving…" : "Mark Form FC filed (simulation)"}</Button>
      </form>
      <section className="mt-12 border-t border-rule/20 pt-6">
        <h2 className="font-display text-2xl">Submission history</h2>
        {!user ? <p className="mt-4 text-sm text-muted-foreground">Sign in to view private submission history.</p> : isLoading ? <p className="mt-4">Loading saved history…</p> : !records.length ? <p className="mt-4 text-sm text-muted-foreground">No demonstration submissions recorded.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
          <thead className="border-b border-rule/20 text-muted-foreground"><tr>{["Company", "Month", "Filed (simulation)", "Officer · authority", "Recorded at (UTC)"].map((h) => <th className="py-3 pr-4 font-normal" key={h}>{h}</th>)}</tr></thead>
          <tbody>{[...records].reverse().map((r) => <tr key={r.id} className="border-b border-rule/10"><td className="py-3 pr-4">{r.company}</td><td className="pr-4">{r.period}</td><td className="pr-4">{r.filedOn}</td><td className="pr-4">{r.officer} · {r.authority}</td><td>{r.recordedAt.replace("T", " ").slice(0, 19)}</td></tr>)}</tbody>
        </table></div>}
      </section>
    </section>
  </Frame>;
}