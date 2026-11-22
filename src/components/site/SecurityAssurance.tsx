const POSTURE = [
  { k: "8", l: "Ledger nodes", s: "Hash-chained, quorum write" },
  { k: "6", l: "Regulator lanes", s: "Least-sight field scoping" },
  { k: "4", l: "Threat drills", s: "Detect · contain · recover" },
  { k: "3", l: "Live self-checks", s: "Read-only, run from your browser" },
];

const CONTROLS = [
  { c: "Identity gate & session isolation", f: "ISO/IEC 27001 A.5.15–A.5.18 · RBI IT Governance Directions 2023", e: "Role-scoped sign-in, row-level access rules" },
  { c: "Append-only hash-chained records", f: "ISO/IEC 27001 A.8.15 · SOC 2 CC7.2", e: "SHA-256 chain verified in database trigger" },
  { c: "Least-privilege regulator views", f: "DPDP Act 2023 §8 · FINMA Circular 2023/1 (operational risk)", e: "Per-lane field entitlements" },
  { c: "Beneficiary lock before release", f: "SWIFT CSP 2.x · RBI Cyber Security Framework for banks", e: "Release halts on beneficiary hash mismatch" },
  { c: "Incident detection & recovery drill", f: "CERT-In Directions 2022 (6-hour reporting) · NIST CSF 2.0 RS/RC", e: "Scripted replay with timed checkpoints" },
];

export function SecurityAssuranceHeader() {
  return (
    <header>
      <div className="h-1.5 w-24 bg-primary" />
      <p className="font-mono-ui mt-6 text-[10px] uppercase tracking-[0.22em] text-primary">
        Section 07 — Security assurance · Institutional review edition
      </p>
      <h1 className="mt-4 max-w-5xl font-display text-5xl leading-[1.02] tracking-tight md:text-7xl">
        Built like a vault.<br />Tested like a breach.
      </h1>
      <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
        A federated, hash-chained rail that routes one treasury filing to six authorities at once — and a live
        theatre that attacks it, so investors and risk officers can watch detection, containment and recovery step by step.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-px border border-rule/20 bg-rule/15 md:grid-cols-4">
        {POSTURE.map((p) => (
          <div key={p.l} className="bg-background px-5 py-5">
            <p className="font-display text-5xl leading-none text-primary">{p.k}</p>
            <p className="font-mono-ui mt-3 text-[11px] uppercase tracking-[0.16em]">{p.l}</p>
            <p className="mt-1 text-xs text-muted-foreground">{p.s}</p>
          </div>
        ))}
      </div>

    </header>
  );
}

export function SecurityControlMap() {
  return (
    <div>
      <div className="overflow-x-auto border border-rule/20">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-foreground text-background">
            <tr className="font-mono-ui text-[10px] uppercase tracking-[0.16em]">
              <th className="px-5 py-3">Safeguard</th>
              <th className="px-5 py-3">Reference framework (design mapping)</th>
              <th className="px-5 py-3">Prototype evidence</th>
            </tr>
          </thead>
          <tbody>
            {CONTROLS.map((r, i) => (
              <tr key={r.c} className="border-t border-rule/15 align-top">
                <td className="px-5 py-4">
                  <span className="font-mono-ui mr-2 text-[10px] text-primary">{String(i + 1).padStart(2, "0")}</span>
                  {r.c}
                </td>
                <td className="px-5 py-4 text-muted-foreground">{r.f}</td>
                <td className="px-5 py-4 text-muted-foreground">{r.e}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Mapping shows which published framework each safeguard was designed against. It is not a certification, audit opinion or
        penetration-test result; no ISO, SOC 2, FINMA or RBI assessment has been performed.
      </p>
    </div>
  );
}
