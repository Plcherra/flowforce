import { appEnv, requireEnv } from "@/lib/env";
import { logger } from "@/utils/logger";

// Safe getter that logs warnings instead of throwing during module init
// Works for both server and client - allows app to start even without env vars
const getEnvOrWarn = (value: string | undefined, key: string): string => {
  if (!value) {
    // Log warning but don't throw - allows dev server and app to start
    // The app will use placeholder values instead
    if (typeof window === "undefined") {
      logger.warn(
        `[Config] Missing environment variable: ${key}. Using placeholder`,
        { context: { key }, tags: ["warning"] },
      );
    } else {
      logger.warn(
        `[Config] Missing environment variable: ${key}. Some features may not work`,
        { context: { key }, tags: ["warning"] },
      );
    }
    return "";
  }
  return value;
};

export const SUPABASE_URL = getEnvOrWarn(
  appEnv.VITE_SUPABASE_URL,
  "VITE_SUPABASE_URL",
);
export const SUPABASE_ANON_KEY = getEnvOrWarn(
  appEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
  "VITE_SUPABASE_PUBLISHABLE_KEY",
);
export const FUNCTIONS_BASE = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1`
  : "";
export const REST_BASE = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : "";
