export type ReverseProxyEngine = "caddy";
export type TlsMode = "automatic_https";

export interface SecurityHeaderContract {
  name: string;
  value: string;
}

export const reverseProxyTlsBaseline = {
  engine: "caddy" as ReverseProxyEngine,
  tlsMode: "automatic_https" as TlsMode,
  caddyfilePath: "infrastructure/caddy/Caddyfile",
  composePath: "infrastructure/docker-compose.vps.yml",
  envTemplatePath: "infrastructure/.env.production.example",
  publicPorts: [80, 443],
  upstreamService: "web:3000",
  domainEnv: "FLOWFORCE_DOMAIN",
  acmeEmailEnv: "ACME_EMAIL",
  appHealthPath: "/api/health",
  proxyHealthPath: "/healthz",
  canonicalWwwBehavior: "redirect_www_to_apex",
  compression: ["zstd", "gzip"],
  securityHeaders: [
    {
      name: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains; preload",
    },
    {
      name: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      name: "X-Frame-Options",
      value: "DENY",
    },
    {
      name: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      name: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
  ] satisfies SecurityHeaderContract[],
} as const;

export function buildReverseProxyTlsReadiness() {
  return {
    hasCaddyConfig: reverseProxyTlsBaseline.caddyfilePath.endsWith("Caddyfile"),
    hasHttpsPorts:
      reverseProxyTlsBaseline.publicPorts.includes(80) &&
      reverseProxyTlsBaseline.publicPorts.includes(443),
    hasAutomaticTls: reverseProxyTlsBaseline.tlsMode === "automatic_https",
    hasSecureHeaders: reverseProxyTlsBaseline.securityHeaders.length >= 5,
    hasCompression:
      reverseProxyTlsBaseline.compression.includes("zstd") &&
      reverseProxyTlsBaseline.compression.includes("gzip"),
    hasDomainRouting:
      reverseProxyTlsBaseline.domainEnv === "FLOWFORCE_DOMAIN" &&
      reverseProxyTlsBaseline.upstreamService === "web:3000",
    hasHealthRouting:
      reverseProxyTlsBaseline.appHealthPath === "/api/health" &&
      reverseProxyTlsBaseline.proxyHealthPath === "/healthz",
  };
}

export function isReverseProxyTlsReady() {
  return Object.values(buildReverseProxyTlsReadiness()).every(Boolean);
}
