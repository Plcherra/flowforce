# Codex Financial Automation Tasks

## Module Evaluation

### Finance Module
- Data pipeline in `src/hooks/useFinancialManagement.ts` aggregates Supabase tables (`payments`, `expenses`, `inventory_transactions`, `time_entries`, `inv_waste`) over the trailing six months to drive the manager and employee dashboards.  
- Manager view (`src/components/financial/ManagerFinancialOverview.tsx`) surfaces payroll, vendor spend, reimbursement volume, inventory purchase/sales deltas, and profit/loss trends, but integrations are hard-coded placeholders and there is no automated reconciliation back to source systems.  
- Employee view (`src/components/financial/EmployeeFinancialOverview.tsx`) emphasises labor metrics and reimbursement status; financial insights rely entirely on manual data entry consistency (no anomaly detection or tagging).  
- Vendor invoices currently enter the finance dataset indirectly when logged as `payments` of type `vendor`; there is no pipeline for invoice image ingestion or automatic metadata extraction.  
- Expense categorisation leverages static `category` values returned from Supabase without machine-assistance, limiting insight quality and consistency.

### Purchasing Module
- The inventory purchasing workspace (`src/features/inventory/routes/Purchasing.tsx`) offers end-to-end PO management: order drafting, approval, receiving, history filters, supplier integration linking, and invoice logging through `InventoryService.recordVendorInvoice`.  
- Outstanding balances are derived in-memory by netting PO totals against logged vendor payments, leaving reconciliation accuracy dependent on manual data entry.  
- The top-level `Purchasing` page (`src/pages/Purchasing.tsx`) exposes UX placeholders (e.g., “Scanned Invoices”) that have no backing data flow, signalling the intended surface area for automation extensions.  
- `InventoryService` (`src/services/inventory.ts`) persists POs, receiving events, and vendor invoices directly to Supabase, but it lacks hooks for ingesting OCR outputs, mapping invoice line items to inventory SKUs, or tying deliveries to sales performance.  
- Supplier integration settings store metadata inside the supplier address JSON blob and do not yet orchestrate actual EDI/API syncs, so there is no upstream source-of-truth feeding purchasing data.

## Automation Workstreams

### 1. Invoice OCR Ingestion
- **Objective:** Enable ingestion of scanned/emailed invoices, auto-extract structured data, and sync it with purchase orders and vendor payment records.  
- **Key Tasks:**  
  - Provision Supabase storage buckets (or equivalent) and add an ingestion service (`scripts/tenant/finance-invoice-ingestion.ts`) that watches uploads, forwards PDFs/images to an OCR/extraction provider (e.g., InvokeMind, AWS Textract).  
  - Extend `InventoryService.recordVendorInvoice` (`src/services/inventory.ts:1458`) to accept structured OCR payloads (line items, totals, PO number) and to reconcile against existing `purchase_orders` by reference number or fuzzy supplier/date matching.  
  - Implement a new invoice inbox component in `src/features/inventory/routes/Purchasing.tsx` under the “Scanned Invoices” tab that lists pending OCR jobs, confidence scores, and required human validations.  
  - Persist extracted invoice line items to a dedicated table (e.g., `vendor_invoice_lines`) and expose them through a new hook (`src/hooks/inventory/useVendorInvoiceLines.tsx`) for UI consumption and analytics.  
  - Add audit logging so manual corrections to OCR data are traceable and push status updates via existing toast/notification patterns.  
  - Create Vitest coverage for the extraction pipeline shape validation and service-level tests for Supabase inserts.

### 2. Sales Reconciliation
- **Objective:** Reconcile POS sales, inventory movements, and vendor invoices to surface margin accuracy and detect anomalies.  
- **Key Tasks:**  
  - Expand `useManagerFinancialMetrics` (`src/hooks/useFinancialManagement.ts:520`) to ingest POS sales feeds (existing integration placeholder `toast`) and align them with `inventory_transactions` of type `sale`.  
  - Introduce a reconciliation engine (`src/services/financialReconciliation.ts`) that compares cost of goods sold against vendor invoices and receiving events, highlighting over/under variance per SKU and per supplier.  
  - Surface reconciliation KPIs and exception queues in `ManagerFinancialOverview` (`src/components/financial/ManagerFinancialOverview.tsx`) with drill-down modals linking to the relevant PO/invoice/sales records.  
  - Persist reconciliation snapshots to a new Supabase table (e.g., `sales_reconciliation_runs`) for historical trend analysis and to avoid recalculating large datasets on every load.  
  - Wire automated alerts (email/slack via existing notifications framework) when variance thresholds are exceeded or when sales data is missing for received inventory.  
  - Backfill tests covering reconciliation math, including fixtures for purchase orders, invoices, and sales entries.

### 3. AI Expense Tagging
- **Objective:** Automate expense categorisation and anomaly detection to improve reporting accuracy and speed.  
- **Key Tasks:**  
  - Add a classification service (`src/services/expenseClassification.ts`) that invokes an LLM or AutoML model, seeding it with vendor history, GL mappings, and merchant descriptors from `expenses` records.  
  - Extend `useFinancialManagement` (`src/hooks/useFinancialManagement.ts:36`) to request AI-generated tags and confidence scores whenever new expenses are fetched, caching results locally and writing them back to Supabase (`expenses.ai_category`, `ai_confidence`).  
  - Update `ManagerFinancialOverview` expense breakdown widgets to highlight AI-suggested categories, unresolved items, and confidence-driven review queues.  
  - Build reviewer workflows in `src/pages/Expenses.tsx` allowing managers to approve/override AI tags, with feedback loops persisted for model fine-tuning.  
  - Instrument telemetry to measure classification accuracy over time and feed aggregate metrics to the business analytics service (`src/services/analytics/businessAnalyticsService.ts`).  
  - Introduce unit tests for prompt/response parsing and integration tests to ensure overrides persist and reclassifications sync back to analytics.

## Cross-Module Considerations
- Align permission checks (`src/hooks/useCan.tsx`, `src/components/permissions/IfCan`) so automated ingestion surfaces respect existing inventory/finance scopes.  
- Ensure background workers or scheduled jobs (cron via Supabase Edge Functions or external workers) handle OCR processing and reconciliation without blocking UI rendering.  
- Document all new tables, storage buckets, and services in `/docs/architecture/finance.md` so future refactors understand the automation boundaries.

