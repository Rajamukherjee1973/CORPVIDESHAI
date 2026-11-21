import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Download, FileText, Landmark, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { Frame, Rule } from "@/components/site/Frame";
import { Button } from "@/components/ui/button";
import { useRegulatorAuth } from "@/lib/regulator-auth";
import { supabase } from "@/integrations/supabase/client";
import { appendFundEvent, readFundPortal, submitFundProposal } from "@/lib/fund-portal.functions";
import { canFundAct, FUND_PACK, FUND_REGULATORS, FUND_STAGE, fundStage, type FundParty } from "@/lib/fund-portal";
import { PARTY_LABEL } from "@/lib/gift-portal";
import { HUB_MARKETS } from "@/data/exchanges";
import { AD_BANKS } from "@/data/banks";
import type { Database } from "@/integrations/supabase/types";

const title = "Fund Portal — Offshore Proposals & GIFT Tracking | CorpVidesh AI";
const description = "Account-protected fund investment proposals, AD bank review, parallel demonstration regulator lanes and append-only GIFT City tracking.";
export const Route = createFileRoute("/fund-portal")({
  head: () => ({ meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: FundPortal,
});

type Proposal = Database["public"]["Tables"]["fund_proposals"]["Row"];
type Event = Database["public"]["Tables"]["fund_proposal_events"]["Row"];
type Me = { party: FundParty; org: string };
const label = (party: FundParty) => party === "investor" ? "Fund investor" : PARTY_LABEL[party];
const steps: FundParty[] = ["investor", "ad_bank", ...FUND_REGULATORS, "ibu"];
const field = "mt-1 w-full rounded-md border border-input bg-background p-2.5 text-sm";

function FundPortal() {
  const { user, ready } = useRegulatorAuth();
  const read = useServerFn(readFundPortal);
  const query = useQuery({ queryKey: ["fund-portal", user?.id], queryFn: () => read(), enabled: ready && !!user, refetchInterval: 8000, retry: 1 });
  const qc = useQueryClient(); const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await navigate({ to: "/fund-portal", replace: true });
  }
  return <Frame><main className="mx-auto max-w-[1400px] px-6 py-10">
    <Rule label="Fund investor portal · GIFT City" />
    <div className="mt-5 grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_400px]">
      <div><h1 className="font-display text-4xl sm:text-5xl">Offshore ambition.<br /><span className="text-primary">One accountable record.</span></h1><p className="mt-4 max-w-xl text-sm text-muted-foreground">Investment proposals · AD bank review · GIFT City tracking</p></div>
      <div className="flex items-end"><p className="border-l-4 border-primary pl-4 text-xs leading-relaxed text-muted-foreground">Demonstration only. No funds move and no filings reach RBI or IFSCA. Six review lanes mirror the treasury demonstration; actual authority involvement and investment eligibility require case-specific legal assessment.</p></div>
    </div>
    <div className="flex flex-wrap gap-5 border-b border-border py-4 text-xs"><span className="flex items-center gap-2"><Landmark size={16} /> 52 hub destinations</span><span className="flex items-center gap-2"><ShieldCheck size={16} /> Private investor records</span><span className="flex items-center gap-2"><FileText size={16} /> Append-only evidence</span><Button variant="link" size="sm" asChild><Link to="/gift-portal">Treasury & reviewer portal <ArrowRight /></Link></Button></div>
    {!ready ? <p className="py-8">Checking account…</p> : !user ? <section className="max-w-xl py-10"><h2 className="font-display text-2xl">Investor account access</h2><Button className="mt-5" asChild><Link to="/regulator-portal">Sign in with your invited account <ArrowRight /></Link></Button><p className="mt-3 text-xs text-muted-foreground">Use your individual invited email/password account. A trusted fund assignment is required; proposals remain private to their submitting investor and authorized reviewers.</p></section> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 py-5"><div className="text-sm"><b>{query.data?.me?.org ?? user.email}</b><p className="text-xs text-muted-foreground">{query.data?.me ? label(query.data.me.party) : "Signed-in account"}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw /> Refresh</Button><Button variant="outline" size="sm" onClick={signOut}><LogOut /> Sign out</Button></div></div>
      {query.isLoading ? <p className="py-8">Loading proposals…</p> : query.error ? <p role="alert" className="text-sm text-destructive">{query.error.message}</p> : !query.data?.me ? <p className="border-l-4 border-primary p-5 text-sm">This account has not been assigned a fund or reviewer desk. Fund access is managed separately from treasury access.</p> : <FundDesk me={query.data.me} proposals={query.data.proposals} events={query.data.events} />}
    </>}
  </main></Frame>;
}

function FundDesk({ me, proposals, events }: { me: Me; proposals: Proposal[]; events: Event[] }) {
  const [selected, setSelected] = useState(""); const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const proposalEvents = (id: string) => events.filter((event) => event.proposal_id === id);
  const visible = proposals.filter((proposal) => (filter === "all" || fundStage(proposalEvents(proposal.id) as Array<Event & { party: FundParty }>) === filter) && `${proposal.tracking_number ?? ""} ${proposal.title} ${proposal.hub}`.toLowerCase().includes(search.toLowerCase()));
  const current = visible.find((proposal) => proposal.id === selected) ?? visible[0];
  const waiting = proposals.filter((proposal) => canFundAct(me.party, proposalEvents(proposal.id) as Array<Event & { party: FundParty }>)).length;
  return <>
    <div className="grid grid-cols-3 gap-4 border-y border-border py-5"><Metric name="Proposals" value={proposals.length} /><Metric name="Commitment · ₹ crore" value={proposals.reduce((sum, proposal) => sum + Number(proposal.amount_crore), 0).toLocaleString("en-IN")} /><Metric name="Your action required" value={waiting} /></div>
    {me.party === "investor" && <ProposalForm onSaved={setSelected} />}
    <label className="mt-5 block max-w-md text-xs">Find proposal<input aria-label="Find proposal" placeholder="Tracking number, title or hub" value={search} onChange={(event) => setSearch(event.target.value)} className={field} /></label>
    <section className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside><label className="text-xs font-mono-ui text-primary">PROPOSAL REGISTER<select aria-label="Filter proposals" value={filter} onChange={(event) => setFilter(event.target.value)} className={field}><option value="all">All stages</option>{Object.entries(FUND_STAGE).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><div className="mt-4 max-h-[620px] overflow-y-auto">{visible.map((proposal) => <Button key={proposal.id} variant="ghost" onClick={() => setSelected(proposal.id)} className={`h-auto w-full justify-start whitespace-normal rounded-none border-b border-border p-4 text-left ${current?.id === proposal.id ? "bg-secondary" : ""}`}><span className="block min-w-0"><span className="block font-mono-ui text-xs text-primary">{proposal.tracking_number ?? "Reference unavailable"}</span><span className="mt-1 block text-sm font-semibold">{proposal.title}</span><span className="mt-1 block text-xs text-muted-foreground">{proposal.fund_name} · {proposal.hub}<br />₹{Number(proposal.amount_crore).toLocaleString("en-IN")} cr</span><span className="mt-2 block text-xs text-primary">{FUND_STAGE[fundStage(proposalEvents(proposal.id) as Array<Event & { party: FundParty }>)]}</span></span></Button>)}{!visible.length && <p className="py-6 text-sm text-muted-foreground">No proposals in this view.</p>}</div></aside>
      {current ? <ProposalDetail key={current.id} proposal={current} events={proposalEvents(current.id)} me={me} /> : <p className="py-8 text-sm text-muted-foreground">No saved proposal selected.</p>}
    </section>
  </>;
}

function Metric({ name, value }: { name: string; value: string | number }) { return <div><p className="text-xs text-muted-foreground">{name}</p><p className="mt-2 font-display text-2xl sm:text-3xl">{value}</p></div>; }

function ProposalForm({ onSaved }: { onSaved: (id: string) => void }) {
  const submit = useServerFn(submitFundProposal); const qc = useQueryClient();
  const [open, setOpen] = useState(false); const [title, setTitle] = useState(""); const [hub, setHub] = useState("Singapore");
  const [bank, setBank] = useState(AD_BANKS[0]?.name ?? ""); const [amount, setAmount] = useState("25");
  const [type, setType] = useState<"ODI equity" | "OPI securities" | "Overseas fund units">("Overseas fund units");
  const [route, setRoute] = useState<"Automatic" | "Approval" | "Assessment required">("Assessment required");
  const [purpose, setPurpose] = useState(""); const [documents, setDocuments] = useState<string[]>([]);
  const [receipt, setReceipt] = useState("");
  const destination = HUB_MARKETS.find((item) => item.city === hub);
  const mutation = useMutation({ mutationFn: async () => {
    if (!destination) throw new Error("Select a destination.");
    return submit({ data: { title, hub, currency: destination.currency, amount_crore: Number(amount), investment_type: type, route, purpose, ad_bank: bank, documents } });
  }, onSuccess: async (result) => { setReceipt(`${result.trackingNumber ?? result.id} · ${FUND_STAGE[result.status]}`); await qc.invalidateQueries({ queryKey: ["fund-portal"] }); onSaved(result.id); setOpen(false); setTitle(""); setPurpose(""); setDocuments([]); } });
  return <section className="border-b border-border py-5"><Button onClick={() => setOpen(!open)}><FileText /> {open ? "Close proposal form" : "New offshore proposal"}</Button>{open && <form className="mt-5 space-y-5" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
    <div className="grid gap-4 md:grid-cols-3"><label className="text-sm">Proposal title<input required minLength={3} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className={field} /></label><label className="text-sm">Financial hub<select value={hub} onChange={(event) => setHub(event.target.value)} className={field}>{HUB_MARKETS.map((item) => <option key={item.city}>{item.city}</option>)}</select></label><label className="text-sm">AD Category-I bank<select value={bank} onChange={(event) => setBank(event.target.value)} className={field}>{AD_BANKS.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label className="text-sm">Commitment (₹ crore)<input required type="number" min="0.01" max="1000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className={field} /></label><label className="text-sm">Investment type<select value={type} onChange={(event) => setType(event.target.value as typeof type)} className={field}>{["ODI equity", "OPI securities", "Overseas fund units"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm">Proposed route<select value={route} onChange={(event) => setRoute(event.target.value as typeof route)} className={field}>{["Assessment required", "Automatic", "Approval"].map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <label className="block text-sm">Investment rationale<textarea required minLength={10} maxLength={2000} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} className={field} /></label>
    <fieldset><legend className="text-sm">Declared evidence checklist</legend><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{FUND_PACK.map((document) => <label key={document} className="flex items-start gap-2 text-xs"><input type="checkbox" checked={documents.includes(document)} onChange={(event) => setDocuments(event.target.checked ? [...documents, document] : documents.filter((item) => item !== document))} />{document}</label>)}</div></fieldset>
    <p className="text-xs text-muted-foreground">{destination?.currency} destination · {documents.length}/{FUND_PACK.length} evidence items declared. Checklist entries are declarations, not uploaded or verified documents. Route choice is not a determination of legal eligibility.</p>
    <Button type="submit" disabled={mutation.isPending || !documents.length}>{mutation.isPending ? "Saving proposal…" : "Submit proposal to AD bank"}<ArrowRight /></Button>{mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
  </form>}{receipt && <p role="status" className="mt-4 border-l-4 border-primary pl-3 text-sm">Proposal saved · {receipt}</p>}</section>;
}

function ProposalDetail({ proposal, events, me }: { proposal: Proposal; events: Event[]; me: Me }) {
  const typed = events.map((event) => ({ ...event, party: event.party as FundParty }));
  const stage = fundStage(typed); const [note, setNote] = useState(""); const append = useServerFn(appendFundEvent); const qc = useQueryClient();
  const mutation = useMutation({ mutationFn: (action: "resubmitted" | "verified" | "cleared" | "queried" | "released") => append({ data: { proposal_id: proposal.id, action, note, documents: [] } }), onSuccess: async () => { setNote(""); await qc.invalidateQueries({ queryKey: ["fund-portal"] }); } });
  const action = me.party === "investor" ? "resubmitted" : me.party === "ad_bank" ? "verified" : me.party === "ibu" ? "released" : "cleared";
  let roundStart = 0; typed.forEach((event, index) => { if (event.action === "resubmitted") roundStart = index; });
  function download() { const blob = new Blob([JSON.stringify({ demonstration: true, trackingNumber: proposal.tracking_number, status: stage, statusLabel: FUND_STAGE[stage], proposal, events }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `fund-proposal-${proposal.id}.json`; a.click(); URL.revokeObjectURL(url); }
  return <article className="min-w-0 border-l-4 border-primary pl-5">
    <p className="mb-3 break-all font-mono-ui text-sm text-primary">Tracking number · {proposal.tracking_number ?? "Reference unavailable"}</p>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono-ui text-xs text-primary">{FUND_STAGE[stage]}</p><h2 className="mt-2 font-display text-3xl">{proposal.title}</h2><p className="mt-2 text-sm text-muted-foreground">{proposal.fund_name} → {proposal.hub} · {proposal.currency} · ₹{Number(proposal.amount_crore).toLocaleString("en-IN")} crore</p></div><Button variant="outline" size="sm" onClick={download}><Download /> Record JSON</Button></div>
    <p className="mt-4 text-sm">{proposal.purpose}</p><p className="mt-2 text-xs text-muted-foreground">{proposal.investment_type} · Proposed route: {proposal.route} · {proposal.ad_bank}</p><p className="mt-2 text-xs text-muted-foreground">Submitted {new Date(proposal.created_at).toLocaleString("en-IN")} · Internal proposal reference, not an official regulator filing number.</p>
    <div className="my-5 grid gap-px bg-border sm:grid-cols-3">{steps.map((party, index) => { const latest = typed.slice(roundStart).filter((event) => event.party === party).at(-1); return <div key={party} className="min-h-24 bg-background p-3"><div className="flex items-center justify-between gap-2"><span className="font-mono-ui text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>{latest && latest.action !== "queried" && <Check size={16} className="text-primary" />}</div><p className="mt-2 text-sm font-semibold">{label(party)}</p><p className={`mt-1 text-xs ${latest?.action === "queried" ? "text-destructive" : "text-muted-foreground"}`}>{latest ? `${latest.action} · ${new Date(latest.created_at).toLocaleTimeString("en-IN")}` : "Pending"}</p></div>; })}</div>
    <div className="border-y border-border py-4"><p className="text-xs font-semibold">Declared filing evidence</p><p className="mt-2 text-xs text-muted-foreground">{proposal.documents.join(" · ")}</p></div>
    {canFundAct(me.party, typed) && <section className="py-5"><label className="text-sm">{me.party === "investor" ? "Response to review query" : "Review note"}<textarea value={note} minLength={3} maxLength={2000} onChange={(event) => setNote(event.target.value)} rows={3} className={field} /></label><div className="mt-3 flex flex-wrap gap-3"><Button disabled={mutation.isPending || note.trim().length < 3} onClick={() => mutation.mutate(action)}>{action === "resubmitted" ? "Respond & resubmit" : action === "verified" ? "Verify & forward" : action === "released" ? "Complete demo GIFT clearance" : "Record demo clearance"}<ArrowRight /></Button>{me.party !== "investor" && <Button variant="outline" disabled={mutation.isPending || note.trim().length < 3} onClick={() => mutation.mutate("queried")}>Raise query</Button>}</div>{mutation.error && <p role="alert" className="mt-2 text-sm text-destructive">{mutation.error.message}</p>}</section>}
    <h3 className="mt-6 font-mono-ui text-xs text-primary">APPEND-ONLY TIMELINE · {events.length} ENTRIES</h3><ol className="mt-4">{typed.map((event) => <li key={event.id} className="border-b border-border py-4"><div className="flex flex-wrap justify-between gap-2 text-xs"><b>#{event.seq} · {label(event.party)} · {event.action}</b><time>{new Date(event.created_at).toLocaleString("en-IN")}</time></div><p className="mt-2 text-sm">{event.note}</p><p className="mt-1 text-xs text-muted-foreground">{event.actor_org} · Actor {event.actor.slice(0, 8)}</p><p title={`Previous: ${event.prev_hash}`} className="mt-2 break-all font-mono-ui text-[10px] text-muted-foreground">SHA-256 {event.hash}</p></li>)}</ol>
  </article>;
}