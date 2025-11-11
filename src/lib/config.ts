const requireEnv = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const SUPABASE_URL = requireEnv(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = requireEnv(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  'VITE_SUPABASE_PUBLISHABLE_KEY',
);
export const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
export const REST_BASE = `${SUPABASE_URL}/rest/v1`;
