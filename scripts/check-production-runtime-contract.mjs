import { existsSync, readFileSync } from "node:fs";
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

const service = readText(
  "src/services/infrastructure/productionRuntimeDecision.ts",
);
const doc = readText("docs/production-runtime-decision.md");
const plan = readText(
  "docs/roadmap/10-production-infrastructure-and-launch.md",
);
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/10-01-production-runtime-decision-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "HostingTarget",
    '"contabo_vps"',
    '"managed_supabase"',
    '"caddy_or_nginx"',
    '"cloudflare_optional"',
    "productionRuntimeDecision",
    "runtimeDiagramNodes",
    "runtimeDiagramEdges",
    "buildProductionRuntimeReadiness",
    "isProductionRuntimeDecisionReady",
    "managed_supabase_point_in_time",
    "pre_release_pg_dump",
    "vps_volume_snapshot",
    "encrypted_offsite_artifacts",
  ],
  "production runtime service",
);

requireIncludes(
  doc,
  [
    "FlowForce production runtime is VPS-first.",
    "Hosting target: Contabo VPS.",
    "Database/auth/storage target: managed Supabase.",
    "This plan does not depend on Vercel.",
    "Caddy or Nginx reverse proxy",
    "Managed Supabase point-in-time/daily backups",
    "```mermaid",
    "npm run check:production-runtime",
  ],
  "production runtime doc",
);

requireIncludes(
  plan,
  [
    "- [x] Confirm hosting target: Contabo VPS, managed platform, or hybrid.",
    "- [x] Confirm Supabase managed versus self-hosted database.",
    "- [x] Confirm domain, SSL, CDN, and backup approach.",
    "- [x] Document runtime diagram.",
    "10.01 Production Runtime Decision",
    "production-runtime-decision.md",
  ],
  "Plan 10 roadmap",
);

const phaseOneBlock = plan.match(
  /### Phase 1: Production Runtime Decision[\s\S]*?(?=### Phase 2: Docker Baseline)/,
)?.[0];

if (!phaseOneBlock || phaseOneBlock.includes("- [ ]")) {
  throw new Error("Plan 10 phase 1 still has unchecked tasks");
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
    "Confirmed Contabo VPS as the production hosting target.",
    "managed Supabase as the production database",
    "Dockerized Next.js as the app runtime",
    "does not drift back to Vercel assumptions",
    "Phase 10.02",
  ],
  "Plan 10 phase report",
);

requireIncludes(
  packageJson,
  ["check:production-runtime", "scripts/check-production-runtime-contract.mjs"],
  "package scripts",
);

const runtime = await jiti.import(
  join(root, "src/services/infrastructure/productionRuntimeDecision.ts"),
);

if (!runtime.isProductionRuntimeDecisionReady()) {
  throw new Error("Production runtime decision readiness check failed");
}

const decision = runtime.productionRuntimeDecision;
const readiness = runtime.buildProductionRuntimeReadiness();

if (
  decision.hostingTarget !== "contabo_vps" ||
  decision.databaseTarget !== "managed_supabase" ||
  decision.cdnTarget !== "cloudflare_optional" ||
  !decision.appRuntime.includes("Docker") ||
  !decision.domainStrategy.includes("VPS public IP") ||
  decision.backupLayers.length < 4
) {
  throw new Error(
    "Runtime decision should be Contabo VPS + managed Supabase + Docker",
  );
}

if (
  !readiness.hostingTargetConfirmed ||
  !readiness.managedSupabaseConfirmed ||
  !readiness.domainSslCdnBackupConfirmed ||
  !readiness.runtimeDiagramReady ||
  !readiness.vercelDependencyRemoved ||
  !readiness.readyForDockerBaseline
) {
  throw new Error("Production runtime readiness flags are incomplete");
}

if (
  runtime.runtimeDiagramNodes.length < 6 ||
  !runtime.runtimeDiagramNodes.some((node) => node.id === "supabase") ||
  !runtime.runtimeDiagramEdges.some(
    (edge) => edge.from === "web" && edge.to === "supabase",
  )
) {
  throw new Error(
    "Runtime diagram should include web to managed Supabase flow",
  );
}

console.log("OK production runtime contract");
