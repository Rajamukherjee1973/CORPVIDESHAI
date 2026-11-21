import type { Threat } from './security';
export const BREACH_PLAYBOOKS: Record<string, { entry: string; target: string; method: string; evidence: string; residual: string }> = {
  credential: { entry: 'Replayed credential', target: 'Identity boundary', method: 'Verify identity → enforce company scope → deny access → revoke compromised sessions', evidence: 'Denied request + identity/scope decision', residual: 'A valid authorised session may still be abused; device-risk scoring and automatic revocation need separate deployment.' },
  tamper: { entry: 'Altered filing checkpoint', target: 'Append-only vault', method: 'Compare record digest → reject invalid workflow → isolate divergent copy → reconcile trusted history', evidence: 'Original / altered digest comparison', residual: 'Hash chains expose changes; they do not prevent privileged compromise or prove the underlying filing is true.' },
  exfil: { entry: 'Leaked token / bulk reads', target: 'Company records', method: 'Enforce owner scope → apply read limits → suspend token → review affected access', evidence: 'Scope denial + synthetic request-rate event', residual: 'Rate limiting, DLP, field encryption and automated key rotation here are proposed controls, not deployed incident response.' },
  payment: { entry: 'Substituted beneficiary', target: 'Release boundary', method: 'Compare sealed instruction → hold release → require independent review → re-authorise original beneficiary', evidence: 'Beneficiary fingerprint mismatch + hold', residual: 'No bank or SWIFT release integration exists; the hold is a local demonstration only.' },
};
export function breachFrame(threat: Threat | null, time: number) {
  const steps = threat?.steps ?? [];
  const current = steps.filter(s => s.atMs <= time).at(-1);
  return { phase: current?.kind ?? 'idle', current, blocked: steps.some(s => s.kind === 'contain' && time >= s.atMs), restored: steps.some(s => s.kind === 'restore' && time >= s.atMs) };
}
