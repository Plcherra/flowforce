# AI Predictive & NLP Roadmap

## Forecast Models

### Task ID: AI-F01 — Historical Metrics Pipeline
- Objective: Materialize reliable training datasets for staffing, task, revenue, and goal metrics to replace heuristic inputs.
- Scope: Extend Supabase cron jobs/functions to aggregate schedule coverage, backlog velocity, overtime cost, and revenue KPIs into a `ai_historical_metrics` table; align with data usage in `src/lib/ai/scenarioEngine.ts` and `supabase/functions/ai-scheduling-assistant/index.ts`.
- Deliverables: Daily ETL job scripts, schema migration for the metrics table plus indexes, data validation dashboard, and documentation on ingestion cadence.
- Dependencies: Confirm availability of raw tables (`schedules`, `tasks`, `expenses`, `goal_progress`); coordinate with analytics team for retention policy.

### Task ID: AI-F02 — Predictive Service Layer
- Objective: Provide multi-horizon forecasts for coverage, backlog, and revenue that feed Co-Pilot actions.
- Scope: Implement a dedicated Supabase Edge Function (or Vercel serverless function) that loads the historical metrics, trains incremental models (e.g., Prophet/ARIMA via Python runtime or TensorFlow.js) and exposes `/forecast` endpoints; cache outputs per company + metric to reduce cold starts.
- Deliverables: Service code with automated retraining workflow, model artifact storage strategy, forecast accuracy monitoring, and integration tests exercising sample payloads.
- Dependencies: Completion of AI-F01, secured secrets for ML runtime (e.g., managed inference service), and ops approval for scheduled retraining budget.

### Task ID: AI-F03 — Scenario Engine Integration
- Objective: Replace `calculateScenarioOutcome` heuristic deltas with real forecasts and expose confidence scoring to the UI.
- Scope: Update `src/lib/ai/scenarioEngine.ts` to request forecast baselines from the new `/forecast` endpoint, compute residuals, and store confidence bands; update `src/components/ai/ScenarioSimulator.tsx` and `useScenarioSimulator` hook to display model provenance, prediction intervals, and comparison against historical averages.
- Deliverables: Refactored scenario engine with feature flags for phased rollout, UI adjustments for interval visualization, regression & snapshot tests, and migration guide for future guardrails.
- Dependencies: AI-F02 completion and signed-off API contract for forecast responses.

## Anomaly Detection

### Task ID: AI-A01 — KPI Library & Threshold Blueprint
- Objective: Define anomaly rules for scheduling coverage, labor cost, expense spikes, and task backlog deviations.
- Scope: Map each KPI to time granularity, baseline calculation, and alert thresholds tied to company segments; capture metadata for surfaced insights in `AIActionsFeed` and `ClosedLoopSummary`.
- Deliverables: Specification document, JSON/YAML threshold config, and alignment review with operations stakeholders.
- Dependencies: coordination with domain experts, access to historical KPI variance from AI-F01.

### Task ID: AI-A02 — Detection Engine & Storage
- Objective: Continuously flag anomalies and persist them for downstream automation.
- Scope: Implement a streaming detector (Supabase Edge Function or background worker) that computes z-score/seasonality adjusted anomalies, writes results to `ai_anomaly_events`, and triggers webhooks or tasks through existing Supabase RPC pathways used by `triggerCopilot` in `useScenarioSimulator`.
- Deliverables: Detection code, schema migration, alert dispatch integration, automated tests covering synthetic spikes, and monitoring dashboards.
- Dependencies: AI-A01 approval, coordination with platform team for background execution guarantees.

### Task ID: AI-A03 — UX Surfacing & Guardrails
- Objective: Deliver end-user visibility and remediation workflows for anomalies.
- Scope: Extend `src/components/ai/AIActionsFeed.tsx`, `AIInsightsPanel.tsx`, and guardrail services to display anomaly badges, recommended mitigations, and allow one-click task creation; update closed-loop metrics to capture acknowledgement and resolution SLAs.
- Deliverables: UI components, API wiring, analytics instrumentation, and acceptance tests mirroring critical anomaly scenarios.
- Dependencies: AI-A02 data availability, design mocks, feature flag strategy.

## Natural Language Analytics Endpoints

### Task ID: AI-N01 — `ai-insights` Refactor with Structured Outputs
- Objective: Enhance `supabase/functions/ai-insights/index.ts` to support deterministic, schema-validated responses for dashboard, scheduler, and expense queries.
- Scope: Introduce typed prompt templates, guardrail schemas (JSON Schema or Zod), and enriched context loaders that combine aggregated metrics with user prompts; capture latency metrics and fallback messaging.
- Deliverables: Refactored function code, schema definitions, contract tests, and observability hooks (structured logs, tracing).
- Dependencies: Updated metrics from AI-F01, buy-in from security for prompt/response logging.

### Task ID: AI-N02 — Semantic Retrieval Layer
- Objective: Add retrieval-augmented context so NL queries can reference documentation, SOPs, and historical insights.
- Scope: Provision a pgvector-backed `ai_content_embeddings` table, build indexing jobs for docs stored in Supabase storage, and wrap the `ai-insights` function with an embeddings lookup prior to OpenAI calls; expose configuration for context limits per request.
- Deliverables: Migration scripts, indexing utilities, retrieval service wrapper, and evaluation reports showing answer quality improvements.
- Dependencies: Supabase pgvector extension enabled, content inventory from docs team, embedding model access.

### Task ID: AI-N03 — Public Analytics API & SDK
- Objective: Expose NL analytics endpoints for first-party apps and partners with consistent authentication.
- Scope: Create a versioned `/v1/ai/analytics` REST contract returning structured insights, convenience TypeScript client for consuming apps (including `AIChatAssistant.tsx`), rate limiting, and audit logging.
- Deliverables: API gateway configuration, typed SDK package, usage examples, and integration tests verifying auth guards and quota handling.
- Dependencies: AI-N01 refactor, platform sign-off on API surface, and security review.

