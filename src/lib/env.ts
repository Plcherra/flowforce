const boolFromEnv = (value: string | undefined, defaultValue = "false") => {
  const normalized = (value ?? defaultValue).toString().toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "no";
};

type EnvValue = string | boolean | undefined;
type EnvGroup = Record<string, EnvValue>;

export const appEnv = {
  MODE: process.env.NODE_ENV,
  DEV: process.env.NODE_ENV !== "production",
  VITE_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY,
  VITE_OPENAI_API_KEY:
    process.env.OPENAI_API_KEY ??
    process.env.NEXT_PUBLIC_OPENAI_API_KEY ??
    process.env.VITE_OPENAI_API_KEY,
  VITE_CONNECTEAM_API_BASE:
    process.env.NEXT_PUBLIC_CONNECTEAM_API_BASE ??
    process.env.VITE_CONNECTEAM_API_BASE ??
    "https://api.connecteam.com/v1",
  VITE_CONNECTEAM_API_KEY:
    process.env.CONNECTEAM_API_KEY ??
    process.env.NEXT_PUBLIC_CONNECTEAM_API_KEY ??
    process.env.VITE_CONNECTEAM_API_KEY ??
    "",
  VITE_LOG_LEVEL:
    process.env.NEXT_PUBLIC_LOG_LEVEL ?? process.env.VITE_LOG_LEVEL,
  VITE_REMOTE_LOG_LEVEL:
    process.env.NEXT_PUBLIC_REMOTE_LOG_LEVEL ??
    process.env.VITE_REMOTE_LOG_LEVEL,
  VITE_ENABLE_REMOTE_LOGS: boolFromEnv(
    process.env.NEXT_PUBLIC_ENABLE_REMOTE_LOGS ??
      process.env.VITE_ENABLE_REMOTE_LOGS,
    "true",
  ),
  VITE_ENABLE_AI_INSIGHTS: boolFromEnv(
    process.env.NEXT_PUBLIC_ENABLE_AI_INSIGHTS ??
      process.env.VITE_ENABLE_AI_INSIGHTS,
    "false",
  ),
  VITE_REMOTE_LOG_ENDPOINT:
    process.env.NEXT_PUBLIC_REMOTE_LOG_ENDPOINT ??
    process.env.VITE_REMOTE_LOG_ENDPOINT ??
    "/api/logs",
  VITE_LOG_INGEST_TOKEN:
    process.env.LOG_INGEST_TOKEN ??
    process.env.NEXT_PUBLIC_LOG_INGEST_TOKEN ??
    process.env.VITE_LOG_INGEST_TOKEN,
  VITE_DEFAULT_COMPANY_ID:
    process.env.NEXT_PUBLIC_DEFAULT_COMPANY_ID ??
    process.env.VITE_DEFAULT_COMPANY_ID,
  VITE_FLOWFORCE_AUTOMATIONS_ENDPOINT:
    process.env.NEXT_PUBLIC_FLOWFORCE_AUTOMATIONS_ENDPOINT ??
    process.env.VITE_FLOWFORCE_AUTOMATIONS_ENDPOINT,
};

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: appEnv.VITE_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: appEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CONNECTEAM_API_BASE: appEnv.VITE_CONNECTEAM_API_BASE,
  NEXT_PUBLIC_LOG_LEVEL: appEnv.VITE_LOG_LEVEL,
  NEXT_PUBLIC_REMOTE_LOG_LEVEL: appEnv.VITE_REMOTE_LOG_LEVEL,
  NEXT_PUBLIC_ENABLE_REMOTE_LOGS: appEnv.VITE_ENABLE_REMOTE_LOGS,
  NEXT_PUBLIC_ENABLE_AI_INSIGHTS: appEnv.VITE_ENABLE_AI_INSIGHTS,
  NEXT_PUBLIC_REMOTE_LOG_ENDPOINT: appEnv.VITE_REMOTE_LOG_ENDPOINT,
  NEXT_PUBLIC_DEFAULT_COMPANY_ID: appEnv.VITE_DEFAULT_COMPANY_ID,
  NEXT_PUBLIC_FLOWFORCE_AUTOMATIONS_ENDPOINT:
    appEnv.VITE_FLOWFORCE_AUTOMATIONS_ENDPOINT,
} satisfies EnvGroup;

export const serverEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL ?? appEnv.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  CONNECTEAM_API_KEY: process.env.CONNECTEAM_API_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  LOG_INGEST_TOKEN: process.env.LOG_INGEST_TOKEN,
  LOG_LEVEL: process.env.LOG_LEVEL,
  LOG_PERSIST_LEVEL: process.env.LOG_PERSIST_LEVEL,
  LOG_PERSISTENCE: process.env.LOG_PERSISTENCE,
} satisfies EnvGroup;

export const testEnv = {
  TEST_URL: process.env.TEST_URL,
  ONBOARDING_E2E_BASE_URL: process.env.ONBOARDING_E2E_BASE_URL,
  SMOKE_TIMEOUT_MS: process.env.SMOKE_TIMEOUT_MS,
  SMOKE_HEADED: process.env.SMOKE_HEADED,
  SMOKE_KEEP_DATA: process.env.SMOKE_KEEP_DATA,
  KPI_RANGE_DAYS: process.env.KPI_RANGE_DAYS,
} satisfies EnvGroup;

export const deployEnv = {
  SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD,
  NEXT_PUBLIC_SUPABASE_URL: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
  SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
  SUPABASE_CLI_BIN: process.env.SUPABASE_CLI_BIN,
  SUPABASE_CLI_VERSION: process.env.SUPABASE_CLI_VERSION,
} satisfies EnvGroup;

export type EnvValidationScope = "public" | "server" | "test" | "deploy";

export type EnvValidationResult = {
  scope: EnvValidationScope;
  ok: boolean;
  missing: string[];
};

export const REQUIRED_PUBLIC_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export const REQUIRED_SERVER_ENV = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export const REQUIRED_TEST_ENV = [] as const;

export const REQUIRED_DEPLOY_ENV = [
  "SUPABASE_DB_PASSWORD",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PROJECT_REF",
] as const;

const envGroups = {
  public: publicEnv,
  server: serverEnv,
  test: testEnv,
  deploy: deployEnv,
} satisfies Record<EnvValidationScope, EnvGroup>;

const requiredEnvByScope = {
  public: REQUIRED_PUBLIC_ENV,
  server: REQUIRED_SERVER_ENV,
  test: REQUIRED_TEST_ENV,
  deploy: REQUIRED_DEPLOY_ENV,
} satisfies Record<EnvValidationScope, readonly string[]>;

export const validateEnv = (
  scope: EnvValidationScope,
): EnvValidationResult => {
  const group = envGroups[scope];
  const missing = requiredEnvByScope[scope].filter((key) => !group[key]);

  return {
    scope,
    ok: missing.length === 0,
    missing,
  };
};

export const assertEnvScope = (scope: EnvValidationScope): void => {
  const result = validateEnv(scope);

  if (!result.ok) {
    throw new Error(
      `Missing required ${scope} environment variable(s): ${result.missing.join(
        ", ",
      )}`,
    );
  }
};

export const assertProductionEnv = (scope: EnvValidationScope): void => {
  if (process.env.NODE_ENV === "production") {
    assertEnvScope(scope);
  }
};

export const isDev = appEnv.DEV;

export const requireEnv = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};
