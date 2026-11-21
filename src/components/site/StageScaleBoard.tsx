import { useState } from "react";

export type Cov = 2 | 1 | 0; // 2 core scope · 1 partial / adjacent · 0 outside scope
export const RIVALS = ["Bloomberg", "LSEG", "RBI FIRMS", "SWIFT gpi", "ClearTax / Signzy"] as const;

export const STAGES: { n: string; h: string; cv: string; rivals: Cov[]; edge: string }[] = [
  { n: "01", h: "Market & FX intelligence", cv: "Live 52-hub INR board, RBI reference deviation, conditional AI outlook", rivals: [2, 2, 0, 0, 0], edge: "Ties the rate to the specific outbound case instead of a standalone terminal screen." },
  { n: "02", h: "FEMA route reasoning", cv: "Automatic / Approval triage with cited OI Rules, 400% ceiling test", rivals: [0, 1, 0, 0, 1], edge: "Reasons over the statute for the deal; terminals carry news and research, not route logic." },
  { n: "03", h: "Document checklist & gating", cv: "8–9 statute-linked documents; simulation blocked until complete", rivals: [0, 0, 1, 0, 2], edge: "Each document is tied to the rule that demands it and gates the next step." },
  { n: "04", h: "Six-authority parallel review", cv: "One dossier, six lanes at once, append-only actions per desk", rivals: [0, 0, 1, 0, 0], edge: "Lanes for IFSCA, MoF, FIU-IND, DPIIT and CBDT are a proposed model, not current law." },
  { n: "05", h: "Section 195 & treaty tax", cv: "Income-specific treaty rates, 15CA/15CB, no WHT on principal", rivals: [0, 1, 0, 0, 2], edge: "Tax position is computed inside the same case record, not a separate tool." },
  { n: "06", h: "Settlement & tracking", cv: "Beneficiary-hash lock, GIFT IBU release (simulated)", rivals: [0, 0, 0, 2, 0], edge: "SWIFT gpi tracks payments superbly; CorpVidesh links the release to the cleared approval." },
  { n: "07", h: "Evidence & audit trail", cv: "SHA-256 hash chain, replayable case file, Form FC register", rivals: [1, 1, 1, 1, 1], edge: "One record across every stage; incumbents each keep their own." },
];

const cell = (c: Cov) =>
  c === 2 ? "bg-foreground" : c === 1 ? "bg-foreground/30" : "bg-transparent border border-rule/30";

export function StageScaleBoard() {
  const [i, setI] = useState(0);
  const s = STAGES[i] ?? STAGES[0]!;
  const reach = STAGES.map((st) => Math.max(...st.rivals));
  return (
    <div className="border border-rule/20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="font-mono-ui bg-foreground text-[10px] uppercase tracking-[0.14em] text-background">
              <th className="px-4 py-3">Stage</th>
              {RIVALS.map((r) => <th key={r} className="px-3 py-3 text-center">{r}</th>)}
              <th className="bg-primary px-4 py-3 text-center text-primary-foreground">CorpVidesh AI</th>
            </tr>
          </thead>
          <tbody>
            {STAGES.map((st, k) => (
              <tr key={st.n} onClick={() => setI(k)} aria-selected={k === i}
                className={`cursor-pointer border-t border-rule/15 ${k === i ? "bg-primary/[0.06]" : "hover:bg-muted/40"}`}>
                <td className="px-4 py-3"><span className="font-mono-ui mr-2 text-[10px] text-primary">{st.n}</span>{st.h}</td>
                {st.rivals.map((c, j) => (
                  <td key={j} className="px-3 py-3"><span className={`mx-auto block h-3 w-10 ${cell(c)}`} /></td>
                ))}
                <td className="px-4 py-3"><span className="mx-auto block h-3 w-10 bg-primary" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-px border-t border-rule/20 bg-rule/15 lg:grid-cols-[1.2fr_1fr]">
        <div className="bg-background p-6">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Stage {s.n} · selected</p>
          <p className="font-display mt-2 text-3xl">{s.h}</p>
          <p className="mt-3 text-sm"><span className="font-mono-ui text-[10px] uppercase text-primary">CorpVidesh · </span>{s.cv}</p>
          <p className="mt-3 border-l-2 border-primary pl-3 text-sm text-muted-foreground">{s.edge}</p>
          <div className="mt-4 flex gap-2">
            <button type="button" className="font-mono-ui border border-rule/30 px-3 py-1.5 text-[10px] uppercase" onClick={() => setI((i + STAGES.length - 1) % STAGES.length)}>Back</button>
            <button type="button" className="font-mono-ui bg-primary px-3 py-1.5 text-[10px] uppercase text-primary-foreground" onClick={() => setI((i + 1) % STAGES.length)}>Next stage</button>
          </div>
        </div>
        <div className="bg-background p-6">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Single-record reach across 7 stages</p>
          {[...RIVALS.map((r, j) => [r, STAGES.filter((st) => st.rivals[j] === 2).length] as const), ["CorpVidesh AI", 7] as const].map(([r, n]) => (
            <div key={r} className="mt-3">
              <div className="flex justify-between text-xs"><span>{r}</span><span className="font-mono-ui">{n}/7</span></div>
              <div className="mt-1 h-2 bg-rule/15"><div className={`h-2 ${r === "CorpVidesh AI" ? "bg-primary" : "bg-foreground/60"}`} style={{ width: `${(n / 7) * 100}%` }} /></div>
            </div>
          ))}
          <p className="mt-4 text-xs text-muted-foreground">Stages where no incumbent has core scope: {reach.filter((r) => r < 2).length} of 7.</p>
        </div>
      </div>
      <p className="border-t border-rule/15 px-5 py-3 text-xs text-muted-foreground">
        Legend: solid = core product scope · shaded = partial or adjacent · outline = outside scope, based on each vendor's public product description.
        This compares scope across the outbound workflow, not quality, speed or market share. CorpVidesh AI is a prototype; its stages are demonstrations, not production deployments.
      </p>
    </div>
  );
}
