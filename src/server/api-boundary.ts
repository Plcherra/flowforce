export type ApiBoundaryKind =
  | "browser_supabase" // pragma: allowlist secret
  | "next_route"
  | "supabase_rpc" // pragma: allowlist secret
  | "supabase_edge_function" // pragma: allowlist secret
  | "future_service";

export type ApiSecurityLevel =
  | "public"
  | "authenticated"
  | "tenant_scoped"
  | "server_only"
  | "cron_only"
  | "internal_only";

export type ApiMutationPolicy =
  | "read_only"
  | "rls_write"
  | "server_verified_write"
  | "idempotent_server_write"
  | "audited_service_role_write";

export interface ApiBoundaryDefinition {
  name: string;
  kind: ApiBoundaryKind;
  security: ApiSecurityLevel;
  mutationPolicy: ApiMutationPolicy;
  owner: string;
  notes?: string;
}

export const apiBoundaryDefinitions: ApiBoundaryDefinition[] = [
  {
    name: "Feature repositories",
    kind: "browser_supabase", // pragma: allowlist secret
    security: "tenant_scoped",
    mutationPolicy: "rls_write",
    owner: "src/features/*/repositories",
    notes:
      "Use for tenant-scoped reads and low-risk writes that are fully protected by RLS.",
  },
  {
    name: "Onboarding complete",
    kind: "next_route",
    security: "authenticated",
    mutationPolicy: "idempotent_server_write",
    owner: "app/api/onboarding/complete/route.ts",
    notes:
      "Derives the owner from the bearer session. Client userId and email are ignored unless they mismatch, which is rejected.",
  },
  {
    name: "Onboarding repair",
    kind: "next_route",
    security: "authenticated",
    mutationPolicy: "idempotent_server_write",
    owner: "app/api/onboarding/repair/route.ts",
  },
  {
    name: "Employee invite email",
    kind: "next_route",
    security: "authenticated",
    mutationPolicy: "audited_service_role_write",
    owner: "app/api/employees/invite/route.ts",
    notes:
      "Service-role invite email must stay behind server session verification and audit logging.",
  },
  {
    name: "Cron routes",
    kind: "next_route",
    security: "cron_only",
    mutationPolicy: "audited_service_role_write",
    owner: "app/api/cron/* and app/api/run-detectors",
  },
  {
    name: "Internal support tenant tooling",
    kind: "next_route",
    security: "internal_only",
    mutationPolicy: "audited_service_role_write",
    owner: "app/api/internal/support/tenant/route.ts",
    notes:
      "Requires SUPPORT_ADMIN_TOKEN, writes support_tool_runs, and blocks impersonation for v1.",
  },
  {
    name: "Company setup and invite RPCs",
    kind: "supabase_rpc", // pragma: allowlist secret
    security: "tenant_scoped",
    mutationPolicy: "idempotent_server_write",
    owner: "supabase/migrations/*", // pragma: allowlist secret
  },
  {
    name: "AI and copilot edge functions",
    kind: "supabase_edge_function", // pragma: allowlist secret
    security: "authenticated",
    mutationPolicy: "audited_service_role_write",
    owner: "supabase/functions/*", // pragma: allowlist secret
    notes:
      "Must validate bearer sessions, tenant scope, CORS, idempotency, and audit/event logging before production enablement.",
  },
  {
    name: "Future integrations service",
    kind: "future_service",
    security: "server_only",
    mutationPolicy: "idempotent_server_write",
    owner: "future",
    notes:
      "Use only after provider sync, queueing, retries, and observability exceed Next route/edge function needs.",
  },
];

export const serviceRoleWriteRules = [
  "Verify caller identity or cron secret before using service role.",
  "Resolve tenant scope server-side; never trust companyId from the browser alone.",
  "Use idempotency keys or deterministic conflict targets for retries.",
  "Write an audit_log row or domain event for sensitive mutations.",
  "Return sanitized errors without service-role details or secrets.",
] as const;

export const idempotentMutationRules = [
  "Accept or derive a stable idempotency key for retryable writes.",
  "Use upsert/onConflict, status transitions, or lock checks for queues.",
  "Make repeated requests return the existing resource or final state where possible.",
  "Record requestId/dedupeKey in metadata for later support and audit review.",
] as const;
