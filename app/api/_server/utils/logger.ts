import { supabaseAdmin } from "../supabaseAdmin";

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const VALID_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function normalizeLevel(value: string | undefined | null, fallback: LogLevel): LogLevel {
  if (!value) return fallback;
  const lower = value.toLowerCase() as LogLevel;
  return VALID_LEVELS.includes(lower) ? lower : fallback;
}

function normalizeUuid(value?: string) {
  if (!value) return undefined;
  return UUID_REGEX.test(value) ? value : undefined;
}

const runtimeLogLevel = normalizeLevel(process.env.LOG_LEVEL, 'info');
const persistLevel = normalizeLevel(process.env.LOG_PERSIST_LEVEL, 'warn');
const persistenceEnabled = process.env.LOG_PERSISTENCE !== 'false';

export interface LogContext {
  orgId?: string;
  userId?: string;
  requestId?: string;
  location?: string;
  tags?: string[];
}

export interface LogMeta extends LogContext {
  context?: Record<string, unknown>;
  error?: unknown;
}

interface ServerLogger {
  debug: (message: string, meta?: LogMeta) => void;
  info: (message: string, meta?: LogMeta) => void;
  warn: (message: string, meta?: LogMeta) => void;
  error: (message: string, meta?: LogMeta) => void;
  child: (meta: Partial<LogContext> & { scope?: string }) => ServerLogger;
}

function shouldLog(level: LogLevel) {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[runtimeLogLevel];
}

function shouldPersist(level: LogLevel) {
  if (!persistenceEnabled) return false;
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[persistLevel];
}

function serializeError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === 'object') {
    try {
      return JSON.parse(
        JSON.stringify(error, (_key, value) => {
          if (value instanceof Error) {
            return serializeError(value);
          }
          if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined') {
            return String(value);
          }
          return value;
        }),
      );
    } catch (_err) {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function sanitizeContext(context?: Record<string, unknown>) {
  if (!context) return {};
  try {
    return JSON.parse(
      JSON.stringify(context, (_key, value) => {
        if (value instanceof Error) return serializeError(value);
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'function' || typeof value === 'symbol') return String(value);
        return value;
      }),
    );
  } catch (error) {
    return { note: 'unable_to_serialize_context', error: String(error) };
  }
}

async function persistLog(level: LogLevel, message: string, meta: LogMeta, scope: string) {
  if (!shouldPersist(level)) return;

  const serializedError = serializeError(meta.error);
  const tags = Array.from(new Set([...(meta.tags || [])]));
  const orgId = normalizeUuid(meta.orgId);
  const userId = normalizeUuid(meta.userId);

  try {
    const { error } = await supabaseAdmin.from('system_logs').insert({
      level,
      message,
      location: meta.location || scope,
      request_id: meta.requestId,
      org_id: orgId ?? null,
      user_id: userId ?? null,
      context: sanitizeContext(meta.context),
      stack: serializedError?.stack,
      tags,
    });

    if (error) {
      console.error('[logger] failed to persist log', error);
    }
  } catch (error) {
    console.error('[logger] unexpected error persisting log', error);
  }
}

function log(level: LogLevel, scope: string, message: string, meta: LogMeta = {}) {
  if (shouldLog(level)) {
    const consoleMessage = scope ? `[${scope}] ${message}` : message;
    const payload = meta.context ?? meta.error ?? undefined;
    switch (level) {
      case 'debug':
        console.debug(consoleMessage, payload ?? '');
        break;
      case 'info':
        console.info(consoleMessage, payload ?? '');
        break;
      case 'warn':
        console.warn(consoleMessage, payload ?? '');
        break;
      case 'error':
        console.error(consoleMessage, meta.error ?? payload ?? '');
        break;
    }
  }

  void persistLog(level, message, meta, scope);
}

export function createServerLogger(scope: string, base: LogContext = {}): ServerLogger {
  const normalizedBase: LogContext = {
    location: base.location || scope,
    orgId: base.orgId,
    userId: base.userId,
    requestId: base.requestId,
    tags: base.tags,
  };

  const withBase = (meta?: LogMeta) => ({
    ...normalizedBase,
    ...(meta || {}),
    tags: Array.from(new Set([...(normalizedBase.tags || []), ...((meta && meta.tags) || [])])),
  });

  const logger: ServerLogger = {
    debug: (message, meta) => log('debug', scope, message, withBase(meta)),
    info: (message, meta) => log('info', scope, message, withBase(meta)),
    warn: (message, meta) => log('warn', scope, message, withBase(meta)),
    error: (message, meta) => log('error', scope, message, withBase(meta)),
    child: (meta) => {
      const nextScope = meta.scope || scope;
      const { scope: _scope, ...rest } = meta;
      return createServerLogger(nextScope, { ...normalizedBase, ...rest });
    },
  };

  return logger;
}
