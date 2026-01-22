# Speed Up Next.js Dev Server Startup

## Quick Fix: Use Turbopack (Fastest)

Turbopack is Next.js's new bundler that's **10x faster** than Webpack for dev:

```bash
# Use Turbopack (recommended)
npm run dev:turbo

# Or with more memory
npm run dev:fast
```

## Why Dev Server is Slow

1. **Large codebase** - Many files to compile
2. **Webpack bundling** - Traditional bundler is slower
3. **TypeScript compilation** - Type checking on every change
4. **Many redirects** - 25+ redirects in next.config.mjs
5. **Heavy dependencies** - Many Radix UI components, Supabase, etc.

## Optimizations Applied

### 1. Next.js Config Optimizations (`next.config.mjs`)
- ✅ Faster webpack dev builds (disabled chunk splitting)
- ✅ Faster source maps (`eval-cheap-module-source-map`)
- ✅ Package import optimization for common libraries
- ✅ Turbopack support enabled

### 2. New NPM Scripts
- `npm run dev:turbo` - Use Turbopack (much faster)
- `npm run dev:fast` - Turbopack with more memory

## Performance Comparison

| Method | Startup Time | HMR Speed |
|--------|-------------|-----------|
| `npm run dev` (Webpack) | ~30-60s | Slow |
| `npm run dev:turbo` | ~5-10s | Fast |

## Additional Speed Tips

### 1. Clean Caches Regularly
```bash
rm -rf .next node_modules/.cache
```

### 2. Disable TypeScript Checking in Dev (if needed)
Already set in `next.config.mjs`:
```js
typescript: {
  ignoreBuildErrors: true, // Only affects build, not dev
}
```

### 3. Use Environment Variables
Make sure `.env.local` exists to avoid config errors:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 4. Reduce Initial Page Load
The root page (`app/page.tsx`) loads many landing components. Consider:
- Lazy loading heavy components
- Code splitting for landing page sections

### 5. Check for Heavy Imports
Look for:
- Large libraries imported at root level
- Synchronous file operations
- Database connections in server components

## Troubleshooting

### If Turbopack Fails
```bash
# Fall back to Webpack
npm run dev
```

### If Still Slow After Turbopack
1. Check Node version: `node -v` (should be 18+)
2. Check available memory: `node --max-old-space-size=4096`
3. Close other applications
4. Check for port conflicts: `lsof -i :3000`

### Monitor Startup Time
```bash
# Time the startup
time npm run dev:turbo
```

## Expected Results

After optimizations:
- **First startup**: 5-15 seconds (with Turbopack)
- **Subsequent startups**: 3-8 seconds (with cache)
- **HMR (Hot Module Replacement)**: <1 second

## Next Steps

1. **Try Turbopack first**: `npm run dev:turbo`
2. **If issues occur**: Report them and use `npm run dev` as fallback
3. **Monitor performance**: Check terminal output for compilation times
