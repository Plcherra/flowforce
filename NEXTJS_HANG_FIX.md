# Next.js Dev Server Hang - Diagnostic & Fix Guide

## Quick Fix Commands

Run these commands in order:

### 1. Check Node Version
```bash
node -v
# Should be Node 18+ for Next.js 16
```

### 2. Check if Port 3000 is in Use
```bash
lsof -i :3000
# If something is using it, kill it:
lsof -ti :3000 | xargs kill -9
```

### 3. Clean Caches
```bash
rm -rf .next node_modules/.cache
npm install
```

### 4. Run with Verbose Logging
```bash
NEXT_VERBOSE=1 npm run dev
```

### 5. Run with Turbo (Next.js 14+)
```bash
npm run dev -- --turbo
```

### 6. Run in Debug Mode
```bash
node --inspect ./node_modules/next/dist/bin/next dev
# Then open Chrome DevTools at chrome://inspect
```

## Automated Diagnostic Scripts

Two scripts have been created:

### Run Diagnostic
```bash
./diagnose-nextjs-hang.sh
```

This will check:
- Node version
- Port 3000 usage
- Build artifacts
- Environment variables
- Next.js version
- Common issues

### Run Cleanup
```bash
./fix-nextjs-hang.sh
```

This will:
- Kill processes on port 3000
- Remove `.next` directory
- Remove `node_modules/.cache`
- Clean Next.js cache

## Code Fixes Applied

### 1. Safe Config Loading (`src/lib/config.ts`)
**Problem**: `requireEnv()` throws errors during module initialization if env vars are missing, causing the dev server to hang.

**Fix**: Changed to log warnings on server-side instead of throwing, allowing the dev server to start even with missing env vars.

### 2. Safe Supabase Client (`src/integrations/supabase/client.ts`)
**Problem**: Supabase client creation fails if env vars are missing.

**Fix**: Added placeholder values and warning logs when credentials are missing, preventing hangs during initialization.

### 3. Debug Logging (`app/layout.tsx` & `app/providers.tsx`)
**Added**: Console logs to track where the initialization might be hanging.

## Environment Variables Required

Make sure you have a `.env.local` file with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# OR
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# For API routes
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Common Causes & Solutions

### Cause 1: Missing Environment Variables
**Symptom**: Server hangs during module initialization
**Solution**: Create `.env.local` with required variables (see above)

### Cause 2: Port 3000 Already in Use
**Symptom**: "Port 3000 is already in use" error
**Solution**: 
```bash
lsof -ti :3000 | xargs kill -9
# Or use a different port:
npm run dev -- -p 3001
```

### Cause 3: Corrupted Build Cache
**Symptom**: Server hangs on "Compiling..."
**Solution**: 
```bash
rm -rf .next node_modules/.cache
npm run dev
```

### Cause 4: Slow Server-Side Code
**Symptom**: Server hangs after "Compiling..." completes
**Solution**: Check for:
- Database connections in `layout.tsx` or `page.tsx`
- Heavy computations in server components
- Synchronous file I/O operations

### Cause 5: Webpack/Turbopack Issues
**Symptom**: Hangs during compilation
**Solution**: 
```bash
# Try with Turbo:
npm run dev -- --turbo
# Or disable Turbo:
npm run dev -- --no-turbo
```

## Next Steps After Fixes

1. **Check the console output** - The debug logs will show where initialization happens
2. **Verify environment variables** - Run `./diagnose-nextjs-hang.sh` to check
3. **Try clean start** - Run `./fix-nextjs-hang.sh` then `npm run dev`
4. **Check for slow operations** - Look for any database calls or heavy computations in server components

## If Still Hanging

1. Check browser console for client-side errors
2. Check terminal for server-side errors
3. Run with `NEXT_VERBOSE=1` to see detailed Next.js logs
4. Use `node --inspect` to debug with Chrome DevTools
5. Check if any API routes are being called during build (they shouldn't be)

## Update Next.js (if needed)

If you're on an older version:

```bash
npm install next@latest react@latest react-dom@latest
```

Current project uses Next.js 16.0.5, which is the latest.
