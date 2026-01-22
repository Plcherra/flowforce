# Fix: Next.js Not Compiling / Hanging on Startup

## Root Cause

The dev server was hanging because `app/api/_server/supabaseAdmin.ts` was **throwing an error during module initialization** if environment variables were missing. Next.js scans API routes during startup, and this error prevented the server from starting.

## Fix Applied

Changed `supabaseAdmin.ts` to use **lazy initialization** with a Proxy pattern:
- ✅ No error thrown during module load
- ✅ Error only thrown when actually used (at runtime)
- ✅ Allows dev server to start even without env vars
- ✅ Still throws helpful error when API routes try to use it

## Quick Test

1. **Clean caches**:
   ```bash
   rm -rf .next node_modules/.cache
   ```

2. **Start dev server**:
   ```bash
   npm run dev
   # or
   npm run dev:turbo
   ```

3. **Check if it compiles** - You should see:
   ```
   ▲ Next.js 16.0.5
   - Local:        http://localhost:3000
   ```

## If Still Not Working

### 1. Check for Other Blocking Issues
```bash
# Run with verbose logging
NEXT_VERBOSE=1 npm run dev 2>&1 | tee dev.log
```

### 2. Check Environment Variables
```bash
# Run diagnostic
./diagnose-nextjs-hang.sh
```

### 3. Try Minimal Config
Temporarily rename `next.config.mjs` to test:
```bash
mv next.config.mjs next.config.mjs.bak
npm run dev
# If it works, the issue is in the config
mv next.config.mjs.bak next.config.mjs
```

### 4. Check for Circular Dependencies
```bash
# Install madge if needed
npm install -g madge
madge --circular --extensions ts,tsx app/ src/
```

### 5. Check Node/Next.js Compatibility
```bash
node -v  # Should be 18+
npm list next  # Should show 16.0.5
```

## Expected Behavior After Fix

✅ Dev server starts in 5-15 seconds  
✅ Compiles successfully  
✅ localhost:3000 is accessible  
✅ API routes work (if env vars are set)  
⚠️ API routes will error if env vars missing (but server still starts)

## Environment Variables Needed

For API routes to work, create `.env.local`:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# OR
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Related Fixes

- `src/lib/config.ts` - Safe config loading (already fixed)
- `src/integrations/supabase/client.ts` - Safe client creation (already fixed)
- `app/api/_server/supabaseAdmin.ts` - **This fix** - Lazy initialization
