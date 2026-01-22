// Simple test to see if Next.js can start
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting Next.js dev server test...');
console.log('Working directory:', __dirname);

const child = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

let output = '';
let errorOutput = '';

child.stdout?.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
  if (text.includes('Local:') || text.includes('ready')) {
    console.log('\n✅ Server started successfully!');
    child.kill();
    process.exit(0);
  }
});

child.stderr?.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  process.stderr.write(text);
});

child.on('error', (error) => {
  console.error('Failed to start process:', error);
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('\n⏱️  Timeout after 30 seconds');
  console.log('Output so far:', output.substring(0, 500));
  console.log('Errors so far:', errorOutput.substring(0, 500));
  child.kill();
  process.exit(1);
}, 30000);
