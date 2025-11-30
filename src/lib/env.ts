const boolFromEnv = (value: string | undefined, defaultValue = 'false') => {
  const normalized = (value ?? defaultValue).toString().toLowerCase();
  return normalized !== 'false' && normalized !== '0' && normalized !== 'no';
};

export const appEnv = {
  MODE: process.env.NODE_ENV,
  DEV: process.env.NODE_ENV !== 'production',
  VITE_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY,
  VITE_OPENAI_API_KEY:
    process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? process.env.VITE_OPENAI_API_KEY,
  VITE_CONNECTEAM_API_BASE:
    process.env.NEXT_PUBLIC_CONNECTEAM_API_BASE ?? process.env.VITE_CONNECTEAM_API_BASE ?? 'https://api.connecteam.com/v1',
  VITE_CONNECTEAM_API_KEY:
    process.env.CONNECTEAM_API_KEY ??
    process.env.NEXT_PUBLIC_CONNECTEAM_API_KEY ??
    process.env.VITE_CONNECTEAM_API_KEY ??
    '',
  VITE_LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL ?? process.env.VITE_LOG_LEVEL,
  VITE_REMOTE_LOG_LEVEL: process.env.NEXT_PUBLIC_REMOTE_LOG_LEVEL ?? process.env.VITE_REMOTE_LOG_LEVEL,
  VITE_ENABLE_REMOTE_LOGS: boolFromEnv(process.env.NEXT_PUBLIC_ENABLE_REMOTE_LOGS ?? process.env.VITE_ENABLE_REMOTE_LOGS, 'true'),
  VITE_REMOTE_LOG_ENDPOINT: process.env.NEXT_PUBLIC_REMOTE_LOG_ENDPOINT ?? process.env.VITE_REMOTE_LOG_ENDPOINT ?? '/api/logs',
  VITE_LOG_INGEST_TOKEN:
    process.env.LOG_INGEST_TOKEN ?? process.env.NEXT_PUBLIC_LOG_INGEST_TOKEN ?? process.env.VITE_LOG_INGEST_TOKEN,
  VITE_DEFAULT_COMPANY_ID: process.env.NEXT_PUBLIC_DEFAULT_COMPANY_ID ?? process.env.VITE_DEFAULT_COMPANY_ID,
  VITE_FLOWFORCE_AUTOMATIONS_ENDPOINT:
    process.env.NEXT_PUBLIC_FLOWFORCE_AUTOMATIONS_ENDPOINT ?? process.env.VITE_FLOWFORCE_AUTOMATIONS_ENDPOINT,
};

export const isDev = appEnv.DEV;

export const requireEnv = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};
