export const LOCAL_BASE_URL = 'http://127.0.0.1:3000';

export function playwrightBaseURL(): string {
  return process.env.PLAYWRIGHT_BASE_URL || LOCAL_BASE_URL;
}

export function isLocalBaseURL(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

/**
 * Names the test cannot run without.
 * Public Supabase keys are required for the local dev server.
 * A Vercel preview already has those keys in the build, so only the
 * test user is required when PLAYWRIGHT_BASE_URL points somewhere else.
 */
export function missingE2eEnv(baseURL = playwrightBaseURL()): string[] {
  const missing: string[] = [];
  if (!process.env.TEST_USER_EMAIL) missing.push('TEST_USER_EMAIL');
  if (!process.env.TEST_USER_PASSWORD) missing.push('TEST_USER_PASSWORD');
  if (isLocalBaseURL(baseURL)) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      missing.push('NEXT_PUBLIC_SUPABASE_URL');
    }
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    }
  }
  return missing;
}
