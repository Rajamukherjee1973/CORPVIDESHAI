import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { bookHistory, type HedgeMark } from "@/lib/saved-forwards";

const inr = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? "−" : v > 0 ? "+" : "";
  return a >= 1e7 ? `${s}₹${(a / 1e7).toFixed(2)} cr` : `${s}₹${(a / 1e5).toFixed(2)} lakh`;
};

/** Sign-in strip for the hedge book. Accounts are issued by the CorpVidesh team; there is no public sign-up here. */
export function HedgeAccountBar({ mode, email }: { mode: "account" | "local"; email: string }) {
  const [open, setOpen] = useState(false);
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (mode === "account") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule/30 bg-muted/20 px-5 py-2.5 text-xs">
        <span><span className="text-primary">Saved to your account</span> · <span className="font-mono-ui">{email}</span> · only you can see these contracts; profit/loss is recorded daily.</span>
        <button type="button" onClick={() => void supabase.auth.signOut()} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"><LogOut className="h-3.5 w-3.5" />Sign out</button>
      </div>
    );
  }
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: mail.trim(), password });
    setBusy(false);
    if (error) setErr(error.message === "Invalid login credentials" ? "That email and password don't match an investor account." : error.message);
    else setPassword("");
  }
  return (
    <div className="border-t border-rule/30 bg-muted/20 px-5 py-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground">Practice tickets stay in this browser tab. Investors with an account can sign in to save contracts and track profit/loss over time.</span>
        {!open && <Button size="sm" variant="outline" onClick={() => setOpen(true)}><LogIn className="mr-1 h-3.5 w-3.5" />Investor sign-in</Button>}
      </div>
      {open && (
        <form onSubmit={signIn} className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-muted-foreground">Email<input aria-label="Investor email" type="email" required autoComplete="email" value={mail} onChange={(e) => setMail(e.target.value)} className="mt-1 block w-56 border border-input bg-background px-2 py-1.5 text-sm text-foreground" /></label>
          <label className="text-muted-foreground">Password<input aria-label="Investor password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-44 border border-input bg-background px-2 py-1.5 text-sm text-foreground" /></label>
          <Button size="sm" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
          <span className="text-[11px] text-muted-foreground">Accounts are issued by the CorpVidesh team.</span>
          {err && <p role="alert" className="w-full text-destructive">{err}</p>}
        </form>
      )}
    </div>
  );
}

/** Book-level profit/loss over time from the server's daily marks. */
export function HedgeHistory({ marks, note }: { marks: HedgeMark[]; note: string }) {
  const pts = bookHistory(marks);
  if (!pts.length) return note ? <p className="border-t border-rule/20 px-5 py-3 text-xs text-muted-foreground">{note}</p> : null;
  const W = 640, H = 170, P = { l: 78, r: 12, t: 14, b: 26 };
  const vals = pts.map((p) => p.pnlInr);
  const m = Math.max(...vals.map(Math.abs), 1);
  const X = (i: number) => P.l + (pts.length === 1 ? (W - P.l - P.r) / 2 : (i / (pts.length - 1)) * (W - P.l - P.r));
  const Y = (v: number) => P.t + ((m - v) / (2 * m)) * (H - P.t - P.b);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.pnlInr).toFixed(1)}`).join("");
  const last = pts.at(-1)!;
  return (
    <div className="border-t border-rule/30 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Your hedge book · profit or loss over time</div>
        <div className="text-xs">{pts.length} day{pts.length === 1 ? "" : "s"} recorded · latest {last.date}: <span className={`font-mono-ui ${last.pnlInr < 0 ? "text-destructive" : "font-semibold"}`}>{inr(last.pnlInr)}</span></div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="Saved hedge book profit or loss by day">
        <line x1={P.l} x2={W - P.r} y1={Y(0)} y2={Y(0)} className="stroke-muted-foreground" strokeDasharray="2 3" />
        <text x={P.l - 6} y={Y(m) + 4} textAnchor="end" fontSize="10" className="fill-foreground font-mono-ui">{inr(m)}</text>
        <text x={P.l - 6} y={Y(-m)} textAnchor="end" fontSize="10" className="fill-destructive font-mono-ui">{inr(-m)}</text>
        <text x={P.l} y={H - 8} fontSize="10" className="fill-muted-foreground font-mono-ui">{pts[0]!.date}</text>
        <text x={W - P.r} y={H - 8} textAnchor="end" fontSize="10" className="fill-muted-foreground font-mono-ui">{last.date}</text>
        <path d={d} fill="none" strokeWidth={2.2} className="stroke-foreground" />
        {pts.map((p, i) => <circle key={p.date} cx={X(i)} cy={Y(p.pnlInr)} r={3} className={p.pnlInr < 0 ? "fill-destructive" : "fill-foreground"}><title>{`${p.date}: ${inr(p.pnlInr)} across ${p.contracts} contract(s)`}</title></circle>)}
      </svg>
      <p className="mt-1 text-[11px] text-muted-foreground">One mark per contract per day, recorded by the server from the live rupee feed, the bank's current rate sheet for US dollars (else FBIL) and official policy rates (a daily job adds a mark even if you don't visit). Mid-market values, not a bank's unwind price. {note}</p>
    </div>
  );
}
