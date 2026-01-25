import { appEnv } from '@/lib/env';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const VALID_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function normalizeLevel(value: string | undefined | null, fallback: LogLevel): LogLevel {
  if (!value) return fallback;
  const lower = value.toLowerCase() as LogLevel;
  return VALID_LEVELS.includes(lower) ? lower : fallback;
}

const runtimeLogLevel = normalizeLevel(appEnv.VITE_LOG_LEVEL, 'info');
const remoteLogLevel = normalizeLevel(appEnv.VITE_REMOTE_LOG_LEVEL, 'warn');
const remoteLoggingEnabled = appEnv.VITE_ENABLE_REMOTE_LOGS;
const remoteEndpoint = appEnv.VITE_REMOTE_LOG_ENDPOINT || '/api/logs';
const ingestToken = appEnv.VITE_LOG_INGEST_TOKEN;

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
  timestamp?: string;
}

export interface ClientLogger {
  debug: (message: string, meta?: LogMeta) => void;
  info: (message: string, meta?: LogMeta) => void;
  warn: (message: string, meta?: LogMeta) => void;
  error: (message: string, meta?: LogMeta) => void;
  child: (meta: Partial<LogContext> & { scope?: string }) => ClientLogger;
}

function shouldLog(level: LogLevel) {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[runtimeLogLevel];
}

function shouldSend(level: LogLevel) {
  if (!remoteLoggingEnabled) return false;
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[remoteLogLevel];
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
          if (value instanceof Error) return serializeError(value);
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

async function sendRemote(level: LogLevel, scope: string, message: string, meta: LogMeta) {
  if (!shouldSend(level)) return;
  if (typeof fetch === 'undefined') return;

  const serializedError = serializeError(meta.error);
  const tags = Array.from(new Set([...(meta.tags || [])]));

  try {
    await fetch(remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ingestToken ? { 'x-log-token': ingestToken } : {}),
      },
      body: JSON.stringify({
        level,
        message,
        location: meta.location || scope,
        requestId: meta.requestId,
        orgId: meta.orgId,
        userId: meta.userId,
        context: {
          ...sanitizeContext(meta.context),
          ...(serializedError ? { error: serializedError } : {}),
        },
        stack: serializedError?.stack,
        tags,
      }),
    });
  } catch (error) {
    // Avoid throwing from logger; fallback to console
    console.warn('[logger] failed to send remote log', error);
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

  void sendRemote(level, scope, message, meta);
}

export function createScopedLogger(scope: string, base: LogContext = {}): ClientLogger {
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

  const logger: ClientLogger = {
    debug: (message, meta) => log('debug', scope, message, withBase(meta)),
    info: (message, meta) => log('info', scope, message, withBase(meta)),
    warn: (message, meta) => log('warn', scope, message, withBase(meta)),
    error: (message, meta) => log('error', scope, message, withBase(meta)),
    child: (meta) => {
      const nextScope = meta.scope || scope;
      const { scope: _scope, ...rest } = meta;
      return createScopedLogger(nextScope, { ...normalizedBase, ...rest });
    },
  };

  return logger;
}

export function captureError(error: unknown, meta?: LogMeta & { message?: string }) {
  const message = meta?.message || (error instanceof Error ? error.message : 'Unknown error');
  logger.error(message, { ...(meta || {}), error });
}

export const logger = createScopedLogger('app');
