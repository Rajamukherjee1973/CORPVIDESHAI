# CorpVidesh service boundaries

The application has four bounded service domains. They share a TanStack Start deployment today; they are **not independently hosted microservices**. `contracts.ts` describes versioned domain contracts and deterministic CI gates. The legal contract is a validated DTO; the other version labels describe existing interfaces and do not imply a new external API.

## Boundary rules

- Callable application endpoints remain `*.functions.ts`; implementations load `*.server.ts` inside handlers. Pure policy is separately testable without secrets, model calls or a database.
- Public legal triage takes anonymous numeric/category facts, stores nothing, never authorizes a transfer and returns traceable advisory findings. Authenticated filings retain existing company membership and RLS checks.
- Agent retrieval remains an application-local curated corpus with semantic/lexical fallback, not a continuously updated legal database. Model-mediated QA is not lawyer certification.
- Market adapters retain source timestamps, stale/unavailable indicators and observed-history provenance; no synthetic evidence is substituted.
- A service failure must not be translated into approval, verified law or a successful filing. Frontend retry is explicit; no mutation is automatically replayed.
- Corporate/regulator entrypoints reuse `filing-store.server.ts` after their existing access checks. The shared store retains user identity, officer, authority, demonstration marker and company-filtered release snapshots; no authorization is inferred from desk selectors.
- `runtime.server.ts` adds request-local correlation headers, no-store responses and payload-free duration/outcome logs. A returned domain error remains a domain error, not a healthy-service claim. These logs are not a durable external telemetry service.
- `audited-work.ts` separates work failure from audit-write failure. Failed success persistence never causes another model call or a misleading failed-model write. Failure-audit loss is surfaced rather than silently ignored.

## CI

`.github/workflows/service-ci.yml` runs four independent deterministic test jobs on pull requests, main pushes or manual invocation, followed by an integrated application build. Tests need no gateway secrets and make no paid model calls. A configured workflow does not prove a remotely executed CI run, branch protection or production load capacity. Set required checks in the repository before using them as merge gates.

## Extracting independently deployed services

Provision service hosting, separate workload identity, authenticated versioned HTTP transport, idempotency keys for mutations, durable outbox/queue infrastructure, retry/dead-letter rules, per-domain data ownership, telemetry and measured SLOs before extracting domains. Do not introduce fake health checks, pretend queues or process-global durable state. Current shared Cloud storage and service-managed access remain authoritative.

## Legal release discipline

Reference summaries are a bounded 2022-framework baseline, not a comprehensive current-law consolidation. Update source, provision and interpretation together with regression cases after counsel verifies an amendment. Classify instrument/control/sector first, assess general ceiling second, route only after evidence and approval checks. INR denomination and INR-linked financial-product activity are distinct. Regulatory integrations, filing acknowledgements and six-authority approval are not simulated into reality.