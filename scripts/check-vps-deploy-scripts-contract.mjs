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

const setup = readText("infrastructure/scripts/setup-vps.sh");
const deploy = readText("infrastructure/scripts/deploy.sh");
const rollback = readText("infrastructure/scripts/rollback.sh");
const envTemplate = readText("infrastructure/.env.production.example");
const service = readText("src/services/infrastructure/vpsDeployScripts.ts");
const doc = readText("docs/production-vps-deploy.md");
const plan = readText("docs/roadmap/10-production-infrastructure-and-launch.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/10-04-vps-deploy-scripts-2026-05-30.md",
);
const packageJson = readText("package.json");

for (const file of [
  "infrastructure/scripts/setup-vps.sh",
  "infrastructure/scripts/deploy.sh",
  "infrastructure/scripts/rollback.sh",
]) {
  requireExecutable(file);
}

requireIncludes(
  setup,
  [
    "#!/usr/bin/env bash",
    "FLOWFORCE_DRY_RUN",
    "install_docker",
    "docker-compose-plugin",
    "prepare_user_and_dirs",
    "/opt/flowforce/current",
    "ufw allow 443/tcp",
    ".env.production.example",
    "infrastructure/.env.production",
  ],
  "setup script",
);

requireIncludes(
  deploy,
  [
    "#!/usr/bin/env bash",
    "FLOWFORCE_DRY_RUN",
    "compose_cmd",
    "validate_env",
    "validate_caddy",
    "flowforce-web",
    "rollback",
    "docker tag",
    "up -d --remove-orphans",
    "https://${FLOWFORCE_DOMAIN}/healthz",
  ],
  "deploy script",
);

requireIncludes(
  rollback,
  [
    "#!/usr/bin/env bash",
    "FLOWFORCE_DRY_RUN",
    "compose_cmd",
    "flowforce-web",
    "rollback",
    "docker tag",
    "up -d --no-build --remove-orphans",
    "https://${FLOWFORCE_DOMAIN}/healthz",
  ],
  "rollback script",
);

requireIncludes(
  envTemplate,
  [
    "FLOWFORCE_DOMAIN=example.com",
    "ACME_EMAIL=ops@example.com",
    "NEXT_PUBLIC_SUPABASE_URL=",
    "SUPABASE_SERVICE_ROLE_KEY=",
    "SUPPORT_ADMIN_TOKEN=",
  ],
  "production env template",
);

requireIncludes(
  service,
  [
    "vpsDeployScripts",
    "setup-vps.sh",
    "deploy.sh",
    "rollback.sh",
    "FLOWFORCE_DOMAIN",
    "flowforce-web:rollback",
    "buildVpsDeployReadiness",
    "isVpsDeployReady",
  ],
  "VPS deploy service",
);

requireIncludes(
  doc,
  [
    "Production VPS Deploy Scripts",
    "sudo FLOWFORCE_APP_DIR=/opt/flowforce/current",
    "FLOWFORCE_DRY_RUN=1",
    "The deploy script rejects missing values",
    "tags the current `flowforce-web:latest` image as `flowforce-web:rollback`",
    "The script supports both `docker compose` and legacy `docker-compose`.",
    "Phase 10.05",
  ],
  "VPS deploy doc",
);

requireIncludes(
  plan,
  [
    "- [x] Add setup script.",
    "- [x] Add deploy script.",
    "- [x] Add rollback script.",
    "- [x] Add env file template.",
    "10.04 VPS Deploy Scripts",
    "production-vps-deploy.md",
  ],
  "Plan 10 roadmap",
);

const phaseFourBlock = plan.match(
  /### Phase 4: VPS Deploy Scripts[\s\S]*?(?=### Phase 5: Database Backup And Restore)/,
)?.[0];

if (!phaseFourBlock || phaseFourBlock.includes("- [ ]")) {
  throw new Error("Plan 10 phase 4 still has unchecked tasks");
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
    "Added a VPS setup script",
    "Added a deploy script",
    "Added a rollback script",
    "dry-run support",
    "Phase 10.05",
  ],
  "Plan 10 phase report",
);

requireIncludes(
  packageJson,
  ["check:vps-deploy-scripts", "scripts/check-vps-deploy-scripts-contract.mjs"],
  "package scripts",
);

const runtime = await jiti.import(
  join(root, "src/services/infrastructure/vpsDeployScripts.ts"),
);

if (!runtime.isVpsDeployReady()) {
  throw new Error("VPS deploy script readiness check failed");
}

const readiness = runtime.buildVpsDeployReadiness();

if (
  !readiness.hasSetupScript ||
  !readiness.hasDeployScript ||
  !readiness.hasRollbackScript ||
  !readiness.hasEnvTemplate ||
  !readiness.hasDryRunSupport ||
  !readiness.hasHealthCheck
) {
  throw new Error("VPS deploy readiness flags are incomplete");
}

console.log("OK VPS deploy scripts contract");
