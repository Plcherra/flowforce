export type PerformanceSignal =
  | "build_size"
  | "page_load"
  | "api_latency"
  | "database_hot_queries"
  | "pilot_load";

export interface PerformanceBudget {
  signal: PerformanceSignal;
  target: string;
  measurement: string;
}

export const productionPerformanceLoadBaseline = {
  baselineDate: "2026-05-30",
  scriptPath: "scripts/run-performance-load-baseline.mjs",
  reportPath: "docs/production-performance-load-baseline.md",
  jsonOutputPath: "docs/test-results/performance-load-baseline.json",
  defaultEndpoints: ["/api/health", "/", "/auth", "/app"],
  loadEndpoint: "/api/health",
  pilotLoad: {
    concurrentUsers: 50,
    burstRequestsPerMinute: 600,
    expectedPilotCompanies: 3,
    expectedPilotEmployeesPerCompany: 25,
  },
  budgets: [
    {
      signal: "build_size",
      target: ".next/static <= 25 MB and .next/server <= 150 MB",
      measurement: "run-performance-load-baseline build artifact scan",
    },
    {
      signal: "page_load",
      target: "critical page p95 <= 2.5 seconds on production VPS",
      measurement: "PERF_BASE_URL page probes",
    },
    {
      signal: "api_latency",
      target: "/api/health p95 <= 500 ms under pilot load",
      measurement: "concurrent load probe",
    },
    {
      signal: "database_hot_queries",
      target: "tenant-scoped hot paths use company_id/user_id/status/date indexes",
      measurement: "migration/index review plus Supabase query dashboard",
    },
    {
      signal: "pilot_load",
      target: "50 concurrent users and 600 burst requests/minute for first pilots",
      measurement: "load script against staging/VPS",
    },
  ] satisfies PerformanceBudget[],
  hotQueryFamilies: [
    "company_id-scoped list pages ordered by created_at or updated_at",
    "user_id-scoped task, notification, and scheduling lookups",
    "inventory item/unit/stock joins scoped by company_id",
    "workflow instance and evidence lookups scoped by company_id and status",
    "system_logs warning/error lookups ordered by created_at desc",
  ],
} as const;

export function buildProductionPerformanceReadiness() {
  const budgetSignals = new Set(
    productionPerformanceLoadBaseline.budgets.map((budget) => budget.signal),
  );

  return {
    hasBuildSizeBudget: budgetSignals.has("build_size"),
    hasPageLoadBudget: budgetSignals.has("page_load"),
    hasApiLatencyBudget: budgetSignals.has("api_latency"),
    hasDatabaseHotQueryReview: budgetSignals.has("database_hot_queries"),
    hasPilotLoadDefinition:
      budgetSignals.has("pilot_load") &&
      productionPerformanceLoadBaseline.pilotLoad.concurrentUsers >= 50,
    hasLoadTestScript:
      productionPerformanceLoadBaseline.scriptPath ===
      "scripts/run-performance-load-baseline.mjs",
    hasStoredReport:
      productionPerformanceLoadBaseline.reportPath ===
      "docs/production-performance-load-baseline.md",
  };
}

export function isProductionPerformanceLoadBaselineReady() {
  return Object.values(buildProductionPerformanceReadiness()).every(Boolean);
}
