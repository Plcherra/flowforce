# Vercel Deployment Fix
**Date:** January 22, 2026

## Problem
Vercel deployment was failing. The build script used `cross-env` which may not be necessary on Vercel's Linux-based build environment.

## Fixes Applied

### 1. Simplified Build Script ✅
**Changed:**
- `"build": "cross-env NODE_OPTIONS=--max-old-space-size=4096 next build"`
- To: `"build": "next build"`

**Why:**
- Vercel's build environment has sufficient memory by default
- `cross-env` is mainly needed for cross-platform compatibility (Windows/Mac/Linux)
- Vercel uses Linux, so direct environment variable syntax works
- If more memory is needed, it can be set in Vercel project settings

**Local Development:**
- Added `"build:local"` script for local builds with increased memory:
  - `"build:local": "cross-env NODE_OPTIONS=--max-old-space-size=4096 next build"`

### 2. Updated vercel.json ✅
**Added explicit build configuration:**
```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

**Why:**
- Explicitly tells Vercel this is a Next.js project
- Ensures correct build command is used
- Helps Vercel optimize the build process

## Environment Variables Required

Make sure these are set in Vercel project settings:

### Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

### Optional (for API routes):
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- `OPENAI_API_KEY` - For AI features
- `LOG_INGEST_TOKEN` - For log ingestion

### How to Set in Vercel:
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add each variable for:
   - **Production**
   - **Preview** (optional)
   - **Development** (optional)

## Next Steps

1. **Commit and push the changes:**
   ```bash
   git add package.json vercel.json
   git commit -m "Fix Vercel deployment: simplify build script"
   git push origin feat/unified-calendar
   ```

2. **Verify deployment:**
   - Check Vercel dashboard for build status
   - Review build logs if it still fails

3. **If build still fails, check:**
   - Environment variables are set correctly
   - No TypeScript errors (though `ignoreBuildErrors: true` is set)
   - Dependencies install correctly
   - No missing files or imports

## Troubleshooting

### If Build Fails with Memory Error:
Set in Vercel project settings → Environment Variables:
- `NODE_OPTIONS` = `--max-old-space-size=4096`

### If Build Fails with Missing Env Vars:
- Check Vercel environment variables are set
- Verify variable names match exactly (case-sensitive)
- Ensure they're set for the correct environment (Production/Preview)

### If Build Fails with TypeScript Errors:
- Check build logs for specific errors
- Temporarily set `typescript.ignoreBuildErrors: false` in `next.config.mjs` to see errors
- Fix errors, then set back to `true` if needed

## Files Changed

1. ✅ `package.json` - Simplified build script
2. ✅ `vercel.json` - Added explicit build configuration
3. ✅ `VERCEL_DEPLOYMENT_FIX.md` - This documentation

---

**Status:** ✅ Ready to Deploy
