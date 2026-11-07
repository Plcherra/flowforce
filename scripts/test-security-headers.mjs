import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { productionSecurityHeaders } = await jiti.import(
  "../src/server/securityHeaders.mjs",
);
const nextConfig = await jiti.import("../next.config.mjs");

const productionEnv = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", // pragma: allowlist secret
};

const headers = productionSecurityHeaders(productionEnv);
const byName = Object.fromEntries(headers.map((header) => [header.key, header.value]));
const policy = byName["Content-Security-Policy"];

assert.equal(typeof policy, "string");
for (const source of [
  "https://*.supabase.co", // pragma: allowlist secret
  "wss://*.supabase.co", // pragma: allowlist secret
  "https://example.supabase.co", // pragma: allowlist secret
  "wss://example.supabase.co", // pragma: allowlist secret
  "https://js.stripe.com",
  "https://api.stripe.com",
  "https://checkout.stripe.com",
  "capacitor:",
  "ionic:",
  "frame-ancestors 'none'",
]) {
  assert.equal(policy.includes(source), true, source);
}
assert.match(byName["Strict-Transport-Security"], /max-age=\d+/);
assert.equal(byName["X-Frame-Options"], "DENY");
assert.equal(byName["X-Content-Type-Options"], "nosniff");
assert.equal(byName["Referrer-Policy"], "strict-origin-when-cross-origin");
assert.match(byName["Permissions-Policy"], /geolocation=\(self\)/);
assert.match(byName["Permissions-Policy"], /camera=\(\)/);

const development = productionSecurityHeaders({ NODE_ENV: "development" });
assert.equal(
  development.some((header) => header.key === "Strict-Transport-Security"),
  false,
);

const wired = await nextConfig.default.headers();
assert.equal(wired[0]?.source, "/:path*");
assert.equal(
  wired[0]?.headers.some((header) => header.key === "Content-Security-Policy"),
  true,
);

console.log("security header tests passed");
