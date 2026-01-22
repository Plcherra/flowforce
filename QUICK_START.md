# Quick Start - Fast Dev Server

## 🚀 Fastest Way to Start

```bash
npm run dev:turbo
```

This uses **Turbopack** which is 10x faster than the default Webpack bundler.

## 📋 All Available Commands

| Command | Description | Speed |
|---------|-------------|-------|
| `npm run dev:turbo` | **Fastest** - Uses Turbopack | ⚡⚡⚡ |
| `npm run dev:fast` | Turbopack + more memory | ⚡⚡⚡ |
| `npm run dev` | Standard Webpack (slower) | ⚡ |

## 🔧 If Dev Server Hangs

1. **Kill port 3000**:
   ```bash
   lsof -ti :3000 | xargs kill -9
   ```

2. **Clean caches**:
   ```bash
   rm -rf .next node_modules/.cache
   ```

3. **Try again**:
   ```bash
   npm run dev:turbo
   ```

## 📊 Performance

- **Turbopack**: 5-15 seconds startup
- **Webpack**: 30-60 seconds startup

## ⚠️ Troubleshooting

### Turbopack not working?
```bash
npm run dev  # Fallback to Webpack
```

### Still slow?
1. Check Node version: `node -v` (need 18+)
2. Check memory: Close other apps
3. Check for errors: Look at terminal output

## 📚 More Info

- See `SPEED_UP_DEV.md` for detailed optimizations
- See `NEXTJS_HANG_FIX.md` for hang troubleshooting
