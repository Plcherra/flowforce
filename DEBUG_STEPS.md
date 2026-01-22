# Debug Steps for npm run dev

## Step 1: Run the Debug Script

```bash
./debug-dev-server.sh
```

This will:
- Clean up processes
- Clean caches
- Check environment
- Try to start the server
- Show you exactly what's happening

## Step 2: If Debug Script Doesn't Work

Run manually with verbose logging:

```bash
# Make sure you're in the project directory
cd "/Users/pedromartins/Library/Mobile Documents/com~apple~CloudDocs/Documents/Documents - Pedro's MacBook Air - 1/FlowForce"

# Clean everything
pkill -f "next dev"
rm -rf .next node_modules/.cache

# Start with verbose logging
NEXT_VERBOSE=1 npm run dev 2>&1 | tee dev-output.log
```

Wait 30 seconds, then check `dev-output.log` for errors.

## Step 3: Check for Syntax Errors

I found a syntax error in `app/layout.tsx` - it's been fixed. But check for others:

```bash
npm run typecheck
```

## Step 4: Try Minimal Test

```bash
node test-minimal-next.mjs
```

This will show you if Next.js can start at all.

## Step 5: Check What's Being Imported

The issue might be in the import chain. Check:

1. `app/layout.tsx` → imports `Providers`
2. `app/providers.tsx` → imports `AuthProvider`, `ProfileProvider`, etc.
3. `src/hooks/useAuth.tsx` → imports `supabase` client
4. `src/integrations/supabase/client.ts` → imports config
5. `src/lib/config.ts` → should be safe now

## Common Issues Found

### ✅ Fixed: Syntax Error in layout.tsx
- Had: `if` without condition
- Fixed: Added proper condition check

### ✅ Fixed: supabaseAdmin.ts throwing during init
- Changed to lazy initialization

### ⚠️ Still Need to Check:
- Are there other files throwing during import?
- Is the webpack config causing issues?
- Are there circular dependencies?

## Quick Test Commands

```bash
# Test 1: Can Next.js start at all?
node test-minimal-next.mjs

# Test 2: Check for TypeScript errors
npm run typecheck

# Test 3: Check for circular deps (if madge installed)
madge --circular --extensions ts,tsx app/ src/

# Test 4: Try with minimal config
cp next.config.mjs next.config.mjs.bak
echo "export default {}" > next.config.mjs
npm run dev
# If it works, restore: mv next.config.mjs.bak next.config.mjs
```

## What to Look For

1. **Syntax errors** - Should show in `npm run typecheck`
2. **Module resolution errors** - "Cannot find module" messages
3. **Circular dependencies** - Can cause hangs
4. **Blocking operations** - Database connections, file reads, etc.
5. **Webpack/Turbopack issues** - Try both: `npm run dev` and `npm run dev:turbo`

## Expected Output When Working

```
▲ Next.js 16.0.5
- Local:        http://localhost:3000

✓ Ready in 2.5s
```

If you see this, it's working!
