import type { IncomingHttpHeaders } from "node:http";

type HeaderValue = string | string[] | undefined;

export interface CronValidationResult {
  ok: boolean;
  reason?: 'missing_env' | 'missing_header' | 'mismatch';
  providedSecret?: string;
}

const SECRET_HEADER_CANDIDATES = ['x-cron-secret', 'cron-secret', 'cron_secret'] as const;

function normalizeHeaderValue(value: HeaderValue): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}

function extractCronSecret(headers: IncomingHttpHeaders): string | undefined {
  for (const key of SECRET_HEADER_CANDIDATES) {
    const candidate = normalizeHeaderValue(headers[key]);
    if (candidate) return candidate;
  }

  const authorization = normalizeHeaderValue(headers.authorization);
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7);
  }

  return undefined;
}

export function verifyCronRequest(headers: IncomingHttpHeaders): CronValidationResult {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return { ok: false, reason: 'missing_env' };
  }

  const providedSecret = extractCronSecret(headers);
  if (!providedSecret) {
    return { ok: false, reason: 'missing_header' };
  }

  if (providedSecret !== expectedSecret) {
    return { ok: false, reason: 'mismatch', providedSecret };
  }

  return { ok: true, providedSecret };
}
