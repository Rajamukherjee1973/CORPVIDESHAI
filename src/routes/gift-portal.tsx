import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Frame, Rule } from "@/components/site/Frame";
import { CompanyPicker } from "@/components/site/CompanyPicker";
import { supabase } from "@/integrations/supabase/client";
import { useRegulatorAuth } from "@/lib/regulator-auth";
import { readGiftPortal, openGiftCase, addGiftEvent } from "@/lib/gift-portal.functions";
import { PARTY_LABEL, REGULATOR_PARTIES, canAct, caseStage, type GiftParty } from "@/lib/gift-portal";
import { findListed, LISTED_1000 } from "@/data/listed";
import { AD_BANKS } from "@/data/banks";
import { useFxStream } from "@/lib/fx-stream";
import { Button } from "@/components/ui/button";
import { GIFT_DEMO_ACCOUNTS, GIFT_DEMO_PASSWORD } from "@/data/gift-demo-accounts";

const TITLE = "GIFT City Clearance Portal — AD Banks & Six Regulators | CorpVidesh AI";
const DESC = "Signed-in portal where corporate treasuries file ODI cases, AD banks verify, six regulators clear in parallel and the GIFT IFSC banking unit releases — on one hash-chained ledger.";

export const Route = createFileRoute("/gift-portal")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: GiftPortal,
});

const HUBS = [
  { h: "Singapore", c: "SGD" }, { h: "London", c: "GBP" }, { h: "Dubai", c: "AED" }, { h: "New York", c: "USD" },
  { h: "Frankfurt", c: "EUR" }, { h: "Tokyo", c: "JPY" }, { h: "Hong Kong", c: "HKD" }, { h: "Zurich", c: "CHF" },
];
const STAGE_LABEL = { awaiting_bank: "With AD bank", with_regulators: "With six regulators", awaiting_release: "Awaiting GIFT IBU release", released: "Released from GIFT City", queried: "Query raised" } as const;
const PACK = ["Board resolution", "Audited balance sheet", "Valuation report", "Form FC", "Form 15CA/15CB", "TRC / Form 10F"];

function GiftPortal() {
  const { user, ready } = useRegulatorAuth();
  const q = useQuery({ queryKey: ["gift-portal", user?.id], queryFn: () => readGiftPortal(), enabled: ready && !!user, refetchInterval: 8000, retry: 1 });
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-6 pt-12">
        <Rule label="GIFT City clearance portal" />
        <h1 className="font-display text-5xl sm:text-6xl">One filing. <span className="text-primary">Nine desks.</span></h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">Treasury files, the AD bank verifies, six regulators clear in parallel and the GIFT IFSC banking unit releases. Every entry is stored and hash-chained to the one before it.</p>
        <p className="mt-2 max-w-3xl text-xs text-muted-foreground">Demonstration portal. Records are real entries made by signed-in demo accounts, not filings with RBI FIRMS or IFSCA, and not official approvals.</p>
      </section>
      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        {!ready ? <p className="text-sm text-muted-foreground">Checking session…</p>
          : !user ? <SignIn />
          : q.isLoading ? <p className="text-sm text-muted-foreground">Loading the shared ledger…</p>
          : q.error ? <p className="text-sm text-destructive">{(q.error as Error).message} <button className="underline" onClick={() => q.refetch()}>Retry</button></p>
          : !q.data?.me ? <NoAccess />
          : <Desk data={q.data as PortalData} />}
      </section>
    </Frame>
  );
}

type PortalData = { me: { party: GiftParty; org: string; publicDemo?: boolean }; cases: any[]; events: any[] };

function DemoGuide({ onSelect }: { onSelect?: (email: string) => void }) {
  return <div className="min-w-0 border-t-2 border-primary pt-5">
    <h2 className="font-display text-2xl">Public demonstration desks</h2>
    <p className="mt-2 text-sm text-muted-foreground">Shared demo password: <code className="break-all font-mono text-foreground">{GIFT_DEMO_PASSWORD}</code></p>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Anyone with these published details can use these nine accounts. All visitors share the same showcase records: use fictional information only. These accounts cannot access private GIFT cases, investor proposals or the Form FC register.</p>
    <div className="mt-4 divide-y divide-border">{GIFT_DEMO_ACCOUNTS.map((a,i) => <div key={a.party} className="grid min-w-0 gap-2 py-3 sm:grid-cols-[150px_1fr_auto]">
      <p className="text-sm font-medium">{String(i+1).padStart(2,'0')} · {PARTY_LABEL[a.party]}</p>
      <div className="min-w-0"><p className="break-all font-mono text-xs">{a.email}</p><p className="mt-1 text-xs text-muted-foreground">{a.action}</p></div>
      {onSelect && <Button variant="outline" size="sm" onClick={() => onSelect(a.email)}>Use this desk</Button>}
    </div>)}</div>
    <ol className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
      <li>1. Sign in as treasury; file one fictional case and remember its case reference.</li>
      <li>2. Sign out; use the AD bank account to verify the same case.</li>
      <li>3. Use each of the six authority accounts to record its review; their order is independent.</li>
      <li>4. Use the IBU account to record release; the stored timeline updates after every action.</li>
    </ol>
    <p className="mt-3 text-xs text-muted-foreground">A query returns the demonstration to bank review. This nine-desk sequence is a proposed supervisory model, not the statutory approval process for every ODI transaction; MoF, DPIIT and CBDT do not universally approve individual ODI applications. No money moves.</p>
  </div>;
}

function SignIn() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[360px_1fr]">
    <form className="space-y-3 border border-border p-6" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr("");
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false); setPassword(""); if (error) setErr("Sign-in failed. Check the demo account email and password.");
    }}>
      <div className="font-mono text-xs text-primary">SIGN IN TO YOUR DESK</div>
      <input aria-label="Email" type="email" required placeholder="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-border bg-background p-2" />
      <input aria-label="Password" type="password" required placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-border bg-background p-2" />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
    <DemoGuide onSelect={value => { setEmail(value); setPassword(GIFT_DEMO_PASSWORD); setErr(''); }} />
    </div>
  );
}

function SignOut() {
  const qc = useQueryClient(); const nav = useNavigate();
  return <button className="border border-border px-3 py-1 text-xs" onClick={async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); nav({ to: "/gift-portal", replace: true }); }}>Sign out</button>;
}

function NoAccess() {
  return <div className="max-w-xl border border-border p-6"><p>This account has not been assigned a GIFT portal desk.</p><div className="mt-3"><SignOut /></div></div>;
}

function Desk({ data }: { data: PortalData }) {
  const { me } = data;
  const [sel, setSel] = useState<string | null>(data.cases[0]?.id ?? null);
  const byCase = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const e of data.events) m.set(e.case_id, [...(m.get(e.case_id) ?? []), e]);
    return m;
  }, [data.events]);
  const current = data.cases.find((c) => c.id === sel) ?? data.cases[0];
  const waiting = data.cases.filter((c) => canAct(me.party, byCase.get(c.id) ?? [])).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-primary p-4 text-primary-foreground">
        <div><div className="font-mono text-xs opacity-80">SIGNED IN AS</div><div className="font-display text-2xl">{PARTY_LABEL[me.party]}{me.org ? ` · ${me.org}` : ""}</div></div>
        <div className="font-mono text-sm">{me.party === "treasury" ? `${data.cases.length} cases filed` : `${waiting} waiting on your desk`}</div>
        <div className="bg-background text-foreground"><SignOut /></div>
      </div>
      {me.publicDemo && <p className="border-l-2 border-primary px-4 text-sm text-muted-foreground">Public showcase workspace · records are shared with all demonstration visitors. Never enter confidential details.</p>}
      <details className="border-b border-border pb-4"><summary className="cursor-pointer text-sm text-primary">Demo accounts & clearance walkthrough</summary><div className="mt-4"><DemoGuide /></div></details>
      {me.party === "treasury" && <OpenCase onOpened={setSel} />}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="border border-border">
          <div className="border-b border-border p-3 font-mono text-xs text-primary">SHARED LEDGER · {data.cases.length} CASES</div>
          {data.cases.length === 0 && <p className="p-4 text-sm text-muted-foreground">No cases yet. A treasury account opens the first one.</p>}
          <ul className="max-h-[560px] overflow-auto">
            {data.cases.map((c) => {
              const ev = byCase.get(c.id) ?? []; const st = caseStage(ev); const mine = canAct(me.party, ev);
              return (
                <li key={c.id}>
                  <button onClick={() => setSel(c.id)} className={`w-full border-b border-border p-3 text-left ${current?.id === c.id ? "bg-secondary" : ""}`}>
                    <div className="flex justify-between gap-2"><span className="font-medium">{c.company}</span>{mine && <span className="bg-primary px-2 text-xs text-primary-foreground">Your turn</span>}</div>
                    <div className="text-xs text-muted-foreground">₹{Number(c.amount_crore).toLocaleString("en-IN")} cr → {c.hub} · {c.route}</div>
                    <div className="font-mono text-[10px] text-primary">{STAGE_LABEL[st]}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {current ? <CaseView c={current} events={byCase.get(current.id) ?? []} me={me.party} /> : <div className="border border-border p-6 text-sm text-muted-foreground">Select a case.</div>}
      </div>
    </div>
  );
}

function OpenCase({ onOpened }: { onOpened: (id: string) => void }) {
  const qc = useQueryClient(); const tape = useFxStream();
  const [company, setCompany] = useState(LISTED_1000[0]?.name ?? ""); const [hub, setHub] = useState(0); const [bank, setBank] = useState(0);
  const [amount, setAmount] = useState(475); const [purpose, setPurpose] = useState("Wholly owned subsidiary — equity");
  const [docs, setDocs] = useState<string[]>(PACK.slice(0, 5));
  const co = findListed(company); const H = HUBS[hub]!; const rate = tape.inrPer[H.c];
  const route = co && co.used + amount <= co.ceiling ? "Automatic" : "Approval";
  const m = useMutation({
    mutationFn: () => openGiftCase({ data: { company, hub: H.h, currency: H.c, amount_crore: amount, route, purpose, ad_bank: AD_BANKS[bank]!.name, fx_rate: rate ?? null, fx_source: rate ? tape.source : null, documents: docs } }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["gift-portal"] }); onOpened(r.id); },
  });
  return (
    <div className="border border-border p-5">
      <div className="font-mono text-xs text-primary">OPEN A NEW CASE</div>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <div><div className="text-sm">Company</div><CompanyPicker value={company} onChange={setCompany} /></div>
        <label className="text-sm">Hub<select value={hub} onChange={(e) => setHub(+e.target.value)} className="mt-1 w-full border border-border bg-background p-2">{HUBS.map((x, i) => <option key={x.h} value={i}>{x.h} · {x.c}</option>)}</select></label>
        <label className="text-sm">AD Category-I bank<select value={bank} onChange={(e) => setBank(+e.target.value)} className="mt-1 w-full border border-border bg-background p-2">{AD_BANKS.map((b, i) => <option key={b.name} value={i}>{b.name}</option>)}</select></label>
        <label className="text-sm">Amount (₹ crore)<input type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(1, +e.target.value))} className="mt-1 w-full border border-border bg-background p-2" /></label>
        <label className="text-sm">Purpose<input value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-1 w-full border border-border bg-background p-2" /></label>
        <div className="text-sm"><div>Live rate</div><div className="font-display text-xl">{rate ? `1 ${H.c} = ₹${rate.toFixed(4)}` : "Feed unavailable"}</div><div className="text-xs text-muted-foreground">Route: <b className="text-primary">{route}</b></div></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {PACK.map((d) => <label key={d} className={`cursor-pointer border px-2 py-1 text-xs ${docs.includes(d) ? "border-primary bg-secondary" : "border-border"}`}><input type="checkbox" className="mr-1 accent-primary" checked={docs.includes(d)} onChange={(e) => setDocs(e.target.checked ? [...docs, d] : docs.filter((x) => x !== d))} />{d}</label>)}
      </div>
      <button disabled={m.isPending} onClick={() => m.mutate()} className="mt-4 bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-60">{m.isPending ? "Filing…" : "File with AD bank"}</button>
      {m.error && <p className="mt-2 text-sm text-destructive">{(m.error as Error).message}</p>}
    </div>
  );
}

function CaseView({ c, events, me }: { c: any; events: any[]; me: GiftParty }) {
  const qc = useQueryClient(); const [note, setNote] = useState("");
  const st = caseStage(events); const mine = canAct(me, events);
  const m = useMutation({
    mutationFn: (action: "verified" | "cleared" | "queried" | "released") => addGiftEvent({ data: { case_id: c.id, action, note, documents: [] } }),
    onSuccess: () => { setNote(""); qc.invalidateQueries({ queryKey: ["gift-portal"] }); },
  });
  const latest = (p: GiftParty) => [...events].reverse().find((e) => e.party === p);
  const lanes: GiftParty[] = ["treasury", "ad_bank", ...REGULATOR_PARTIES, "ibu"];
  const primary = me === "ad_bank" ? "verified" : me === "ibu" ? "released" : "cleared";
  const t0 = events[0] ? Date.parse(events[0].created_at) : 0;
  const since = (e: any) => { const s = Math.round((Date.parse(e.created_at) - t0) / 1000); return s < 60 ? `+${s}s` : `+${Math.floor(s / 60)}m ${s % 60}s`; };
  return (
    <div className="border border-border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-display text-2xl">{c.company} → {c.hub}</div>
        <div className="font-mono text-xs text-primary">{STAGE_LABEL[st]}</div>
      </div>
      <div className="text-sm text-muted-foreground">₹{Number(c.amount_crore).toLocaleString("en-IN")} cr · {c.route} route · {c.ad_bank} · {c.fx_rate ? `1 ${c.currency} = ₹${Number(c.fx_rate).toFixed(4)} (${c.fx_source})` : "no FX stamp"}</div>
      <p className="mt-2 break-all font-mono text-xs text-primary">Case reference · {c.id} · internal demonstration only</p>
      <div className="mt-4 grid grid-cols-3 gap-px bg-border sm:grid-cols-9">
        {lanes.map((p) => { const l = latest(p); const ok = l && l.action !== "queried"; return (
          <div key={p} className={`p-2 text-center ${ok ? "bg-primary text-primary-foreground" : l?.action === "queried" ? "bg-destructive text-destructive-foreground" : "bg-background"}`}>
            <div className="font-mono text-[10px]">{PARTY_LABEL[p].replace("Corporate ", "").replace("AD Category-I bank", "AD bank").replace("GIFT IFSC banking unit", "GIFT IBU")}</div>
            <div className="text-xs">{l ? `${l.action} ${since(l)}` : "—"}</div>
          </div>); })}
      </div>
      {mine && (
        <div className="mt-4 border border-primary p-4">
          <div className="font-mono text-xs text-primary">ACTION FOR {PARTY_LABEL[me].toUpperCase()}</div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note for the record (optional; required context for a query)" className="mt-2 w-full border border-border bg-background p-2 text-sm" />
          <div className="mt-2 flex gap-2">
            <button disabled={m.isPending} onClick={() => m.mutate(primary)} className="bg-primary px-5 py-2 text-primary-foreground disabled:opacity-60">{primary === "verified" ? "Verify & forward" : primary === "released" ? "Release remittance" : "Clear"}</button>
            <button disabled={m.isPending || !note.trim()} onClick={() => m.mutate("queried")} className="border border-border px-5 py-2 disabled:opacity-50">Raise query</button>
          </div>
          {m.error && <p className="mt-2 text-sm text-destructive">{(m.error as Error).message}</p>}
        </div>
      )}
      <div className="mt-5 font-mono text-xs text-primary">HASH-CHAINED RECORD</div>
      <ol className="mt-2 space-y-1">
        {events.map((e) => (
          <li key={e.id} className="grid grid-cols-[32px_1fr] gap-2 border-l-2 border-primary pl-2 text-sm sm:grid-cols-[32px_180px_1fr_150px]">
            <span className="font-mono text-xs">#{e.seq}</span>
            <span><b>{PARTY_LABEL[e.party as GiftParty]}</b> {e.action}</span>
            <span className="text-muted-foreground">{e.note}{e.documents?.length ? ` · ${e.documents.join(", ")}` : ""} <span className="text-xs">{e.actor_org}</span></span>
            <span className="font-mono text-[10px] text-muted-foreground" title={`prev ${e.prev_hash}`}>{e.hash.slice(0, 16)} · {new Date(e.created_at).toLocaleTimeString("en-IN")}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
