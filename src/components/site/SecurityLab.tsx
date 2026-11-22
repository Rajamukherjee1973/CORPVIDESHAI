import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, CircleAlert, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  auditHeaders,
  chainHashes,
  firstBrokenLink,
  probePassed,
  quorumVerdict,
  sha256Hex,
  STRIDE,
  type ControlStatus,
  type HeaderCheck,
  type LedgerRecord,
} from "@/lib/security-lab";

const Tag = ({ ok, label }: { ok: boolean | null; label: string }) => (
  <span className={`font-mono-ui inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${ok === null ? "border-rule/30 text-muted-foreground" : ok ? "border-primary text-primary" : "border-foreground bg-foreground text-background"}`}>
    {ok === null ? <Loader2 className="h-3 w-3 animate-spin" /> : ok ? <CheckCircle2 className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
    {label}
  </span>
);

function Panel({ n, title, sub, children, action }: { n: string; title: string; sub: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border border-rule/25">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-rule/15 px-5 py-4">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">{n}</p>
          <h3 className="mt-1 font-display text-2xl leading-tight">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{sub}</p>
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

type Probe = { table: string; label: string; kind: "protected" | "public"; rows: number; error: string | null; passed: boolean };
const PROBES: { table: string; label: string; kind: "protected" | "public" }[] = [
  { table: "form_fc_records", label: "Form FC filings", kind: "protected" },
  { table: "gift_cases", label: "GIFT City cases", kind: "protected" },
  { table: "fund_proposals", label: "Fund proposals", kind: "protected" },
  { table: "contact_messages", label: "Contact messages", kind: "protected" },
  { table: "demo_requests", label: "Demo bookings", kind: "protected" },
  { table: "rbi_odi_releases", label: "RBI monthly releases (public by design)", kind: "public" },
];

/** Real checks against this site from the visitor's own browser. */
export function LiveChecks() {
  const [conn, setConn] = useState<{ https: boolean; secure: boolean; host: string } | null>(null);
  const [headers, setHeaders] = useState<HeaderCheck[] | null>(null);
  const [probes, setProbes] = useState<Probe[] | null>(null);
  const [ranAt, setRanAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setHeaders(null);
    setProbes(null);
    setConn({ https: location.protocol === "https:", secure: window.isSecureContext, host: location.host });
    try {
      const res = await fetch(location.href, { method: "HEAD", cache: "no-store" });
      setHeaders(auditHeaders((n) => res.headers.get(n)));
    } catch {
      setHeaders([]);
    }
    const anon = createClient(String(import.meta.env["VITE_SUPABASE_URL"]), String(import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "cv-security-probe" },
    });
    const out = await Promise.all(PROBES.map(async (p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (anon.from(p.table as any) as any).select("*").limit(3);
      const o = { rows: Array.isArray(data) ? data.length : 0, error: error ? String(error.code ?? error.message ?? "refused") : null };
      return { ...p, ...o, passed: probePassed(p.kind, o) };
    }));
    setProbes(out);
    setRanAt(new Date().toLocaleTimeString());
    setBusy(false);
  };

  useEffect(() => { void run(); }, []);

  const hdrPass = headers?.filter((h) => h.present).length ?? 0;
  const probePass = probes?.filter((p) => p.passed).length ?? 0;

  return (
    <Panel
      n="Live · read-only · from your browser"
      title="Check this site right now"
      sub="These are real requests from your browser to this website and its database, signed out. Nothing is changed. Results show what is true at this moment, including anything missing."
      action={<Button size="sm" onClick={() => void run()} disabled={busy}><RotateCcw className={`mr-1 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />{busy ? "Checking…" : "Run again"}</Button>}
    >
      <div className="grid gap-px border border-rule/20 bg-rule/15 sm:grid-cols-3">
        <div className="bg-background p-4">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Encrypted connection</p>
          <p className="mt-2 font-display text-3xl">{conn ? (conn.https ? "Yes" : "No") : "…"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{conn ? `${conn.host} · ${conn.https ? "https, padlock in your browser" : "local preview without https"}` : ""}</p>
        </div>
        <div className="bg-background p-4">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Protective browser rules</p>
          <p className="mt-2 font-display text-3xl">{headers ? `${hdrPass} / ${headers.length || 6}` : "…"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Security headers the hosting sends with each page</p>
        </div>
        <div className="bg-background p-4">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Private records stay private</p>
          <p className="mt-2 font-display text-3xl text-primary">{probes ? `${probePass} / ${probes.length}` : "…"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Signed-out reads of protected data return nothing</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">Database access rules · signed-out attempt</p>
          <ul className="mt-2 divide-y divide-rule/15 border-y border-rule/15">
            {(probes ?? PROBES.map((p) => ({ ...p, rows: 0, error: null, passed: false }))).map((p) => (
              <li key={p.table} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>{p.label}</span>
                {probes ? <Tag ok={p.passed} label={p.kind === "public" ? (p.passed ? `${p.rows} rows readable` : "not readable") : p.passed ? "blocked" : `${p.rows} rows exposed`} /> : <Tag ok={null} label="checking" />}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">Security headers on this page</p>
          <ul className="mt-2 divide-y divide-rule/15 border-y border-rule/15">
            {(headers ?? []).map((h) => (
              <li key={h.header} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <span><span className="block">{h.label}</span><span className="text-xs text-muted-foreground">{h.why}</span></span>
                <Tag ok={h.present} label={h.present ? "sent" : "missing"} />
              </li>
            ))}
            {!headers && <li className="py-2.5 text-sm text-muted-foreground">Reading headers…</li>}
            {headers && headers.length === 0 && <li className="py-2.5 text-sm text-muted-foreground">The browser could not read the headers.</li>}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{ranAt ? `Last run ${ranAt}. ` : ""}A missing header is reported as missing, not hidden. These checks are a quick self-test, not a penetration test or certification.</p>
    </Panel>
  );
}

const SEED: LedgerRecord[] = [
  { seq: 1, party: "Treasury · Reliance Industries", action: "Files ODI case", beneficiary: "SG-DBS-0042-7781", amountCr: 475 },
  { seq: 2, party: "AD Category-I bank", action: "Verifies documents", beneficiary: "SG-DBS-0042-7781", amountCr: 475 },
  { seq: 3, party: "RBI lane", action: "Acknowledges Form FC", beneficiary: "SG-DBS-0042-7781", amountCr: 475 },
  { seq: 4, party: "IFSCA lane", action: "Clears GIFT routing", beneficiary: "SG-DBS-0042-7781", amountCr: 475 },
  { seq: 5, party: "AD bank", action: "Releases remittance", beneficiary: "SG-DBS-0042-7781", amountCr: 475 },
];
const NODES = 8;

/** Real SHA-256 hash chain: edit any record and see exactly where the seal breaks, then try to forge it. */
export function ChainLab() {
  const [recs, setRecs] = useState<LedgerRecord[]>(SEED);
  const [sealed, setSealed] = useState<string[]>([]);
  const [now, setNow] = useState<string[]>([]);
  const [broken, setBroken] = useState(-1);
  const [forged, setForged] = useState(false);

  useEffect(() => { void chainHashes(SEED).then((h) => { setSealed(h); setNow(h); }); }, []);
  useEffect(() => {
    if (!sealed.length) return;
    void chainHashes(recs).then(setNow);
    void firstBrokenLink(recs, sealed).then(setBroken);
  }, [recs, sealed]);

  const edit = (i: number, patch: Partial<LedgerRecord>) => { setForged(false); setRecs(recs.map((r, k) => (k === i ? { ...r, ...patch } : r))); };
  const reset = () => { setRecs(SEED); setForged(false); };
  const head = now[now.length - 1] ?? "";
  const trueHead = sealed[sealed.length - 1] ?? "";
  // Attacker re-hashes their copy so it is internally consistent; the other seven copies still hold the true head.
  const copies = forged ? [head, ...Array(NODES - 1).fill(trueHead)] : Array(NODES).fill(trueHead);
  const need = Math.ceil(NODES * 0.75);
  const verdict = quorumVerdict(forged ? head : trueHead, copies, need);
  const tampered = broken >= 0;

  return (
    <Panel
      n="Live · real SHA-256 in your browser"
      title="Try to change a filed record"
      sub="Each record's seal includes the seal before it. Change any amount or account and the chain breaks from that point on. Then try what a real attacker would: re-seal your copy and see the other copies outvote it."
      action={<Button size="sm" variant="outline" onClick={reset}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restore</Button>}
    >
      <div className="overflow-x-auto border border-rule/20">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr><th className="p-3">#</th><th className="p-3">Party · action</th><th className="p-3">Beneficiary account</th><th className="p-3">Amount (₹ cr)</th><th className="p-3">Seal now</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {recs.map((r, i) => {
              const bad = tampered && i >= broken;
              return (
                <tr key={r.seq} className={`border-t border-rule/15 ${bad ? "bg-primary/[0.06]" : ""}`}>
                  <td className="p-3 font-mono-ui">{r.seq}</td>
                  <td className="p-3"><span className="block">{r.party}</span><span className="text-xs text-muted-foreground">{r.action}</span></td>
                  <td className="p-3"><input aria-label={`Beneficiary for record ${r.seq}`} value={r.beneficiary} onChange={(e) => edit(i, { beneficiary: e.target.value })} className="w-44 border border-input bg-background px-2 py-1 font-mono-ui text-xs" /></td>
                  <td className="p-3"><input aria-label={`Amount for record ${r.seq}`} type="number" value={r.amountCr} onChange={(e) => edit(i, { amountCr: Number(e.target.value) || 0 })} className="w-24 border border-input bg-background px-2 py-1 font-mono-ui text-xs" /></td>
                  <td className="p-3 font-mono-ui text-[10px] text-muted-foreground">{(now[i] ?? "").slice(0, 16)}…</td>
                  <td className="p-3">{sealed.length ? <Tag ok={!bad} label={bad ? (i === broken ? "edited here" : "chain broken") : "intact"} /> : <Tag ok={null} label="sealing" />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-px border border-rule/20 bg-rule/15 md:grid-cols-3">
        <div className="bg-background p-4">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Chain check</p>
          <p className={`mt-2 font-display text-2xl ${tampered ? "text-primary" : ""}`}>{tampered ? `Broken at record ${broken + 1}` : "All seals match"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Recomputed seals compared with the ones stored at filing.</p>
        </div>
        <div className="bg-background p-4">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Attacker re-seals their copy</p>
          <Button size="sm" className="mt-2" variant={forged ? "secondary" : "default"} disabled={!tampered} onClick={() => setForged(true)}>{forged ? "Forgery submitted" : "Re-seal and submit"}</Button>
          <p className="mt-2 text-xs text-muted-foreground">{tampered ? "Their copy now looks internally consistent." : "Edit a record first."}</p>
        </div>
        <div className="bg-background p-4">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Copies that agree ({need} of {NODES} needed)</p>
          <div className="mt-2 flex gap-1" aria-label={`${verdict.agree} of ${NODES} copies agree`}>
            {copies.map((c, i) => <span key={i} className={`h-6 flex-1 ${c === (forged ? head : trueHead) ? "bg-primary" : "bg-rule/30"}`} />)}
          </div>
          <p className={`mt-2 font-display text-2xl ${forged ? "text-primary" : ""}`}>{forged ? `Rejected · ${verdict.agree}/${NODES}` : `Accepted · ${verdict.agree}/${NODES}`}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">The hashing is real; the eight copies are drawn in your browser to show the voting rule. In the prototype's GIFT and Form FC portals the database itself refuses out-of-order or edited entries.</p>
    </Panel>
  );
}

/** Beneficiary lock: the release instruction must hash to the account sealed at clearance. */
export function BeneficiaryLab() {
  const sealedAcct = "SG-DBS-0042-7781 · DBS Bank Ltd · Singapore";
  const [acct, setAcct] = useState(sealedAcct);
  const [seal, setSeal] = useState("");
  const [now, setNow] = useState("");
  useEffect(() => { void sha256Hex(sealedAcct).then(setSeal); }, []);
  useEffect(() => { void sha256Hex(acct).then(setNow); }, [acct]);
  const ok = seal !== "" && now === seal;
  return (
    <Panel n="Live · real SHA-256" title="Swap the payee before release" sub="The account approved at clearance is sealed. The release only goes ahead if the instruction matches that seal — change a single character and it halts.">
      <label htmlFor="ben" className="text-xs text-muted-foreground">Release instruction · beneficiary</label>
      <div className="mt-1 flex flex-wrap gap-2">
        <input id="ben" value={acct} onChange={(e) => setAcct(e.target.value)} className="min-w-64 flex-1 border border-input bg-background px-3 py-2 font-mono-ui text-sm" />
        <Button size="sm" variant="outline" onClick={() => setAcct("SG-DBS-0042-7718 · DBS Bank Ltd · Singapore")}>Try a look-alike account</Button>
        <Button size="sm" variant="ghost" onClick={() => setAcct(sealedAcct)}>Restore</Button>
      </div>
      <dl className="mt-4 grid gap-3 font-mono-ui text-[11px] sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Sealed at clearance</dt><dd className="break-all">{seal}</dd></div>
        <div><dt className="text-muted-foreground">Instruction now</dt><dd className={`break-all ${ok ? "" : "text-primary"}`}>{now}</dd></div>
      </dl>
      <p className={`mt-4 flex items-center gap-2 font-display text-2xl ${ok ? "" : "text-primary"}`}>
        {ok ? <ShieldCheck className="h-6 w-6" /> : <CircleAlert className="h-6 w-6" />}
        {ok ? "Matches — release may proceed" : "Mismatch — release halted before money leaves India"}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">Demonstration of the matching rule. Real releases are made by the authorised dealer bank in its own systems.</p>
    </Panel>
  );
}

const STATUS_STYLE: Record<ControlStatus, string> = {
  Enforced: "border-primary text-primary",
  Simulated: "border-rule/40 text-foreground",
  "Not built": "border-foreground bg-foreground text-background",
};

export function StrideMatrix() {
  const [filter, setFilter] = useState<ControlStatus | "All">("All");
  const rows = STRIDE.filter((r) => filter === "All" || r.status === filter);
  const count = (s: ControlStatus) => STRIDE.filter((r) => r.status === s).length;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(["All", "Enforced", "Simulated", "Not built"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`font-mono-ui px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${filter === f ? "bg-primary text-primary-foreground" : "border border-rule/30 text-muted-foreground hover:text-primary"}`}>
            {f}{f !== "All" ? ` · ${count(f)}` : ` · ${STRIDE.length}`}
          </button>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto border border-rule/20">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-foreground text-background">
            <tr className="font-mono-ui text-[10px] uppercase tracking-[0.16em]"><th className="px-4 py-3">Threat class</th><th className="px-4 py-3">What could happen</th><th className="px-4 py-3">Control</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Where to see it</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.threat} className="border-t border-rule/15 align-top">
                <td className="px-4 py-3 font-mono-ui text-[11px] uppercase tracking-[0.12em] text-primary">{r.cat}<span className="mt-1 block normal-case tracking-normal text-muted-foreground">{r.asset}</span></td>
                <td className="px-4 py-3">{r.threat}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.control}</td>
                <td className="px-4 py-3"><span className={`font-mono-ui whitespace-nowrap border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${STATUS_STYLE[r.status]}`}>{r.status}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.check}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Threat classes follow the STRIDE method. "Enforced" means the prototype's own database or server applies the control; "Simulated" means it is demonstrated, not operated; "Not built" needs production infrastructure.</p>
    </div>
  );
}
