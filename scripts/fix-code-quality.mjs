#!/usr/bin/env node
/**
 * Code Quality Fix Script
 * 
 * Systematically fixes:
 * 1. Replaces console.log/error/warn with structured logging
 * 2. Replaces 'any' types with 'unknown' where safe
 * 
 * Usage: node scripts/fix-code-quality.mjs [--dry-run] [--file=path]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_FILE = process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1];

// Files to skip (already fixed or special cases)
const SKIP_FILES = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  '__tests__',
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
]);

// Patterns to replace
const CONSOLE_PATTERNS = [
  {
    pattern: /console\.error\((['"`])([^'"`]+)\1\s*,?\s*([^)]+)?\)/g,
    replacement: (match, quote, message, context) => {
      const contextPart = context ? `, { error: ${context.trim()}, tags: ['error'] }` : ', { tags: ['error'] }';
      return `logger.error(${quote}${message}${quote}${contextPart})`;
    },
  },
  {
    pattern: /console\.warn\((['"`])([^'"`]+)\1\s*,?\s*([^)]+)?\)/g,
    replacement: (match, quote, message, context) => {
      const contextPart = context ? `, { context: ${context.trim()}, tags: ['warning'] }` : ', { tags: ['warning'] }';
      return `logger.warn(${quote}${message}${quote}${contextPart})`;
    },
  },
  {
    pattern: /console\.log\((['"`])([^'"`]+)\1\s*,?\s*([^)]+)?\)/g,
    replacement: (match, quote, message, context) => {
      const contextPart = context ? `, { context: ${context.trim()}, tags: ['info'] }` : ', { tags: ['info'] }';
      return `logger.info(${quote}${message}${quote}${contextPart})`;
    },
  },
];

const ANY_PATTERNS = [
  {
    pattern: /:\s*any\b/g,
    replacement: ': unknown',
    description: 'Type annotations',
  },
  {
    pattern: /\bas any\b/g,
    replacement: 'as unknown',
    description: 'Type assertions',
  },
  {
    pattern: /z\.any\(\)/g,
    replacement: 'z.unknown()',
    description: 'Zod schemas',
  },
];

function shouldSkipFile(filePath) {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

function needsLoggerImport(content) {
  return (
    content.includes('logger.error') ||
    content.includes('logger.warn') ||
    content.includes('logger.info') ||
    content.includes('logger.debug')
  ) && !content.includes("from '@/utils/logger'") && !content.includes('from "@/utils/logger"');
}

function addLoggerImport(content, filePath) {
  // Skip if it's a test file or already has logger
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return content;
  }

  // Find the last import statement
  const importRegex = /^import\s+.*from\s+['"][^'"]+['"];?$/gm;
  const imports = content.match(importRegex) || [];
  
  if (imports.length === 0) {
    // No imports, add at the top
    return `import { logger } from '@/utils/logger';\n${content}`;
  }

  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const afterLastImport = lastImportIndex + lastImport.length;
  
  return (
    content.slice(0, afterLastImport) +
    '\nimport { logger } from '@/utils/logger';' +
    content.slice(afterLastImport)
  );
}

function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return { skipped: true };
  }

  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;
    const changes = [];

    // Replace console statements
    for (const { pattern, replacement } of CONSOLE_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        modified = true;
        changes.push(`Replaced ${matches.length} console statements`);
      }
    }

    // Add logger import if needed
    if (needsLoggerImport(content)) {
      content = addLoggerImport(content, filePath);
      modified = true;
      changes.push('Added logger import');
    }

    // Replace 'any' types (be more careful here)
    for (const { pattern, replacement, description } of ANY_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        // Skip if it's in a comment or string
        const lines = content.split('\n');
        let safeMatches = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (pattern.test(line) && !line.trim().startsWith('//') && !line.includes('//')) {
            // Check if it's in a string
            const inString = (line.match(/['"`]/g) || []).length % 2 !== 0;
            if (!inString) {
              lines[i] = line.replace(pattern, replacement);
              safeMatches++;
            }
          }
        }
        
        if (safeMatches > 0) {
          content = lines.join('\n');
          modified = true;
          changes.push(`Replaced ${safeMatches} ${description}`);
        }
      }
    }

    if (modified && !DRY_RUN) {
      writeFileSync(filePath, content, 'utf-8');
    }

    return {
      modified,
      changes,
      filePath,
    };
  } catch (error) {
    return {
      error: error.message,
      filePath,
    };
  }
}

function findTsFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (!shouldSkipFile(filePath)) {
        findTsFiles(filePath, fileList);
      }
    } else if (stat.isFile() && (extname(file) === '.ts' || extname(file) === '.tsx')) {
      if (!shouldSkipFile(filePath)) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

function main() {
  const srcDir = join(process.cwd(), 'src');
  const files = TARGET_FILE ? [TARGET_FILE] : findTsFiles(srcDir);

  console.log(`Processing ${files.length} files...`);
  if (DRY_RUN) {
    console.log('DRY RUN MODE - No files will be modified\n');
  }

  const results = {
    modified: [],
    skipped: [],
    errors: [],
  };

  for (const file of files) {
    const result = processFile(file);
    if (result.error) {
      results.errors.push(result);
    } else if (result.skipped) {
      results.skipped.push(file);
    } else if (result.modified) {
      results.modified.push(result);
    }
  }

  console.log('\n=== Results ===');
  console.log(`Modified: ${results.modified.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  console.log(`Errors: ${results.errors.length}`);

  if (results.modified.length > 0) {
    console.log('\n=== Modified Files ===');
    results.modified.forEach(({ filePath, changes }) => {
      console.log(`\n${filePath}:`);
      changes.forEach(change => console.log(`  - ${change}`));
    });
  }

  if (results.errors.length > 0) {
    console.log('\n=== Errors ===');
    results.errors.forEach(({ filePath, error }) => {
      console.log(`${filePath}: ${error}`);
    });
  }
}

main();
