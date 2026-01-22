# Quick Debug Guide

## Run This First

```bash
chmod +x run-debug.sh
./run-debug.sh
```

This script will:
1. ✅ Clean up processes and caches
2. ✅ Check your environment
3. ✅ Check for TypeScript errors
4. ✅ Try to start the server
5. ✅ Show you exactly what's happening

## If That Doesn't Work

### Option 1: Manual Debug with Verbose Logging

```bash
# Clean everything
pkill -f "next dev"
rm -rf .next node_modules/.cache

# Start with maximum verbosity
NEXT_VERBOSE=1 npm run dev 2>&1 | tee debug.log
```

Wait 30 seconds, then check `debug.log` for errors.

### Option 2: Check TypeScript Errors

```bash
npm run typecheck
```

This will show any syntax or type errors that prevent compilation.

### Option 3: Try Turbopack

```bash
npm run dev:turbo
```

Turbopack is faster and sometimes works when Webpack doesn't.

### Option 4: Minimal Test

```bash
node test-minimal-next.mjs
```

This tests if Next.js can start at all.

## Common Issues & Fixes

### Issue: "Cannot find module"
- Check `tsconfig.json` paths
- Verify imports use correct paths
- Run `npm install` to ensure dependencies are installed

### Issue: Syntax Error
- Run `npm run typecheck` to find it
- Check the file mentioned in the error

### Issue: Hangs During Compilation
- Check for circular dependencies
- Look for blocking operations (database connections, file reads)
- Check webpack config in `next.config.mjs`

### Issue: Port 3000 Already in Use
```bash
lsof -ti :3000 | xargs kill -9
```

## What Success Looks Like

You should see:
```
▲ Next.js 16.0.5
- Local:        http://localhost:3000

✓ Ready in 2.5s
```

Then you can open http://localhost:3000 in your browser.

## Still Stuck?

1. Check `debug.log` (if you created it)
2. Check `/tmp/nextjs-output.log` (from run-debug.sh)
3. Share the error messages you see
