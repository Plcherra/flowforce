export const EDGE_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://www.flowforce.uk",
  "https://flowforce.uk",
];

export function edgeCorsHeaders(origin: string | null) {
  const allowOrigin =
    origin && EDGE_ALLOWED_ORIGINS.includes(origin) ? origin : EDGE_ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-retry-count",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
