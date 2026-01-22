// Minimal test to see if Next.js can even start
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Minimal Next.js Test ===');
console.log('Directory:', __dirname);

if (!existsSync(join(__dirname, 'package.json'))) {
  console.error('❌ package.json not found!');
  process.exit(1);
}

console.log('✓ Found package.json');
console.log('Starting Next.js dev server...\n');

const child = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'pipe',
  shell: true,
});

let hasOutput = false;
let outputLines = [];

child.stdout.on('data', (data) => {
  const text = data.toString();
  hasOutput = true;
  outputLines.push(text);
  process.stdout.write(text);
  
  // Check for success indicators
  if (text.includes('Local:') || text.includes('ready') || text.includes('compiled')) {
    console.log('\n✅ Server started successfully!');
    setTimeout(() => {
      child.kill();
      process.exit(0);
    }, 2000);
  }
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  outputLines.push(text);
  process.stderr.write(text);
  
  // Check for errors
  if (text.includes('Error') || text.includes('error') || text.includes('Failed')) {
    console.log('\n❌ Error detected!');
  }
});

child.on('error', (error) => {
  console.error('❌ Failed to start process:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`\n❌ Process exited with code ${code}`);
    if (!hasOutput) {
      console.log('No output received - process may have failed to start');
    }
  }
});

// Timeout after 30 seconds
setTimeout(() => {
  if (child.killed) return;
  
  console.log('\n⏱️  Timeout after 30 seconds');
  console.log('\n=== Output Summary ===');
  const fullOutput = outputLines.join('');
  console.log(fullOutput.substring(0, 1000));
  
  child.kill();
  process.exit(1);
}, 30000);
