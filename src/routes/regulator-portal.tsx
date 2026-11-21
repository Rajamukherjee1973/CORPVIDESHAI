import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import { Frame } from "@/components/site/Frame";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRegulatorFilings } from "@/lib/use-regulator-filings";
import { RegulatorDemoGuide, RegulatorDeskBoard } from "@/components/site/RegulatorDeskBoard";
const title = "Regulator Portal — Secure Demonstration Access | CorpVidesh AI";
const description = "Account-protected Form FC demonstration submissions and an append-only shared regulator register.";
export const Route = createFileRoute("/regulator-portal")({ head: () => ({ meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Portal });
function Portal() {
  const { user, ready, role, records, error: loadError, isLoading, desk, publicDemo, actions } = useRegulatorFilings();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const query = useQueryClient(); const navigate = useNavigate();
  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPassword(""); setBusy(false); if (error) setError("Sign-in failed. Check your invited account and password.");
  }
  async function reset() {
    if (!email.trim()) { setError("Enter your invited email address first."); return; }
    setBusy(true); const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false); if (error) setError("The reset email could not be requested."); else setNotice("If this account exists, a password reset email has been requested.");
  }
  async function signOut() { await query.cancelQueries(); query.clear(); await supabase.auth.signOut(); await navigate({ to: "/regulator-portal", replace: true }); }
  return <Frame><section className="mx-auto max-w-6xl px-6 py-12">
    <p className="font-mono-ui text-xs uppercase text-primary">CorpVidesh AI · Regulator access</p>
    <h1 className="font-display mt-3 text-5xl text-primary">Regulator portal</h1>
    <p className="mt-4 max-w-2xl text-sm text-muted-foreground">Secure demonstration environment. No submissions are sent to RBI, an AD bank or any regulator.</p>
    <div className="mt-8 flex flex-wrap gap-6 border-y border-rule/20 py-5 text-sm"><span className="flex items-center gap-2"><LockKeyhole size={18} /> Account-protected records</span><span className="flex items-center gap-2"><ShieldCheck size={18} /> Append-only history</span><span>Form FC · Company / month scope</span></div>
    {!ready ? <p className="mt-8">Checking account…</p> : user ? <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm">{user.email}</p><p className="mt-2 text-xs text-muted-foreground">{publicDemo ? `Public showcase desk · ${desk ?? ""} · showcase records only` : role === "regulator" ? "Invited regulator · shared register access" : "Private demo account · own records only"}</p></div><Button variant="outline" onClick={signOut}><LogOut /> Sign out</Button></div>
      {loadError && <p role="alert" className="text-destructive">{loadError.message}</p>}
      <p className="font-display text-3xl">{isLoading ? "Loading register…" : `${records.length} saved demonstration records`}</p>
      <div className="flex flex-wrap gap-3"><Button asChild><Link to="/filing-submission">New Form FC record <ArrowRight /></Link></Button><Button asChild variant="outline"><Link to="/filings">Filings register <ArrowRight /></Link></Button><Button asChild variant="outline"><Link to="/console" search={{ view: "filings" }}>Corporate dashboard <ArrowRight /></Link></Button></div>
      {role === "regulator" && <div><h2 className="font-display text-2xl">Review queue{desk ? ` · ${desk} desk` : ""}</h2><p className="mb-4 mt-1 text-xs text-muted-foreground">Every action is append-only and time-stamped. Demonstration only — not an official decision.</p><RegulatorDeskBoard desk={desk} records={records as never} actions={actions as never} /></div>}
      <Button asChild variant="outline"><Link to="/fund-portal">Fund proposals & GIFT tracking <ArrowRight /></Link></Button>
      <p className="text-xs text-muted-foreground">Officer and authority entries are declarations, not official appointments. Shared access requires a separately granted regulator role.</p>
    </div> : <form onSubmit={login} className="mt-8 max-w-md space-y-5">
      <h2 className="font-display text-2xl">Invited reviewer sign-in</h2>
      <label className="block text-sm">Email<input type="email" aria-label="Portal email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-background px-3 py-3" /></label>
      <label className="block text-sm">Password<input type="password" aria-label="Portal password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-background px-3 py-3" /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{notice && <p role="status" className="text-sm">{notice}</p>}
      <div className="flex flex-wrap gap-3"><Button disabled={busy} type="submit"><LockKeyhole /> {busy ? "Please wait…" : "Sign in"}</Button><Button disabled={busy} variant="link" type="button" onClick={reset}>Forgot password?</Button></div>
      <p className="text-xs text-muted-foreground">Private accounts are invitation-only. The public showcase desks below are isolated from private records; a device-selected regulator desk does not grant access.</p>
    </form>}
    {ready && !user && <RegulatorDemoGuide onPick={(e, p) => { setEmail(e); setPassword(p); }} />}
  </section></Frame>;
}