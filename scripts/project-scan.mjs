#!/usr/bin/env node
import {execSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';

const sh = (cmd)=>execSync(cmd,{stdio:'pipe'}).toString().trim();

const files = sh('git ls-files "*.ts" "*.tsx" "supabase/functions/**/*.ts" "tests/**/*.ts" 2>/dev/null')
  .split('\n').filter(Boolean);

const statLines = files.map(f=>{
  const loc = readFileSync(f,'utf8').split('\n').length;
  return {file:f, loc};
}).sort((a,b)=>b.loc-a.loc);

const top = statLines.slice(0,40);
const over500 = statLines.filter(x=>x.loc>=500);

const grep = (q)=>{ try { return sh(`grep -RIn --exclude-dir=node_modules '${q}' src supabase tests || true`);} catch {return '';} };

const report = `
# Project Scan

## Largest files (top 40 by LOC)
${top.map(x=>`- ${x.loc.toString().padStart(5)}  ${x.file}`).join('\n')}

## Files ≥ 500 LOC
${over500.map(x=>`- ${x.loc.toString().padStart(5)}  ${x.file}`).join('\n') || '(none)'}

## Contexts detected
${grep('createContext\\(|SchedulingContext|ProfileContext')}

## Consolidated scheduling hook usage
${grep('useSchedulingConsolidated\\(')}

## Legacy scheduling hooks still referenced
${grep('useSchedules\\(|useTimeOffRequests\\(|useUnavailability\\(')}

## Supabase calls (from/rpc/auth)
${grep('from\\(|rpc\\(|auth\\.')}

## Any/ts-ignore hotspots (first 200)
${execSync(`grep -RIn --exclude-dir=node_modules -E '@ts-ignore|\\bany\\b' src | head -n 200 || true`,{stdio:'pipe'}).toString()}
`;
writeFileSync('scan-report.md', report);
console.log('Wrote scan-report.md');
