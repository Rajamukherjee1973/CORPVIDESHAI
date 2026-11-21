import { useState } from "react";
import { REGULATORS } from "@/data/hubs";

export function RegulatorStrip() {
  return (
    <div className="grid gap-px bg-rule/15 md:grid-cols-3 lg:grid-cols-6">
      {REGULATORS.map((r) => (
        <div key={r.code} className="group bg-background p-5">
          <p className="font-display text-2xl text-primary">{r.code}</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{r.name}</p>
          <dl className="mt-4 space-y-2.5 border-t border-rule/15 pt-3">
            {[
              ["Sees", r.sees],
              ["When", r.when],
              ["Receives", r.proof],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
                  {k}
                </dt>
                <dd className="text-[12px] leading-snug">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

export function ProofVerifier() {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const steps = [
    "Loading Groth16 verification key",
    "Reading public inputs — ceiling, commitment hash, epoch",
    "Checking pairing equation",
    "Anchoring result to evidence ledger",
  ];

  const run = () => {
    setState("running");
    setTimeout(() => setState("done"), 1500);
  };

  return (
    <div className="grid gap-px bg-rule/15 md:grid-cols-2">
      <div className="bg-background p-6">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-primary">
          Proof artefact
        </p>
        <h3 className="font-display mt-2 text-3xl">Headroom proof — no balance sheet shown</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The regulator needs one fact: this remittance stays inside the Rule 7 ceiling. It does not
          need the company's net worth, its cash position, or its pipeline. A zero-knowledge proof
          settles the fact and discloses nothing else.
        </p>
        <pre className="font-mono-ui mt-5 overflow-x-auto border border-rule/20 bg-secondary p-4 text-[11px] leading-relaxed">{`scheme      groth16 (bn254)
statement   utilised + proposed <= 4 x net_worth
public      ceiling_commitment, epoch, entity_id
private     net_worth, utilised, proposed
proof       0x8f31a4...c02e   (192 bytes)
anchor      block 4,821,306`}</pre>
      </div>
      <div className="bg-background p-6">
        <button
          onClick={run}
          className="w-full border border-primary bg-primary px-5 py-3 font-mono-ui text-[11px] uppercase tracking-[0.18em] text-primary-foreground transition-opacity hover:opacity-90"
        >
          {state === "idle" ? "Verify this proof" : state === "running" ? "Verifying…" : "Verify again"}
        </button>
        <ol className="mt-5 space-y-3">
          {steps.map((s, i) => (
            <li key={s} className="flex items-start gap-3">
              <span
                className={`mt-1 block h-2.5 w-2.5 shrink-0 ${
                  state === "done" ? "bg-primary" : state === "running" ? "animate-pulse bg-primary/40" : "bg-rule/20"
                }`}
              />
              <span className="text-sm">
                <span className="font-mono-ui mr-2 text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s}
              </span>
            </li>
          ))}
        </ol>
        <div
          className={`mt-6 border p-4 ${
            state === "done" ? "border-primary" : "border-rule/20"
          }`}
        >
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Result
          </p>
          <p className={`font-display text-3xl ${state === "done" ? "text-primary" : "text-muted-foreground"}`}>
            {state === "done" ? "Valid — within ceiling" : "Awaiting verification"}
          </p>
          {state === "done" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Verified without disclosing net worth, utilisation, or the proposed amount.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}