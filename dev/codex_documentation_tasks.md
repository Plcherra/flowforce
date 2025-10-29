# Documentation Automation Workflow

## Objectives
- Centralise operational knowledge in an extensible Docs module that can publish technical and process handbooks.
- Enable AI-assisted search so teams can query the documentation corpus with natural language.
- Automate changelog creation to keep product and ops stakeholders updated without manual compilation.

## End-to-End Pipeline Overview
1. **Source Capture**
   - Markdown knowledge base inside `docs/` (engineering, operations, HR).
   - Structured updates from product boards, Git history, and incident postmortems.
2. **Transformation**
   - Pre-processing layer that normalises front matter, validates metadata, and lints Markdown.
   - Doc generator builds static HTML (SSR-friendly) and JSON knowledge bundles for AI indexing.
   - Changelog compiler groups commits/issues by release or sprint cadence.
3. **Distribution**
   - Internal Docs module surfaces the rendered site with role-aware navigation and inline feedback.
   - AI search indexes the JSON bundles and exposes a query API plus in-app assistant entry point.
   - Automated changelog posts publish to Slack, email digests, and the Docs module feed.

## Internal Docs Module
### Scope
- Deliver a responsive documentation hub reachable from the main application shell.
- Support role-based content segmentation (Operations, HR, Engineering, Leadership).
- Provide versioned pages with change history and feedback capture.

### Key Tasks
| ID | Task | Owner | Dependencies | Exit Criteria |
| --- | --- | --- | --- | --- |
| D01 | Audit current `docs/` tree and categorise pages by domain | Docs PM | None | Inventory spreadsheet with owners & last-updated dates |
| D02 | Define MDX/Markdown schema (front matter, tags, access level) | Docs PM + Eng | D01 | Schema published, lint rules updated |
| D03 | Scaffold Docs module route (`/docs`) with navigation + search shell | Frontend | D02 | Module loads statically, respects feature flag |
| D04 | Implement role-aware filter + access guard | Frontend | D03 | QA confirms visibility matrix |
| D05 | Add inline feedback form with Supabase storage + alerting | Frontend + Support | D03 | Feedback stored, Slack alerts piped to support channel |
| D06 | Automate doc deployment from CI (triggered on `docs/**` changes) | DevOps | D02 | Pipeline runs in <5 min, publishes preview + production |

### Supporting Tooling
- `remark`/`rehype` pipeline for linting and custom components.
- Supabase table for docs feedback with RLS keyed to company + role.
- Feature flags via existing configuration service to stage rollout.

## AI Search Integration
### Scope
- Deliver semantic search across docs with conversational follow-ups.
- Provide API endpoints that reuse the organisation’s access controls.

### Key Tasks
| ID | Task | Owner | Dependencies | Exit Criteria |
| --- | --- | --- | --- | --- |
| A01 | Define embeddings schema (chunk size, metadata tags, TTL) | AI Lead | D02 | Architecture RFC approved |
| A02 | Build indexing job (Node script) that emits embeddings per doc | AI Eng | A01, D02 | Job runs locally, outputs test index |
| A03 | Schedule indexing via CI nightly and on docs deploy | DevOps | A02 | Pipeline pushes fresh index to vector store |
| A04 | Implement `/api/search` endpoint with semantic + keyword fallback | Backend | A03 | Latency <500ms, returns ACL-compliant results |
| A05 | Integrate in-app assistant (command palette + Docs module search bar) | Frontend | A04, D03 | UX sign-off, analytics capture usage |
| A06 | Add evaluation harness (precision@k, deflection rate) | AI Lead | A05 | Baseline metrics captured, tracked per release |

### Supporting Tooling
- OpenAI or HuggingFace embeddings stored in Supabase pgvector (or Pinecone if scale demands).
- Redis or Supabase cache for hybrid keyword queries.
- Feature analytics funnel instrumented via existing telemetry service.

## Changelog Automation
### Scope
- Generate human-readable change summaries per release, sprint, and hotfix.
- Distribute updates automatically to Docs module, Slack channels, and email subscribers.

### Key Tasks
| ID | Task | Owner | Dependencies | Exit Criteria |
| --- | --- | --- | --- | --- |
| C01 | Define changelog taxonomy (feature, fix, security, ops) | Product Ops | None | Taxonomy doc approved |
| C02 | Build extractor script aggregating Git commits, PR labels, ticket metadata | Tooling Eng | C01 | CLI outputs structured JSON |
| C03 | Add GPT summarisation pass with guardrails + manual edit mode | AI Eng | C02 | Summaries <200 words each, flagged for review |
| C04 | Implement review workflow (Notion/Linear integration) | Product Ops | C03 | Reviewers notified, approvals logged |
| C05 | Publish changelog card in Docs module + RSS/Atom feed | Frontend + Backend | C04, D03 | Feed validates, card displays latest release |
| C06 | Automate Slack/email digests post-release using existing notification service | DevOps | C05 | Digest sent within 15 min of tag push |

### Supporting Tooling
- Conventional commit or PR label enforcement via CI check.
- `changesets` or custom CLI for version bump hooks.
- Notification service integration with release tagging workflow.

## Implementation Roadmap
| Phase | Timeline | Focus | Entry Criteria | Exit Criteria |
| --- | --- | --- | --- | --- |
| Phase 1 | Weeks 1-3 | Docs module foundation (D01-D04) | Stakeholder alignment, schema approved | Module feature flagged in staging with sample docs |
| Phase 2 | Weeks 4-6 | AI search MVP (A01-A05) | Stable docs ingestion pipeline | Assistant live in staging, evaluation harness running |
| Phase 3 | Weeks 7-8 | Changelog automation (C01-C05) | Docs module GA-ready | Automated changelog feed populates staging |
| Phase 4 | Weeks 9+ | Harden & rollout (D05-D06, A06, C06) | MVP goals met, telemetry baseline captured | Production rollout complete, SLAs documented |

## Quality Gates & Monitoring
- Automated Markdown lint, broken link check, and spellcheck in CI.
- Synthetic monitoring on `/docs` route and `/api/search` endpoint.
- Weekly AI search relevance review, monthly taxonomy audit for changelog tags.
- Feedback backlog triaged bi-weekly; unresolved items escalated to Docs PM.

## Risk & Mitigation Log
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Fragmented metadata across docs leads to bad search results | High | Enforce schema lint, create author checklist, schedule quarterly audits |
| AI search returns unauthorised content | Critical | Apply per-company ACL filters before query, add unit/integration tests with mixed tenant data |
| Changelog automation propagates incorrect summaries | Medium | Keep manual approval step, retain raw diff links, monitor error budget |
| Pipeline regressions slow deploys | Medium | Cache dependencies, run incremental builds, add canary deploy to staging first |

## Open Questions
- Should the docs module live within the existing app shell or ship as a standalone Next.js deployment?
- Preferred vector store for embeddings: in-house pgvector vs managed Pinecone?
- Is there an existing taxonomy authority for release categories or should Product Ops own it?
- Which teams must sign off on changelog automation (Legal, Support, Customer Success)?
