import { appEnv, requireEnv } from '@/lib/env';

export const SUPABASE_URL = requireEnv(appEnv.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = requireEnv(
  appEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
  'VITE_SUPABASE_PUBLISHABLE_KEY',
);
export const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
export const REST_BASE = `${SUPABASE_URL}/rest/v1`;
