const STRIPE_CONNECT = [
  "https://api.stripe.com",
  "https://js.stripe.com",
  "https://checkout.stripe.com",
  "https://billing.stripe.com",
];

function httpOrigin(value) {
  if (!value || typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function supabaseConnectSources(env = process.env) { // pragma: allowlist secret
  const sources = ["https://*.supabase.co", "wss://*.supabase.co"]; // pragma: allowlist secret
  const origin = httpOrigin(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL); // pragma: allowlist secret
  if (!origin) return sources;
  sources.push(origin);
  if (origin.startsWith("https://")) {
    sources.push(`wss://${origin.slice("https://".length)}`);
  } else if (origin.startsWith("http://")) {
    sources.push(`ws://${origin.slice("http://".length)}`);
  }
  return unique(sources);
}

export function contentSecurityPolicy(env = process.env) {
  const supabase = supabaseConnectSources(env); // pragma: allowlist secret
  const directives = {
    "default-src": ["'self'", "capacitor:", "ionic:", "https://localhost"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'", "https://checkout.stripe.com", "https://billing.stripe.com"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      "https://js.stripe.com",
      "https://va.vercel-scripts.com",
      "capacitor:",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://*.supabase.co", // pragma: allowlist secret
      "https://*.stripe.com",
      ...supabase.filter((source) => source.startsWith("https://")), // pragma: allowlist secret
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "capacitor:",
      "ionic:",
      "https://localhost",
      "http://localhost",
      "ws://localhost",
      "https://api.bigdatacloud.net",
      "https://va.vercel-scripts.com",
      "https://vitals.vercel-insights.com",
      ...STRIPE_CONNECT,
      ...supabase, // pragma: allowlist secret
    ],
    "frame-src": [
      "https://js.stripe.com",
      "https://hooks.stripe.com",
      "https://checkout.stripe.com",
      "https://www.youtube.com",
      "https://www.youtube-nocookie.com",
    ],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
  };

  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${unique(sources).join(" ")}`)
    .join("; ");
}

export function productionSecurityHeaders(env = process.env) {
  const headers = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(env) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
    },
  ];

  if (env.NODE_ENV === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
