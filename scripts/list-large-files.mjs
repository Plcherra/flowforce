#!/usr/bin/env node
// List largest files under src by line count. Exit non-zero if any file exceeds threshold.
import { execSync } from 'child_process';
import path from 'path';

const root = process.cwd();
const threshold = parseInt(process.env.MAX_LINES || '1200', 10);

try {
  const cmd = `git ls-files 'src' | xargs -I{} wc -l {} | sort -rn`;
  const out = execSync(cmd, { cwd: root }).toString();
  console.log(out);

  const big = out.split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const [count, ...fileParts] = l.split(/\s+/);
      return { count: parseInt(count, 10), path: fileParts.join(' ') };
    })
    .filter(x => x.count >= threshold);

  if (big.length) {
    console.error(`Files exceeding ${threshold} lines:`);
    big.forEach(f => console.error(`${f.count}\t${f.path}`));
    process.exit(2);
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}
