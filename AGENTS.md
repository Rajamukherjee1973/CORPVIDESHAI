<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The Prediction currency agent retrieves provider FX snapshots server-side, returns explicit conditional scenarios and never treats synthetic history or hub coverage as investment evidence or legal OPI eligibility.
- RBI ODI radar data auto-loads via a daily managed schedule calling /api/public/jobs/rbi-odi-sync, which stores releases in rbi_odi_releases; the bundled JSON stays as fallback because RBI bot-checks direct spreadsheet downloads.
- Form FC portal records use authenticated server functions and append-only Cloud storage with transfer snapshots; server-managed regulator roles grant shared reads, while demo accounts read only their own records. Device desk selectors never authorize portal access. Existing local corporate application simulations remain separate.
- Corporate filing access uses service-managed company memberships enforced in server functions and RLS; corporate self-submission never trusts local desk identity or a selected company name.
- Treasury observed FX history uses a public server function backed by business-day ECB reference observations; unsupported currencies fail visibly rather than substituting synthetic historical evidence.
- Regulator portal email/password sessions are isolated from the existing Lovable-identity AI boundary; a root auth subscriber updates portal UI and clears protected query data on sign-out without changing AI identity resolution.
- All four AI entry points use the server-only execution boundary for verified identity, owner-scoped append-only outcomes and bounded cross-agent context; anonymous demonstrations are not persisted and local role selectors never authorize server data.
- Read-only architecture tools reuse server FX, market and statutory retrieval functions; official submission and ledger mutation remain denied until provisioned external integrations exist.
- Backend domains use versioned contracts, pure policy modules and server-only implementations behind validated server functions; independent deterministic CI jobs precede a single integrated deployment, so service modularity never implies independently hosted microservices.
- Corporate and regulator Form FC entrypoints share one server snapshot/append implementation while retaining their existing account, company and RLS boundaries; avoids divergent persistence and misleading source snapshots.
- Backend operations emit request-local correlation IDs and payload-free duration/outcome logs with no-store responses; agent work and audit-write failures remain distinct and neither model calls nor mutations automatically replay.
- Legal route assessment is public non-persisted conservative triage with cited findings and trace IDs; permission, current-law consolidation, INR settlement eligibility and actual regulator approval require independently verified evidence.
- The investor brief keeps thesis, model, evidence and team in tabs on one public route, linking to working desks; reduces scrolling.
- Architecture feasibility separates measured tests, browser checks and blocked production criteria; resource planning is an editable estimate, not an approved budget.
- The PoC lab executes shared pure safeguard policies locally and validates separately dated regression reports; it never promotes local checks into hosted AI, account-isolation or production certification evidence.
- Filed balance-sheet figures live in one sourced, dated data module that overrides sample net worth by company name; unmatched companies stay labelled illustrative so real and sample data never blur.
- GIFT portal opens a case and its first filing atomically via a role-checked DB function; a per-case locked hash trigger enforces workflow order, preventing partial filings and duplicate reviews. Records are demo entries, never RBI FIRMS/IFSCA filings.
- Fund proposals use owner-scoped append-only Cloud records and trusted fund assignments; existing GIFT reviewers act through a separate fund surface with atomic initial filing and database-enforced workflow/hash chaining, so direct writes cannot bypass review order or investor isolation.
- Shared presentation navigation connects public desks and secure portal entry points without carrying private case data or granting roles; legacy local desk simulations remain separate from account access.
- Console headroom and disclosure selection share treasury focus; normalized company matching is display-only, while exact trusted memberships remain the filing authorization boundary.
- Public functional desks share a session-scoped treasury scenario for destination, investment purpose and amount; Console and evidence consume it for demonstration calculations, never for authorization, official regulatory responses or automatic private filing writes.
- Console clearance demonstrations derive document gating and route referrals from pure workflow policy using the conservative legal triage; local SHA-256 chains verify browser record integrity only and never represent blockchain consensus, approval or remittance.
- Clearance proof packets bind scenario, rationale, activity, NOC facts and documents; any relevant edit resets checklist and proof.
- First-page global benchmarks poll public server-retrieved observations without synthetic ticks; source timestamps and unknown delays remain visible, and prior-session percentage comparisons never imply investment eligibility.
- Architecture, deck and download surfaces read one dated presentation catalogue; register immutable versioned PDFs there and archive replaced editions, preventing stale cards.
- Browser-persisted ledger/capture data loads after hydration; the corridor ledger reads the shared scenario; stale account lookups never override newer auth transitions.
- Corridor tax pricing uses a pure country/income policy with explicit taxable components and conditional treaty entitlement; investment principal has no generic hub withholding and unknown income tax prevents a complete all-in quote.
- Fund proposal references are generated by a database sequence trigger, never client input; status derives from append-only review events and references do not grant access.
- Public GIFT showcase credentials belong only to newly provisioned public_demo desks; restrictive RLS separates their cases from private desks and denies fund/Form FC access, while the existing workflow still validates every review.
- Public regulator-portal showcase desks are flagged in their portal role; restrictive RLS keeps showcase Form FC records and append-only regulator actions separate from private filings.
- The site-wide copyright notice lives once in the shared Frame footer (padded above the fixed FX strip) so every page carries it without per-route copies.
- /agents is the one agent desk: each agent/tool is a ?agent= tab; impact counts only real session runs.
- Demo bookings: validated public server fn writes to an RLS-locked table; no client read path.
- Why-page ODI chart reads one sourced module; years without official sector data stay total-only.
- Extra hub groups join pickers via `hub-catalog` (`findHub`); `HUBS` stays the fixed 52.
- Hub comparisons: pure `lib/hub-compare` runs `forecastAll` per hub with one case input and measured vol (`fx-risk`, labelled fallback); keeps hubs like-for-like.
- All menus, page search and footer read `nav-data.ts`; keeps every page reachable.
- /source reads GitHub via a server fn returning commit metadata only.
- AI agent architecture rules live in src/lib/agents/AGENTS.md.
- Currency-risk dashboard/hedge desk: pure `lib/fx-swings` on measured weekly series + feed anchor print (no micro-walk ticks); hedge book is session-only browser state; forwards are covered-parity prices from BIS policy rates (labelled peg proxies, fallback assumption when unpriced), never bank quotes.
- /security: tabbed (?view=); Three.js loads only in a browser effect; live checks are read-only signed-out probes reporting gaps as found; STRIDE rows say Enforced/Simulated/Not built, never certified.
