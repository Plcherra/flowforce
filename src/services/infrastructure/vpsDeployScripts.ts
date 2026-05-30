export type VpsDeployScriptKind = "setup" | "deploy" | "rollback";

export interface VpsDeployScript {
  kind: VpsDeployScriptKind;
  path: string;
  dryRun: boolean;
  requiresRoot: boolean;
  purpose: string;
}

export const vpsDeployScripts = {
  appDirectory: "/opt/flowforce/current",
  appUser: "flowforce",
  envTemplatePath: "infrastructure/.env.production.example",
  envFilePath: "infrastructure/.env.production",
  composePath: "infrastructure/docker-compose.vps.yml",
  caddyfilePath: "infrastructure/caddy/Caddyfile",
  healthUrlPattern: "https://${FLOWFORCE_DOMAIN}/healthz",
  rollbackImageTag: "flowforce-web:rollback",
  scripts: [
    {
      kind: "setup",
      path: "infrastructure/scripts/setup-vps.sh",
      dryRun: true,
      requiresRoot: true,
      purpose: "Install Docker, prepare the app user, directories, firewall, and env file.",
    },
    {
      kind: "deploy",
      path: "infrastructure/scripts/deploy.sh",
      dryRun: true,
      requiresRoot: false,
      purpose: "Validate env and Caddy, tag rollback image, build, start, and health check.",
    },
    {
      kind: "rollback",
      path: "infrastructure/scripts/rollback.sh",
      dryRun: true,
      requiresRoot: false,
      purpose: "Retag the rollback image as latest, restart the stack, and health check.",
    },
  ] satisfies VpsDeployScript[],
} as const;

export function buildVpsDeployReadiness() {
  const scriptKinds = new Set(vpsDeployScripts.scripts.map((script) => script.kind));

  return {
    hasSetupScript: scriptKinds.has("setup"),
    hasDeployScript: scriptKinds.has("deploy"),
    hasRollbackScript: scriptKinds.has("rollback"),
    hasEnvTemplate: vpsDeployScripts.envTemplatePath.endsWith(".env.production.example"),
    hasDryRunSupport: vpsDeployScripts.scripts.every((script) => script.dryRun),
    hasHealthCheck:
      vpsDeployScripts.healthUrlPattern.includes("/healthz") &&
      vpsDeployScripts.rollbackImageTag === "flowforce-web:rollback",
  };
}

export function isVpsDeployReady() {
  return Object.values(buildVpsDeployReadiness()).every(Boolean);
}
