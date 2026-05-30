import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";

const root = process.cwd();
const jiti = createJiti(import.meta.url);

const readText = (relativePath) => {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(absolutePath, "utf8");
};

const requireIncludes = (text, needles, label) => {
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    throw new Error(`${label} missing required terms: ${missing.join(", ")}`);
  }
};

const requireExecutable = (relativePath) => {
  const mode = statSync(join(root, relativePath)).mode;
  if ((mode & 0o111) === 0) {
    throw new Error(`${relativePath} must be executable`);
  }
};

const alertScript = readText("infrastructure/scripts/test-monitoring-alert.sh");
const metricsScript = readText(
  "infrastructure/scripts/collect-server-metrics.sh",
);
const envTemplate = readText("infrastructure/.env.production.example");
const caddyfile = readText("infrastructure/caddy/Caddyfile");
const logRoute = readText("app/api/logs/route.ts");
const service = readText(
  "src/services/infrastructure/productionMonitoringLogging.ts",
);
const doc = readText("docs/production-monitoring-logging.md");
const plan = readText("docs/roadmap/10-production-infrastructure-and-launch.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/10-06-monitoring-logging-2026-05-30.md",
);
const packageJson = readText("package.json");

for (const file of [
  "infrastructure/scripts/test-monitoring-alert.sh",
  "infrastructure/scripts/collect-server-metrics.sh",
]) {
  requireExecutable(file);
}

requireIncludes(
  alertScript,
  [
    "#!/usr/bin/env bash",
    "FLOWFORCE_DRY_RUN",
    "MONITORING_ALERT_WEBHOOK_URL",
    "MONITORING_ALERT_CHANNEL",
    "MONITORING_UPTIME_URL",
    "curl --fail --silent --show-error",
    "FlowForce monitoring alert test",
  ],
  "monitoring alert script",
);

requireIncludes(
  metricsScript,
  [
    "#!/usr/bin/env bash",
    "FLOWFORCE_DRY_RUN",
    "MONITORING_METRICS_DIR",
    "MONITORING_UPTIME_URL",
    "docker compose",
    "docker stats --no-stream",
    "df -h /",
    "healthStatus",
  ],
  "server metrics script",
);

requireIncludes(
  envTemplate,
  [
    "MONITORING_UPTIME_URL=https://example.com/healthz",
    "MONITORING_ALERT_WEBHOOK_URL=",
    "MONITORING_ALERT_CHANNEL=ops",
    "MONITORING_METRICS_DIR=/opt/flowforce/monitoring/server-metrics",
  ],
  "production env template",
);

requireIncludes(
  caddyfile,
  ["/healthz", "/api/health", "/var/log/caddy/flowforce-access.log"],
  "Caddyfile",
);

requireIncludes(
  logRoute,
  [
    'from "../_server/supabaseAdmin"',
    "LOG_INGEST_TOKEN",
    "MAX_LOG_BYTES",
    "system_logs",
    "persisted: true",
    "persisted: false",
  ],
  "remote log route",
);

requireIncludes(
  service,
  [
    "productionMonitoringLoggingPolicy",
    "application_errors",
    "server_metrics",
    "deploy_health",
    "supabase_health",
    "MONITORING_ALERT_WEBHOOK_URL",
    "buildProductionMonitoringLoggingReadiness",
    "isProductionMonitoringLoggingReady",
  ],
  "production monitoring service",
);

requireIncludes(
  doc,
  [
    "Production Monitoring And Logging",
    "Uptime Checks",
    "App Error Tracking",
    "Server Metrics",
    "Alert Test",
    "public.system_logs",
    "MONITORING_ALERT_WEBHOOK_URL",
    "Timestamp: 2026-05-30",
  ],
  "production monitoring doc",
);

requireIncludes(
  plan,
  [
    "- [x] Add uptime checks.",
    "- [x] Add app error tracking.",
    "- [x] Add server metrics.",
    "- [x] Add deploy and Supabase health visibility.",
    "10.06 Monitoring And Logging",
    "production-monitoring-logging.md",
  ],
  "Plan 10 roadmap",
);

const phaseSixBlock = plan.match(
  /### Phase 6: Monitoring And Logging[\s\S]*?(?=### Phase 7: Performance And Load Baseline)/,
)?.[0];

if (!phaseSixBlock || phaseSixBlock.includes("- [ ]")) {
  throw new Error("Plan 10 phase 6 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [10 Production Infrastructure And Launch]",
    "Current phase: Phase 10, Production Infrastructure And Launch",
    "Last completed phase: 10.08, CI/CD Release Gates",
    "Last phase report: [10.08 CI/CD Release Gates]",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "production monitoring policy contract",
    "test-monitoring-alert.sh",
    "collect-server-metrics.sh",
    "`/api/logs`",
    "Phase 10.07",
  ],
  "Plan 10 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:monitoring-logging",
    "scripts/check-monitoring-logging-contract.mjs",
  ],
  "package scripts",
);

const runtime = await jiti.import(
  join(root, "src/services/infrastructure/productionMonitoringLogging.ts"),
);

if (!runtime.isProductionMonitoringLoggingReady()) {
  throw new Error("Production monitoring logging readiness check failed");
}

const readiness = runtime.buildProductionMonitoringLoggingReadiness();

if (
  !readiness.hasUptimeChecks ||
  !readiness.hasAppErrorTracking ||
  !readiness.hasServerMetrics ||
  !readiness.hasDeployHealthVisibility ||
  !readiness.hasSupabaseHealthVisibility ||
  !readiness.hasAlertTestScript ||
  !readiness.hasProxyAccessLogs
) {
  throw new Error("Production monitoring logging readiness flags are incomplete");
}

console.log("OK production monitoring logging contract");
