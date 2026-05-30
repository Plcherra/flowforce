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

const caddyfile = readText("infrastructure/caddy/Caddyfile");
const compose = readText("infrastructure/docker-compose.vps.yml");
const envTemplate = readText("infrastructure/.env.production.example");
const service = readText("src/services/infrastructure/reverseProxyTls.ts");
const doc = readText("docs/production-reverse-proxy-tls.md");
const plan = readText("docs/roadmap/10-production-infrastructure-and-launch.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/10-03-reverse-proxy-tls-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  caddyfile,
  [
    "email {$ACME_EMAIL}",
    "{$FLOWFORCE_DOMAIN}",
    "encode zstd gzip",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "handle_path /healthz",
    "reverse_proxy web:3000",
    "health_uri /api/health",
    "www.{$FLOWFORCE_DOMAIN}",
    "redir https://{$FLOWFORCE_DOMAIN}{uri} permanent",
    "format json",
  ],
  "Caddyfile",
);

requireIncludes(
  compose,
  [
    "caddy:2.10-alpine",
    "80:80",
    "443:443",
    "./caddy/Caddyfile:/etc/caddy/Caddyfile:ro",
    "flowforce-web:latest",
    '"3000"',
    "restart: unless-stopped",
    "caddy_data",
    "caddy_logs",
  ],
  "VPS compose",
);

requireIncludes(
  envTemplate,
  [
    "FLOWFORCE_DOMAIN=example.com",
    "ACME_EMAIL=ops@example.com",
    "NEXT_PUBLIC_SUPABASE_URL=",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=",
    "SUPABASE_URL=",
    "SUPABASE_SERVICE_ROLE_KEY=",
  ],
  "production env template",
);

requireIncludes(
  service,
  [
    "reverseProxyTlsBaseline",
    "ReverseProxyEngine",
    "automatic_https",
    "infrastructure/caddy/Caddyfile",
    "infrastructure/docker-compose.vps.yml",
    "FLOWFORCE_DOMAIN",
    "ACME_EMAIL",
    "Strict-Transport-Security",
    "buildReverseProxyTlsReadiness",
    "isReverseProxyTlsReady",
  ],
  "reverse proxy service",
);

requireIncludes(
  doc,
  [
    "FlowForce uses Caddy",
    "Contabo VPS",
    "redirects HTTP to HTTPS",
    "Public ports: `80` and `443`",
    "FLOWFORCE_DOMAIN=example.com",
    "ACME_EMAIL=ops@example.com",
    "Strict-Transport-Security",
    "curl -fsS https://example.com/healthz",
    "caddy validate --config /etc/caddy/Caddyfile",
    "Phase 10.04",
  ],
  "reverse proxy doc",
);

requireIncludes(
  plan,
  [
    "- [x] Add Nginx or Caddy config.",
    "- [x] Add HTTP to HTTPS behavior.",
    "- [x] Add headers and compression.",
    "- [x] Add domain routing for web/API if needed.",
    "10.03 Reverse Proxy And TLS",
    "production-reverse-proxy-tls.md",
  ],
  "Plan 10 roadmap",
);

const phaseThreeBlock = plan.match(
  /### Phase 3: Reverse Proxy And TLS[\s\S]*?(?=### Phase 4: VPS Deploy Scripts)/,
)?.[0];

if (!phaseThreeBlock || phaseThreeBlock.includes("- [ ]")) {
  throw new Error("Plan 10 phase 3 still has unchecked tasks");
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
    "Added a Caddy reverse proxy config",
    "automatic HTTPS",
    "security headers",
    "VPS Compose file",
    "Phase 10.04",
  ],
  "Plan 10 phase report",
);

requireIncludes(
  packageJson,
  ["check:reverse-proxy-tls", "scripts/check-reverse-proxy-tls-contract.mjs"],
  "package scripts",
);

const runtime = await jiti.import(
  join(root, "src/services/infrastructure/reverseProxyTls.ts"),
);

if (!runtime.isReverseProxyTlsReady()) {
  throw new Error("Reverse proxy TLS readiness check failed");
}

const readiness = runtime.buildReverseProxyTlsReadiness();

if (
  !readiness.hasCaddyConfig ||
  !readiness.hasHttpsPorts ||
  !readiness.hasAutomaticTls ||
  !readiness.hasSecureHeaders ||
  !readiness.hasCompression ||
  !readiness.hasDomainRouting ||
  !readiness.hasHealthRouting
) {
  throw new Error("Reverse proxy TLS readiness flags are incomplete");
}

console.log("OK reverse proxy TLS contract");
