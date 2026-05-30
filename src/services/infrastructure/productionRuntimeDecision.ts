export type HostingTarget = "contabo_vps";
export type DatabaseTarget = "managed_supabase";
export type ReverseProxyTarget = "caddy_or_nginx";
export type CdnTarget = "cloudflare_optional";
export type BackupLayer =
  | "managed_supabase_point_in_time"
  | "pre_release_pg_dump"
  | "vps_volume_snapshot"
  | "encrypted_offsite_artifacts";

export type ProductionRuntimeDecision = {
  hostingTarget: HostingTarget;
  databaseTarget: DatabaseTarget;
  reverseProxyTarget: ReverseProxyTarget;
  cdnTarget: CdnTarget;
  appRuntime: string;
  processModel: string;
  domainStrategy: string;
  sslStrategy: string;
  backupLayers: BackupLayer[];
  deploymentAssumptions: string[];
  deferredDecisions: string[];
};

export type RuntimeDiagramNode = {
  id: string;
  label: string;
  responsibility: string;
};

export type RuntimeDiagramEdge = {
  from: string;
  to: string;
  label: string;
};

export const productionRuntimeDecision: ProductionRuntimeDecision = {
  hostingTarget: "contabo_vps",
  databaseTarget: "managed_supabase",
  reverseProxyTarget: "caddy_or_nginx",
  cdnTarget: "cloudflare_optional",
  appRuntime:
    "Next.js 16 production server running in a Docker container on a Contabo VPS.",
  processModel:
    "Docker Compose manages the web container and reverse proxy on the VPS.",
  domainStrategy:
    "Primary app domain points to the VPS public IP with DNS A/AAAA records; API routes stay inside the same Next.js app unless later separated.",
  sslStrategy:
    "TLS terminates at the reverse proxy with automatic certificate renewal; HTTP redirects to HTTPS.",
  backupLayers: [
    "managed_supabase_point_in_time",
    "pre_release_pg_dump",
    "vps_volume_snapshot",
    "encrypted_offsite_artifacts",
  ],
  deploymentAssumptions: [
    "Supabase remains managed for production database, auth, storage, and edge-function dependencies.",
    "The VPS runs only the FlowForce web runtime, reverse proxy, deployment artifacts, logs, and optional backup artifacts.",
    "GitHub release gates remain the source-control quality gate before deployment.",
    "Mobile apps point to the same deployed web URL for the Capacitor shell.",
  ],
  deferredDecisions: [
    "Final production domain name.",
    "Caddy versus Nginx reverse proxy implementation.",
    "Cloudflare DNS-only versus proxied CDN mode.",
    "Exact Contabo VPS size after Docker and load baseline phases.",
  ],
} as const;

export const runtimeDiagramNodes: RuntimeDiagramNode[] = [
  {
    id: "user",
    label: "Users and mobile shells",
    responsibility: "Access FlowForce through browser or Capacitor app.",
  },
  {
    id: "dns",
    label: "DNS/CDN",
    responsibility: "Routes the production domain to the Contabo VPS.",
  },
  {
    id: "proxy",
    label: "Reverse proxy",
    responsibility:
      "Terminates TLS, redirects HTTP, applies headers, and forwards app traffic.",
  },
  {
    id: "web",
    label: "Next.js container",
    responsibility: "Serves web UI and Next.js API routes.",
  },
  {
    id: "supabase",
    label: "Managed Supabase",
    responsibility:
      "Provides Postgres, auth, storage, RLS, migrations, and managed backups.",
  },
  {
    id: "github",
    label: "GitHub Actions",
    responsibility:
      "Runs release gates, deploy readiness, and future Docker gates.",
  },
] as const;

export const runtimeDiagramEdges: RuntimeDiagramEdge[] = [
  { from: "user", to: "dns", label: "HTTPS app traffic" },
  { from: "dns", to: "proxy", label: "A/AAAA route to VPS" },
  { from: "proxy", to: "web", label: "local container network" },
  { from: "web", to: "supabase", label: "server/client Supabase APIs" },
  { from: "github", to: "web", label: "release artifact and deploy script" },
] as const;

export function buildProductionRuntimeReadiness() {
  return {
    hostingTargetConfirmed:
      productionRuntimeDecision.hostingTarget === "contabo_vps",
    managedSupabaseConfirmed:
      productionRuntimeDecision.databaseTarget === "managed_supabase",
    domainSslCdnBackupConfirmed:
      productionRuntimeDecision.domainStrategy.includes("VPS public IP") &&
      productionRuntimeDecision.sslStrategy.includes("automatic certificate") &&
      productionRuntimeDecision.cdnTarget === "cloudflare_optional" &&
      productionRuntimeDecision.backupLayers.length >= 4,
    runtimeDiagramReady:
      runtimeDiagramNodes.length >= 6 && runtimeDiagramEdges.length >= 5,
    vercelDependencyRemoved: !productionRuntimeDecision.processModel
      .toLowerCase()
      .includes("vercel"),
    readyForDockerBaseline: true,
  };
}

export function isProductionRuntimeDecisionReady() {
  const readiness = buildProductionRuntimeReadiness();

  return (
    readiness.hostingTargetConfirmed &&
    readiness.managedSupabaseConfirmed &&
    readiness.domainSslCdnBackupConfirmed &&
    readiness.runtimeDiagramReady &&
    readiness.vercelDependencyRemoved &&
    readiness.readyForDockerBaseline
  );
}
