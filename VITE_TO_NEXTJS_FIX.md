# Vite to Next.js Migration Fix

## Issues Found

The project still has Vite remnants that might be causing conflicts:

1. ✅ **Package name** - Changed from `vite_react_shadcn_ts` to `flowforce-nextjs`
2. ✅ **tsconfig.json** - Fixed include paths (removed non-existent `lib` and `components`)
3. ⚠️ **Vite dependencies** - Still in devDependencies (vite, @vitejs/plugin-react-swc)
4. ⚠️ **Vite env vars** - Code uses `VITE_` prefix but also supports `NEXT_PUBLIC_`

## Changes Made

### 1. package.json
- Changed name from `vite_react_shadcn_ts` to `flowforce-nextjs`

### 2. tsconfig.json
- Fixed include paths to only include existing directories (`app`, `src`)
- Removed non-existent `lib` and `components` directories

## Optional: Remove Vite Dependencies

If you want to fully remove Vite (since you're using Next.js now):

```bash
npm uninstall vite @vitejs/plugin-react-swc
```

**Note**: Keep `vitest` if you're using it for testing.

## Test Now

```bash
# Clean everything
pkill -f "next dev"
rm -rf .next node_modules/.cache

# Try starting
npm run dev
```

## Why This Matters

The Vite package name and incorrect tsconfig paths might cause:
- Module resolution issues
- TypeScript compilation errors
- Next.js to look in wrong directories

The fixes above should resolve these issues.
