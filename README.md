# CorpVidesh AI

**Bharatvarsha's first RegTech infrastructure for outbound capital** — a connected decision workspace where Indian corporate treasuries plan ODI/OPI investments across 52 international financial hubs (plus a separate group of 10 African SADC/COMESA hubs), and regulators review demonstration filings on a shared, append-only evidence rail.

**Live prototype:** https://corpvideshai.com
**Source code:** https://github.com/Rajamukherjee1973/CORPVIDESHAI · in-app GitHub tab at https://corpvideshai.com/source
**Team:** Quantum Leap — Department of Law, Brainware University

---

## Table of contents

1. [The problem](#1-the-problem)
2. [The solution](#2-the-solution)
3. [Feature map](#3-feature-map)
4. [System architecture](#4-system-architecture)
5. [Technology stack](#5-technology-stack)
6. [Project structure](#6-project-structure)
7. [Getting started](#7-getting-started)
8. [Environment variables](#8-environment-variables)
9. [Database, security and access control](#9-database-security-and-access-control)
10. [Server functions and public API](#10-server-functions-and-public-api)
11. [AI agent layer](#11-ai-agent-layer)
12. [Testing and continuous integration](#12-testing-and-continuous-integration)
13. [Key implementation excerpts](#13-key-implementation-excerpts)
14. [Proof boundary — read this before evaluating](#14-proof-boundary--read-this-before-evaluating)
15. [Team Quantum Leap](#15-team-quantum-leap)
16. [License and copyright](#16-license-and-copyright)

---

## 1. The problem

India's top corporates invest abroad every week under the Foreign Exchange Management (Overseas Investment) Rules, 2022. Each remittance file today means:

- **45–60 day turnaround** across counsel, AD Category-I bank desks and regulator correspondence.
- **Fragmented oversight** — RBI, IFSCA, the Ministry of Finance, FIU-IND, DPIIT and CBDT each see a different slice of the same transaction, after the fact.
- **Rule 7 ceiling risk** — the 400% net-worth ceiling is computed manually at group level, and breaches surface late.
- **No machine-readable statute** — eligibility, route (automatic vs approval) and treaty positions live in PDFs and email threads.

## 2. The solution

CorpVidesh AI is a **unified pre-validation rail**:

- A treasury console where a CFO selects the company, hub, currency, investment class and amount, and immediately sees headroom, route determination, treaty withholding and a document checklist.
- A **deterministic rules engine** that holds the veto on every ceiling, route and prohibition — AI drafts and explains, but never decides.
- An **append-only evidence ledger** with hash-chained records that regulators read while the transaction is still forming.
- **Demonstration portals** for corporates, funds, regulators and GIFT City desks, with real accounts, row-level security and role-gated actions.

## 3. Feature map

| Surface | Route | What it does |
|---|---|---|
| Applications hub | `/access` | Six-step workflow navigator, live market tickers, 1,000-company and 52-hub selectors, 3D clearance simulation |
| Treasury Console | `/console` | Merged corporate dashboard: filings, Form FC submission, headroom, 212 ODI/OPI scenarios, FEMA library, 5-year FX history |
| Prediction | `/intelligence` | Server-side currency outlook agent with provider snapshots, conditional scenarios and visible reasoning |
| 52 Hubs | `/hubs`, `/tape`, `/markets` | Live 52-currency INR feed, hub comparison, treaty/arrangement indicators, India–London interbank tape |
| Ledger | `/ledger` | Corridor ledger with treaty-based withholding pricing, shared treasury scenario |
| Evidence Studio | `/evidence` | Runnable PoC safeguards, mechanism demonstrations, simulated case file on live FX |
| Agent Desk | `/agents` | Five compact agents (statutory graph, copilot, document reader, currency outlook, read tools) as shareable tabs |
| Regulator Portal | `/regulator-portal` | Authenticated desks, append-only regulator actions, Form FC review workflow |
| GIFT Portal | `/gift-portal` | Demo GIFT City clearance: atomic case creation, hash chain, nine public showcase desks |
| Fund Portal | `/fund-portal` | Investor proposals with database-generated references and append-only review events |
| Filings register | `/filings` | Searchable Cloud-stored demo Form FC records with dates and officer accountability |
| Investor Brief | `/investors` | Thesis, commercial model, competitive matrix, roadmap, team video |
| Architecture | `/architecture` | Feasibility evidence, user flows, service boundaries, presentation catalogue |
| Why CorpVidesh AI | `/why` | 26-year sector-wise RBI/DEA outflow data with ₹/US$ toggle and CSV download |
| Engineering blog | `/blog/how-corpvidesh-ai-is-built` | Ten-chapter architecture article with diagrams and code |
| Security | `/security` | Swiss-grade assurance overview, 3D breach simulation, control mappings |
| Contact / Demo | `/contact`, `/book-demo` | Validated, RLS-locked booking and message intake with unique references |

## 4. System architecture

```text
┌────────────────────────────────────────────────────────────────────┐
│                         BROWSER (React 19)                         │
│  TanStack Router routes · TanStack Query · Swiss design system     │
│  Session-scoped treasury scenario · hydrated ledger/capture state  │
└──────────────┬─────────────────────────────────┬───────────────────┘
               │ createServerFn (typed RPC)       │ /api/public/*
               ▼                                 ▼
┌──────────────────────────────┐  ┌──────────────────────────────────┐
│      SERVER FUNCTIONS        │  │        PUBLIC API ROUTES          │
│  requireSupabaseAuth         │  │  /api/public/fx · /markets        │
│  middleware → context.user   │  │  /metals · /rbi · /jobs/*         │
│  zod inputValidator on every │  │  caller verified inside handler   │
│  handler; admin client is    │  │  no-store, payload-free logging   │
│  imported inside the handler │  │                                   │
└──────────────┬───────────────┘  └───────────────┬──────────────────┘
               ▼                                  ▼
┌──────────────────────────────┐  ┌──────────────────────────────────┐
│   PURE POLICY MODULES        │  │   EXTERNAL EVIDENCE SOURCES      │
│  (no I/O, fully testable)    │  │  ECB reference rates · public    │
│  route determination · Rule7 │  │  market snapshots · RBI ODI      │
│  treaty withholding · legal  │  │  releases (daily managed sync)   │
│  triage · clearance gating   │  │                                  │
└──────────────┬───────────────┘  └───────────────┬──────────────────┘
               ▼                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                     LOVABLE CLOUD (Postgres)                       │
│  RLS on every table · public.user_roles · append-only ledgers      │
│  hash-chain triggers · atomic case-creation functions · storage    │
└────────────────────────────────────────────────────────────────────┘
               ▲
│  AI AGENT LAYER — LangGraph statutory graph, copilot, document     │
│  reader, currency outlook. Server-only execution, verified         │
│  identity, owner-scoped append-only outcomes, deterministic veto.  │
└────────────────────────────────────────────────────────────────────┘
```

**Design invariants**

- Four bounded service domains — **legal, filings, markets, agents** — with versioned contracts and pure policy modules; one integrated deployment, not independently hosted microservices.
- The deterministic rules engine decides; the model only drafts and cites.
- Every mutation is append-only and hash-chained; workflow order is enforced by database triggers, not UI state.
- Correlation IDs and payload-free duration/outcome logs on every backend operation; no-store responses.

## 5. Technology stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start v1 (React 19, SSR, server functions) on Vite 7 |
| Language | TypeScript (strict: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Styling | Tailwind CSS v4 via `src/styles.css` theme tokens; shadcn/ui + Radix primitives |
| Backend | Lovable Cloud (Postgres, RLS, auth, storage) via `@supabase/supabase-js` |
| AI | LangChain / LangGraph agent graph; Lovable AI Gateway (server-side keys only) |
| 3D | Three.js, dynamically imported in browser effects only |
| Validation | zod schemas shared between client forms and server handlers |
| Testing | Vitest — 28 suites, ~160 assertions over pure policy and workflow modules |
| CI | GitHub Actions: independent deterministic jobs per domain, then one integrated gate |
| Docs | `docx`/PDF generation for the presentation catalogue |

## 6. Project structure

```text
├── src/
│   ├── routes/                  # 45+ file routes (TanStack Router)
│   │   ├── api/public/          # fx, markets, metals, rbi, jobs/rbi-odi-sync
│   │   ├── console.tsx          # merged Treasury Console + corporate filings
│   │   ├── investors.tsx        # Investor Brief (thesis, model, team video)
│   │   └── …                    # access, agents, evidence, gift-portal, …
│   ├── components/
│   │   ├── site/                # Frame, scenario bar, charts, 3D scenes
│   │   └── ui/                  # shadcn/ui primitives
│   ├── lib/
│   │   ├── agents/              # LangGraph graph, RAG, memory, tools, execution
│   │   ├── *.functions.ts       # createServerFn entry points (validated)
│   │   ├── *.server.ts          # server-only implementations
│   │   └── *.ts                 # pure policy: routes, tax, legal triage, ledger
│   ├── data/                    # companies, hubs, currencies, treaties,
│   │                            # filed balance sheets, ODI sector history
│   ├── integrations/supabase/   # generated clients (browser + server)
│   ├── tests/                   # 28 Vitest suites
│   ├── start.ts                 # functionMiddleware attaches the bearer token
│   └── styles.css               # Tailwind v4 theme tokens (Swiss red/white)
├── drizzle/migrations/          # 13 migrations: schema, RLS, triggers, seeds
├── supabase/config.toml
├── .github/workflows/           # per-domain deterministic CI + integrated gate
└── public/docs/                 # served PDF editions
```

## 7. Getting started

**Prerequisites:** [Bun](https://bun.sh) v1.2+, a Lovable Cloud (Supabase-compatible) project.

```bash
# 1. Install
bun install

# 2. Configure environment
cp .env.example .env        # fill in the publishable keys (see below)

# 3. Apply the database schema
#    Run the 13 migrations in drizzle/migrations/ in filename order
#    against your Postgres instance (they create tables, RLS policies,
#    triggers, sequences and demo seed rows).

# 4. Develop
bun run dev                 # http://localhost:8080

# 5. Quality gates
bunx vitest run             # 28 suites, ~160 assertions
bun run lint
bun run build               # production build
```

## 8. Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | browser | Cloud project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | anon/publishable key (RLS-enforced) |
| `VITE_SUPABASE_PROJECT_ID` | browser | project reference |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | privileged writes; read inside handlers, never shipped to the browser |
| `LOVABLE_API_KEY` | server only | AI Gateway calls from `*.server.ts` modules |
| `DEMO_ALERT_TO` | server only | optional inbox for demo-booking alerts |

No private key ever appears in client code; the browser carries only the publishable key, and every table is protected by row-level security.

## 9. Database, security and access control

- **RLS on every table.** No policy means no access; anonymous reads are limited to narrow, explicitly public projections.
- **Roles in `public.user_roles`**, never in user-editable metadata. Server functions verify the caller through the authenticated client before any privileged import.
- **Append-only ledgers.** Form FC records, regulator actions, fund proposals and review events are insert-only; status derives from the event stream, and a per-case locked-hash trigger enforces workflow order.
- **Atomic case creation.** GIFT clearance cases and their first filing are created by a single role-checked database function — no partial filings, no concurrent duplicate reviews.
- **Showcase isolation.** Public demonstration desks are flagged in their portal role; restrictive policies keep showcase records separate from private filings.
- **Auth boundary.** Portal email/password sessions are isolated from AI identity resolution; a root subscriber clears protected query data on sign-out.

## 10. Server functions and public API

App-internal logic uses `createServerFn` with an auth middleware chain; external callers use file routes under `src/routes/api/public/*`, which bypass site auth and therefore verify the caller inside the handler.

| Endpoint | Purpose |
|---|---|
| `GET /api/public/fx` | 52-currency INR snapshot (ECB business-day references) |
| `GET /api/public/markets` | Global benchmark indices (labelled, possibly delayed) |
| `GET /api/public/metals` | London precious-metals indications |
| `GET /api/public/rbi` | Latest synced RBI ODI release |
| `POST /api/public/jobs/rbi-odi-sync` | Daily managed schedule storing RBI releases (bundled JSON fallback) |

## 11. AI agent layer

- **Statutory agent graph** (LangGraph): retrieval with provision-level citation, quality veto by the deterministic rules engine, bounded cross-agent context.
- **Copilot & document reader**: server-streamed answers; credit/payment failures surface accurate, safe messages.
- **Currency outlook agent**: provider FX snapshots → explicit conditional scenarios; synthetic history is never presented as evidence.
- **Read-only architecture tools** reuse the same server retrieval functions; official submission and ledger mutation stay denied until provisioned external integrations exist.
- Anonymous demonstrations are never persisted; local role selectors never authorize server data.

## 12. Testing and continuous integration

```bash
bunx vitest run        # 28 suites covering route determination, treaty
                       # withholding, ledger hashing, fund references,
                       # ODI history math, workflow ordering and more
```

CI (`.github/workflows/`) runs **independent deterministic jobs per service domain** — legal, filings, markets, agents — followed by a single integrated build gate. Service modularity never implies independently hosted microservices.

## 13. Key implementation excerpts

**Validated, auth-gated server function** (`src/lib/demo-booking.functions.ts`):

```ts
export const bookDemo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => demoBookingSchema().parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - DEMO_DUPLICATE_WINDOW_MS).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("demo_requests")
      .select("reference")
      .eq("work_email", data.workEmail)
      .gte("created_at", since)
      .maybeSingle();
    if (recent) return { reference: recent.reference, duplicate: true };
    // …insert validated row, return generated reference
  });
```

**Authenticated corporate filing read** (`src/lib/corporate-filings.functions.ts`):

```ts
export const readCorporateFilings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // context.supabase acts as the signed-in user; RLS scopes rows
    // to the caller's company memberships — never to a client-sent name.
  });
```

**Pure policy modules** (`src/lib/ledger-tax.ts`, route determination, legal triage) take plain inputs and return plain decisions — no I/O — which is why the rules engine can hold the veto and be exhaustively unit-tested.

## 14. Proof boundary — read this before evaluating

CorpVidesh AI is an **advanced prototype / proof of concept**:

- Regulator clearances, the six-lane review and the 3D clearance scene are **simulations of a proposed workflow**, not official approvals.
- Market and FX figures are **indicative** and may be delayed; synthetic interim moves are labelled.
- There is **no integration with RBI FIRMS, IFSCA or any official filing system**, and no certification, patent grant or production ZK assurance is claimed.
- Filed balance-sheet figures cover the top 50 companies from sourced FY2025–26 data; ranks 51–1,000 are illustrative and labelled as such.

## 15. Team Quantum Leap

Department of Law, Brainware University

| Member | Role | Student code | Contribution |
|---|---|---|---|
| Raja Mukherjee | Team Lead | BWU/BBL/25/002 | Concept and architecture |
| Priyanshu Dhar | Team Co-Lead | BWU/BBL/24/158 | Structure of the prototype |
| Aditi Kulkarni | Concept & Corporate Law Support | BWU/BBL/25/081 | Subject-matter expertise and uniqueness of CorpVidesh AI |

## 16. License and copyright

All Copyrights Protected @ Raja Mukherjee | Department of Law | Brainware University

This repository is shared for evaluation by investors, regulators and academic reviewers. No license is granted for production use, redistribution or derivative commercial deployment without written permission.
