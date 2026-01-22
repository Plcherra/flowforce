# iCloud Sync Issues - Fix Guide

## Problem

Files in iCloud Drive can appear to exist but aren't fully downloaded locally, causing:
- Empty JSON files (EOF errors)
- Missing node_modules
- Package.json parsing errors

## Quick Fixes

### 1. Reinstall Dependencies
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### 2. Download All Files from iCloud
The locale JSON files might be empty because they're not downloaded yet. In Finder:
1. Right-click on the project folder
2. Select "Download Now" (if available)
3. Or wait for iCloud to sync

### 3. Check File Sizes
```bash
# Check if files are actually empty
ls -lh src/locales/*.json
```

If files show 0 bytes, they need to be downloaded from iCloud.

### 4. Verify lucide-react Installation
```bash
npm list lucide-react
```

If not installed:
```bash
npm install lucide-react
```

## Permanent Solution

### Option 1: Move Project Out of iCloud
```bash
# Move to a local directory
mv "/Users/pedromartins/Library/Mobile Documents/com~apple~CloudDocs/Documents/Documents - Pedro's MacBook Air - 1/FlowForce" ~/Projects/FlowForce
```

### Option 2: Exclude node_modules from iCloud
Add to `.gitignore` (if using git) or use iCloud settings to exclude the folder.

### Option 3: Use Local Development Directory
Keep the project in a local directory (like `~/Projects/`) and only sync code files, not `node_modules` or `.next`.

## Current Errors

1. **lucide-react not found** - Need to run `npm install`
2. **Empty JSON files** - Files not downloaded from iCloud yet
3. **package.json parsing** - Might be corrupted or not synced

## Immediate Actions

1. Run: `npm install` to ensure all dependencies are installed
2. Check if locale files are empty: `ls -lh src/locales/*.json`
3. If empty, wait for iCloud sync or manually download them
4. Restart dev server: `npm run dev`
