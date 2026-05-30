export type MonitoringSignalKind =
  | "uptime"
  | "application_errors"
  | "server_metrics"
  | "deploy_health"
  | "supabase_health";

export interface MonitoringSignal {
  kind: MonitoringSignalKind;
  owner: "vps" | "app" | "supabase" | "external_monitor";
  source: string;
  alertTarget: string;
  evidence: string;
}

export const productionMonitoringLoggingPolicy = {
  uptimeUrlPattern: "https://${FLOWFORCE_DOMAIN}/healthz",
  appHealthEndpoint: "/api/health",
  remoteLogEndpoint: "/api/logs",
  logStore: "public.system_logs",
  accessLogPath: "/var/log/caddy/flowforce-access.log",
  alertTestScript: "infrastructure/scripts/test-monitoring-alert.sh",
  metricsSnapshotScript: "infrastructure/scripts/collect-server-metrics.sh",
  metricsSnapshotDir: "/opt/flowforce/monitoring/server-metrics",
  supabaseVisibility:
    "Supabase dashboard health, auth, database, and API status are checked during deploy and incident review.",
  alertChannelEnv: "MONITORING_ALERT_WEBHOOK_URL",
  signals: [
    {
      kind: "uptime",
      owner: "external_monitor",
      source: "MONITORING_UPTIME_URL",
      alertTarget: "MONITORING_ALERT_WEBHOOK_URL",
      evidence: "External monitor check against /healthz.",
    },
    {
      kind: "application_errors",
      owner: "app",
      source: "/api/logs and server logger",
      alertTarget: "system_logs warning/error query or external error tracker",
      evidence: "Remote client and server errors persist to public.system_logs.",
    },
    {
      kind: "server_metrics",
      owner: "vps",
      source: "collect-server-metrics.sh",
      alertTarget: "MONITORING_ALERT_WEBHOOK_URL",
      evidence: "Disk, memory, container, and health snapshots.",
    },
    {
      kind: "deploy_health",
      owner: "vps",
      source: "deploy.sh / rollback.sh health checks",
      alertTarget: "ops runbook",
      evidence: "Deployment scripts verify /healthz after changes.",
    },
    {
      kind: "supabase_health",
      owner: "supabase",
      source: "Supabase dashboard and project API health",
      alertTarget: "Supabase project notifications",
      evidence: "Provider health and database/API incident visibility.",
    },
  ] satisfies MonitoringSignal[],
} as const;

export function buildProductionMonitoringLoggingReadiness() {
  const signalKinds = new Set(
    productionMonitoringLoggingPolicy.signals.map((signal) => signal.kind),
  );

  return {
    hasUptimeChecks: signalKinds.has("uptime"),
    hasAppErrorTracking:
      signalKinds.has("application_errors") &&
      productionMonitoringLoggingPolicy.remoteLogEndpoint === "/api/logs" &&
      productionMonitoringLoggingPolicy.logStore === "public.system_logs",
    hasServerMetrics:
      signalKinds.has("server_metrics") &&
      productionMonitoringLoggingPolicy.metricsSnapshotScript.endsWith(
        "collect-server-metrics.sh",
      ),
    hasDeployHealthVisibility: signalKinds.has("deploy_health"),
    hasSupabaseHealthVisibility: signalKinds.has("supabase_health"),
    hasAlertTestScript:
      productionMonitoringLoggingPolicy.alertTestScript.endsWith(
        "test-monitoring-alert.sh",
      ) &&
      productionMonitoringLoggingPolicy.alertChannelEnv ===
        "MONITORING_ALERT_WEBHOOK_URL",
    hasProxyAccessLogs:
      productionMonitoringLoggingPolicy.accessLogPath ===
      "/var/log/caddy/flowforce-access.log",
  };
}

export function isProductionMonitoringLoggingReady() {
  return Object.values(buildProductionMonitoringLoggingReadiness()).every(Boolean);
}
