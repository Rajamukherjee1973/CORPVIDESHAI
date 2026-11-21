import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordCapture, useFxStream } from "@/lib/fx-stream";
import { copilotAsk, documentRead } from "@/lib/frontier.functions";
import type { CopilotAnswer, DocExtract } from "@/lib/frontier.server";
import { findPurpose } from "@/data/purposes";
import { scenarioCurrency, useTreasuryScenario } from "@/lib/treasury-scenario";
import { logAgentRun } from "@/lib/agent-session";

const CARD = "border border-rule/20 bg-background p-5";
const LABEL = "font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground";
const INPUT = "w-full border border-rule/25 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
const BTN = "font-mono-ui bg-primary px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-50";

const SAMPLES = [
  "Can Tata Steel send ₹2,000 crore to Singapore under the automatic route this quarter?",
  "Should we hedge a $50 million OPI into London now or wait a week?",
  "हमारी कंपनी दुबई में सहायक कंपनी खोलना चाहती है — कौन से फॉर्म भरने होंगे?",
];

/** AI treasury copilot. The shared treasury scenario is passed as context only — never as authorization. */
export function TreasuryCopilot({ desk = "Frontier desk" }: { desk?: string }) {
  const ask = useServerFn(copilotAsk);
  const tape = useFxStream();
  const [scenario] = useTreasuryScenario();
  const purpose = findPurpose(scenario.purpose);
  const ccy = scenarioCurrency(scenario);
  const scenarioQ = useMemo(
    () => `Our treasury plans ₹${scenario.amountCr.toLocaleString("en-IN")} crore into ${scenario.hub} (${ccy}) for "${purpose?.label ?? scenario.purpose}". Which route applies, what must we file and should we hedge now?`,
    [scenario.amountCr, scenario.hub, ccy, purpose?.label, scenario.purpose],
  );
  const [q, setQ] = useState(SAMPLES[0]!);
  const [busy, setBusy] = useState(false);
  const [ans, setAns] = useState<CopilotAnswer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setErr(null); setAns(null);
    const usd = tape.inrPer["USD"];
    const local = tape.inrPer[ccy];
    const ctx = [
      `USD/INR ${usd?.toFixed(3) ?? "n/a"} (${tape.source}, ${tape.anchor}).`,
      local && ccy !== "USD" ? `${ccy}/INR ${local.toFixed(4)}.` : "",
      `Demonstration scenario: ${scenario.hub}, ${purpose?.label ?? scenario.purpose}, ₹${scenario.amountCr} crore.`,
      "52 hubs. Six review lenses: RBI (via AD bank), IFSCA, Ministry of Finance, FIU-IND, DPIIT, CBDT — only RBI and IFSCA review individual cases today.",
    ].filter(Boolean).join(" ");
    recordCapture(desk, "action", "Copilot question", ccy);
    const t0 = performance.now();
    try {
      const r = await ask({ data: { question: q, context: ctx } });
      logAgentRun("copilot", performance.now() - t0, r.ok);
      if (r.ok) setAns(r.answer); else setErr(r.error);
    } catch { logAgentRun("copilot", performance.now() - t0, false); setErr("The copilot could not answer just now. Try again in a moment."); }
    setBusy(false);
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={CARD}>
        <p className={LABEL}>Ask in English or Hindi</p>
        <textarea aria-label="Copilot question" value={q} onChange={(e) => setQ(e.target.value)} rows={4} className={`${INPUT} mt-3`} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setQ(scenarioQ)} className="border border-primary px-2 py-1 text-left text-xs text-primary hover:bg-primary hover:text-primary-foreground">
            Use treasury scenario · {scenario.hub} · ₹{scenario.amountCr.toLocaleString("en-IN")} cr
          </button>
          {SAMPLES.map((s) => (
            <button type="button" key={s} onClick={() => setQ(s)} className="border border-rule/25 px-2 py-1 text-left text-xs text-muted-foreground hover:text-primary">
              {s.slice(0, 44)}…
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={run} disabled={busy || q.trim().length < 3} className={BTN}>
            {busy ? "Thinking…" : "Get recommendation"}
          </button>
          <p className="text-xs text-muted-foreground">Reads the live rupee tape. Not legal advice.</p>
        </div>
      </div>
      <div className={CARD} aria-live="polite">
        {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
        {!ans && !err ? <p className="text-sm text-muted-foreground">{busy ? "Reading the law and the live tape… usually 10–20 seconds." : "The forecast, recommended action and legal basis appear here."}</p> : null}
        {ans ? (
          <div className="space-y-3" aria-label="Copilot answer">
            <div><p className={LABEL}>Forecast</p><p className="mt-1 text-base font-medium leading-snug">{ans.forecast}</p></div>
            <div className="border-l-4 border-primary pl-4"><p className={LABEL}>Recommended action</p><p className="mt-1 text-sm">{ans.action}</p></div>
            <details>
              <summary className={`${LABEL} cursor-pointer hover:text-primary`}>Legal basis ({ans.legalBasis.length}) · risks ({Math.min(3, ans.risks.length)})</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{ans.legalBasis.map((l) => <li key={l}>{l}</li>)}</ul>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{ans.risks.slice(0, 3).map((l) => <li key={l}>{l}</li>)}</ul>
            </details>
            <p className="font-mono-ui text-[11px] text-primary">Model confidence {Math.round(Math.min(1, Math.max(0, ans.confidence)) * 100)}% · not a calibrated probability</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const SAMPLE_DOC = `BOARD RESOLUTION — Infosys Limited
Resolved that the Company invest USD 25,000,000 in equity of Infosys Singapore Pte Ltd, a wholly owned subsidiary in Singapore, as overseas direct investment.
Authorised Dealer: HDFC Bank, Mumbai. Date: 12 September 2026.`;

/** AI document reader: extracts deal facts and lists the filings they trigger. */
export function DocumentReader({ desk = "Frontier desk" }: { desk?: string }) {
  const read = useServerFn(documentRead);
  const [text, setText] = useState(SAMPLE_DOC);
  const [image, setImage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<DocExtract | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 4_000_000) { setErr("Please choose a file under 4 MB."); return; }
    if (f.type.startsWith("image/")) {
      const r = new FileReader(); r.onload = () => setImage(String(r.result)); r.readAsDataURL(f);
    } else { void f.text().then((t) => { setText(t.slice(0, 20000)); setImage(undefined); }); }
  };
  const run = async () => {
    setBusy(true); setErr(null); setDoc(null);
    recordCapture(desk, "action", "Document read", "USD");
    const t0 = performance.now();
    try {
      const r = await read({ data: { text, image } });
      logAgentRun("reader", performance.now() - t0, r.ok);
      if (r.ok) setDoc(r.doc); else setErr(r.error);
    } catch { logAgentRun("reader", performance.now() - t0, false); setErr("The document could not be read just now. Try again in a moment."); }
    setBusy(false);
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={CARD}>
        <p className={LABEL}>Paste text or upload a photo / text file</p>
        <textarea aria-label="Document text" value={text} onChange={(e) => setText(e.target.value)} rows={6} className={`${INPUT} mt-3 font-mono text-xs`} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input type="file" aria-label="Upload document" accept="image/*,.txt,.md,.csv" onChange={(e) => onFile(e.target.files?.[0])} className="max-w-full text-xs" />
          {image ? <button type="button" onClick={() => setImage(undefined)} className="text-xs text-primary underline">Remove image</button> : null}
        </div>
        <button type="button" onClick={run} disabled={busy || (!image && text.trim().length < 20)} className={`${BTN} mt-4 block`}>{busy ? "Reading…" : "Read and draft filings"}</button>
      </div>
      <div className={CARD} aria-live="polite">
        {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
        {!doc && !err ? <p className="text-sm text-muted-foreground">{busy ? "Reading the document… usually 10–20 seconds." : "Extracted fields and the filings they trigger appear here."}</p> : null}
        {doc ? (
          <div className="space-y-3" aria-label="Document reader result">
            <p className="font-display text-xl">{doc.documentType}</p>
            <p className="text-sm">{doc.summary}</p>
            <dl className="grid grid-cols-2 gap-px bg-rule/20 text-sm">
              {([["Entity", doc.entity], ["Counterparty", doc.counterparty], ["Amount", `${doc.amount} ${doc.currency}`], ["Jurisdiction", doc.jurisdiction], ["Route", doc.route]] as const).map(([k, v]) => (
                <div key={k} className="bg-background p-2.5"><dt className={LABEL}>{k}</dt><dd className="mt-1 break-words">{v}</dd></div>
              ))}
            </dl>
            <div><p className={LABEL}>Filings drafted</p><div className="mt-2 flex flex-wrap gap-2">{doc.filings.map((f) => <span key={f} className="bg-primary px-2 py-1 text-xs text-primary-foreground">{f}</span>)}</div></div>
            {doc.missing.length ? <div><p className={LABEL}>Still missing</p><ul className="mt-1 list-disc pl-5 text-sm">{doc.missing.map((m) => <li key={m}>{m}</li>)}</ul></div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
