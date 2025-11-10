#!/usr/bin/env ts-node
import { promises as fs } from 'fs';
import path from 'path';

async function main() {
  const migrationPath = path.join('supabase', 'migrations', '20251101090000_calendar_events.sql');
  try {
    await fs.access(migrationPath);
    console.log(`✅ Found required migration: ${migrationPath}`);
  } catch {
    console.error(`❌ Missing migration ${migrationPath}. Please run calendar provisioning SQL before building.`);
    process.exit(1);
  }
}

main();
