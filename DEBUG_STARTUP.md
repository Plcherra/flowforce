# Debug: npm run dev Not Working

## Current Status
- Server process starts but doesn't compile
- Port 3000 not listening
- No error messages visible

## Changes Made

### 1. Fixed `app/api/_server/supabaseAdmin.ts`
**Problem**: Threw error during module initialization if env vars missing

**Solution**: 
- If env vars present → create client immediately
- If env vars missing → create Proxy that throws helpful errors only when accessed

## Testing Steps

### Step 1: Clean Everything
```bash
# Kill any running processes
pkill -f "next dev"

# Clean caches
rm -rf .next node_modules/.cache

# Verify port is free
lsof -i :3000
```

### Step 2: Try Starting with Verbose Logging
```bash
NEXT_VERBOSE=1 npm run dev 2>&1 | tee dev-output.log
```

Wait 30 seconds, then check:
- Does it show "Compiling..."?
- Does it show "Local: http://localhost:3000"?
- Any error messages?

### Step 3: Check for Other Issues

#### A. Check Environment Variables
```bash
echo "SUPABASE_URL: ${SUPABASE_URL:-NOT SET}"
echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-NOT SET}"
echo "NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:-NOT SET}"
```

#### B. Check for TypeScript Errors
```bash
npm run typecheck
```

#### C. Check Next.js Version
```bash
npm list next
```

#### D. Try Minimal Config
```bash
# Backup current config
cp next.config.mjs next.config.mjs.bak

# Create minimal config
cat > next.config.mjs << 'EOF'
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
EOF

# Try starting
npm run dev

# Restore config if needed
# mv next.config.mjs.bak next.config.mjs
```

### Step 4: Check for Circular Dependencies
```bash
# Install madge if needed
npm install -g madge

# Check for circular deps
madge --circular --extensions ts,tsx app/ src/
```

### Step 5: Check Node Version
```bash
node -v  # Should be 18+
```

## Common Issues

### Issue 1: Module Resolution
If you see "Cannot find module" errors, check:
- `tsconfig.json` paths are correct
- All imports use correct paths
- No circular dependencies

### Issue 2: Webpack/Turbopack Issues
Try:
```bash
# With Turbopack
npm run dev:turbo

# Without Turbopack (disable in next.config.mjs)
npm run dev
```

### Issue 3: Memory Issues
```bash
# Increase memory
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

### Issue 4: Port Already in Use
```bash
# Kill process on port 3000
lsof -ti :3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

## Next Steps

1. Run the diagnostic script:
   ```bash
   ./diagnose-nextjs-hang.sh
   ```

2. Check the output log:
   ```bash
   cat dev-output.log | tail -50
   ```

3. If still hanging, try:
   ```bash
   # Start with Node inspector
   node --inspect ./node_modules/next/dist/bin/next dev
   # Then open chrome://inspect in Chrome
   ```

## Expected Output

When working, you should see:
```
▲ Next.js 16.0.5
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 2.5s
```

If you see this, the server is working!
