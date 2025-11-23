import { randomUUID } from "node:crypto";
import { createServerLogger } from "./_server/utils/logger.js";
import { supabaseAdmin } from "./_server/supabaseAdmin.js";

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const allowedLevels = new Set<LogLevel>(['debug', 'info', 'warn', 'error']);
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const baseLogger = createServerLogger('log-ingest');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  const logger = baseLogger.child({ requestId, scope: 'log-ingest' });

  const ingestToken = process.env.LOG_INGEST_TOKEN;
  const headerToken = req.headers['x-log-token'];
  if (ingestToken && ingestToken !== headerToken) {
    logger.warn('Rejected log ingestion due to token mismatch');
    return res.status(401).json({ error: 'unauthorized' });
  }

  const body = normalizeBody(req.body);
  const { level, message } = body;

  if (!level || !message || !allowedLevels.has(level)) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  try {
    const { error } = await supabaseAdmin.from('system_logs').insert({
      level,
      message,
      location: body.location || 'client',
      request_id: body.requestId || requestId,
      org_id: safeUuid(body.orgId) ?? null,
      user_id: safeUuid(body.userId) ?? null,
      context: normalizeContext(body.context, body.error),
      stack: body.stack,
      tags: Array.isArray(body.tags) ? body.tags : [],
    });

    if (error) {
      logger.error('Failed to persist ingested log', { error, context: { level } });
      return res.status(500).json({ error: 'log_persist_failed' });
    }

    logger.debug('Log ingested', {
      context: {
        level,
        location: body.location || 'client',
      },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Unexpected error ingesting log', { error, context: { level } });
    return res.status(500).json({ error: 'log_ingest_failed' });
  }
}

function normalizeBody(body: any) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function normalizeContext(context: any, error: any) {
  const base = context && typeof context === 'object' ? context : {};
  const serializedError = error && typeof error === 'object' ? error : undefined;
  try {
    return JSON.parse(
      JSON.stringify(
        { ...base, ...(serializedError ? { error: serializedError } : {}) },
        (_key, value) => {
          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: value.stack,
            };
          }
          if (typeof value === 'bigint') return Number(value);
          if (typeof value === 'function' || typeof value === 'symbol') return String(value);
          return value;
        },
      ),
    );
  } catch (err) {
    return { note: 'failed_to_normalize_context', error: String(err) };
  }
}

function safeUuid(value: any) {
  if (typeof value !== 'string') return undefined;
  return UUID_REGEX.test(value) ? value : undefined;
}
