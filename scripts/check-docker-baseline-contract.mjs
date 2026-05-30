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

const dockerfile = readText("Dockerfile");
const dockerignore = readText(".dockerignore");
const compose = readText("infrastructure/docker-compose.production-local.yml");
const nextConfig = readText("next.config.mjs");
const healthRoute = readText("app/api/health/route.ts");
const service = readText("src/services/infrastructure/dockerBaseline.ts");
const doc = readText("docs/production-docker-baseline.md");
const plan = readText("docs/roadmap/10-production-infrastructure-and-launch.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/10-02-docker-baseline-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  dockerfile,
  [
    "FROM node:22-bookworm-slim AS base",
    "FROM base AS deps",
    "FROM base AS builder",
    "FROM node:22-bookworm-slim AS runner",
    "npm ci",
    "NODE_OPTIONS=--max-old-space-size=2048",
    "npm run build",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./",
    "COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static",
    "USER nextjs",
    "HEALTHCHECK",
    "/api/health",
    'CMD ["node", "server.js"]',
  ],
  "Dockerfile",
);

requireIncludes(
  dockerignore,
  [
    ".next",
    "node_modules",
    ".env",
    ".env.*",
    "android",
    "ios",
    "playwright-report",
    "test-results",
  ],
  ".dockerignore",
);

requireIncludes(
  compose,
  [
    "flowforce-web:local",
    "dockerfile: Dockerfile",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "../.env.production.local",
    "3000:3000",
    "/api/health",
  ],
  "local production compose",
);

requireIncludes(nextConfig, ["output: 'standalone'"], "next.config.mjs");

requireIncludes(
  healthRoute,
  [
    'status: "ok"',
    'service: "flowforce-web"',
    'runtime: "nextjs"',
    '"Cache-Control": "no-store"',
  ],
  "health route",
);

requireIncludes(
  service,
  [
    "dockerBaseline",
    "DockerEnvVariable",
    "DockerEnvPhase",
    "buildDockerBaselineReadiness",
    "isDockerBaselineReady",
    "flowforce-web",
    "/api/health",
    "standalone",
    "NEXT_PUBLIC_SUPABASE_URL",
    "supabaseServiceRoleEnvName",
  ],
  "Docker baseline service",
);

requireIncludes(
  doc,
  [
    "FlowForce runs as a Dockerized Next.js standalone server",
    "Contabo VPS",
    "Builder memory cap: `NODE_OPTIONS=--max-old-space-size=2048`",
    "Public browser variables are build-time inputs",
    "Server-only variables are runtime inputs",
    "Do not bake `SUPABASE_SERVICE_ROLE_KEY`",
    "export DOCKER_HOST=unix:///Users/pedromartins/.colima/flowforce/docker.sock",
    "colima start flowforce --cpu 4 --memory 8 --disk 40 --runtime docker",
    "docker compose --env-file .env.production.local",
    "curl -fsS http://127.0.0.1:3000/api/health",
  ],
  "Docker baseline doc",
);

requireIncludes(
  plan,
  [
    "- [x] Add production Dockerfile for Next.js.",
    "- [x] Add `.dockerignore`.",
    "- [x] Add local production build/run instructions.",
    "- [x] Verify env injection.",
    "10.02 Docker Baseline",
    "production-docker-baseline.md",
  ],
  "Plan 10 roadmap",
);

const phaseTwoBlock = plan.match(
  /### Phase 2: Docker Baseline[\s\S]*?(?=### Phase 3: Reverse Proxy And TLS)/,
)?.[0];

if (!phaseTwoBlock || phaseTwoBlock.includes("- [ ]")) {
  throw new Error("Plan 10 phase 2 still has unchecked tasks");
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
    "Added a production Dockerfile",
    "Enabled Next.js standalone output",
    "Added `/api/health`",
    "Colima-friendly local production Compose file",
    "Docker builder memory cap",
    "Phase 10.03",
  ],
  "Plan 10 phase report",
);

requireIncludes(
  packageJson,
  ["check:docker-baseline", "scripts/check-docker-baseline-contract.mjs"],
  "package scripts",
);

const runtime = await jiti.import(
  join(root, "src/services/infrastructure/dockerBaseline.ts"),
);

if (!runtime.isDockerBaselineReady()) {
  throw new Error("Docker baseline readiness check failed");
}

const readiness = runtime.buildDockerBaselineReadiness();
const envVariableNames = runtime.dockerBaseline.envVariables.map(
  (variable) => variable.name,
);

if (
  !readiness.hasProductionDockerfile ||
  !readiness.hasDockerignore ||
  !readiness.standaloneOutput ||
  !readiness.hasHealthEndpoint ||
  !readiness.envInjectionSeparated ||
  !readiness.readyForReverseProxy
) {
  throw new Error("Docker baseline readiness flags are incomplete");
}

if (!envVariableNames.includes("SUPABASE_SERVICE_ROLE_KEY")) {
  throw new Error("Docker baseline must require SUPABASE_SERVICE_ROLE_KEY");
}

console.log("OK Docker baseline contract");
