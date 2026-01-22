# Environment Variables Setup

## Current Issue

The app is running but throwing a runtime error because environment variables are missing. This is expected when files are in iCloud - environment variables need to be set up.

## Quick Fix: Create .env.local

Create a `.env.local` file in your project root with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OR use VITE_ prefix (for backward compatibility)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# For API routes (server-side only)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Where to Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Settings → API
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## Fix Applied

I've updated `src/lib/config.ts` to:
- ✅ Not throw errors on client-side
- ✅ Use placeholder values when env vars are missing
- ✅ Log warnings instead of crashing

The app will now start even without env vars, but Supabase features won't work until you add them.

## Test

1. Create `.env.local` with your Supabase credentials
2. Restart the dev server: `npm run dev`
3. The error should be gone!

## Note About iCloud

If your project is in iCloud Drive, make sure:
- `.env.local` is in the project root
- It's not synced to iCloud (add to `.gitignore` if using git)
- Restart the dev server after creating/updating `.env.local`
