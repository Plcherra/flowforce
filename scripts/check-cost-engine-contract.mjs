#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const contractPath = join(root, "src/services/costing/costEngineContract.json");
const docsPath = join(root, "docs/cost-engine-canonical-model.md");
const roadmapPath = join(
  root,
  "docs/roadmap/05-inventory-finance-cost-engine.md",
);
const typesPath = join(root, "src/integrations/supabase/types.ts");
const migrationsDir = join(root, "supabase/migrations");

function fail(message) {
  process.stderr.write(`Cost engine contract failed: ${message}\n`);
  process.exit(1);
}

function walkSqlFiles(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return walkSqlFiles(fullPath);
    }

    return entry.endsWith(".sql") ? [fullPath] : [];
  });
}

for (const filePath of [contractPath, docsPath, roadmapPath, typesPath]) {
  if (!existsSync(filePath)) {
    fail(`missing required file: ${filePath.replace(`${root}/`, "")}`);
  }
}

const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const docs = readFileSync(docsPath, "utf8");
const roadmap = readFileSync(roadmapPath, "utf8");
const schemaCorpus = [
  readFileSync(typesPath, "utf8"),
  ...walkSqlFiles(migrationsDir).map((filePath) =>
    readFileSync(filePath, "utf8"),
  ),
].join("\n");

const requiredTopLevelKeys = [
  "sourceOfTruth",
  "precision",
  "components",
  "plannedArtifacts",
  "tenantRules",
  "permissionRules",
];

for (const key of requiredTopLevelKeys) {
  if (!(key in contract)) {
    fail(`contract missing top-level key: ${key}`);
  }
}

if (!Array.isArray(contract.components) || contract.components.length < 6) {
  fail("contract must define at least six cost components");
}

for (const component of contract.components) {
  for (const key of ["key", "label", "definition", "formula", "tables"]) {
    if (!component[key]) {
      fail(`component ${component.key ?? "unknown"} missing ${key}`);
    }
  }

  if (!docs.includes(component.key) || !docs.includes(component.label)) {
    fail(`docs missing component ${component.key}`);
  }

  if (!docs.includes(component.formula)) {
    fail(`docs missing formula for ${component.key}`);
  }

  for (const [table, fields] of Object.entries(component.tables)) {
    if (!schemaCorpus.includes(table)) {
      fail(`schema corpus missing table ${table} for ${component.key}`);
    }

    if (!docs.includes(table)) {
      fail(`docs missing table ${table} for ${component.key}`);
    }

    for (const field of fields) {
      if (!schemaCorpus.includes(field)) {
        fail(
          `schema corpus missing field ${table}.${field} for ${component.key}`,
        );
      }

      if (!docs.includes(field)) {
        fail(`docs missing field ${table}.${field} for ${component.key}`);
      }
    }
  }
}

for (const value of [
  contract.sourceOfTruth.tenant,
  contract.sourceOfTruth.currency,
  contract.precision.databaseType,
  String(contract.precision.calculationScale),
  String(contract.precision.displayScale),
]) {
  if (!docs.includes(value)) {
    fail(`docs missing source/precision value: ${value}`);
  }
}

for (const artifactType of ["views", "rpcs"]) {
  const artifacts = contract.plannedArtifacts?.[artifactType] ?? [];
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    fail(`plannedArtifacts.${artifactType} must not be empty`);
  }

  for (const artifact of artifacts) {
    if (!docs.includes(artifact)) {
      fail(`docs missing planned artifact ${artifact}`);
    }

    const definitionPatterns =
      artifactType === "views"
        ? [
            `view public.${artifact}`,
            `view if not exists public.${artifact}`,
            `view public."${artifact}"`,
            `view if not exists public."${artifact}"`,
          ]
        : [`function public.${artifact}`, `function public."${artifact}"`];

    if (!definitionPatterns.some((pattern) => schemaCorpus.includes(pattern))) {
      fail(
        `schema corpus missing ${artifactType.slice(0, -1)} definition for planned artifact ${artifact}`,
      );
    }
  }
}

for (const rule of [...contract.tenantRules, ...contract.permissionRules]) {
  if (!docs.includes(rule)) {
    fail(`docs missing rule: ${rule}`);
  }
}

const phaseOneBlock = roadmap.match(
  /### Phase 1: Canonical Cost Model[\s\S]*?### Phase 2:/,
)?.[0];

if (!phaseOneBlock) {
  fail("roadmap missing Phase 1 block");
}

if (phaseOneBlock.includes("- [ ]")) {
  fail("Phase 1 still has unchecked tasks");
}

if (!phaseOneBlock.includes("docs/cost-engine-canonical-model.md")) {
  fail("Phase 1 status must link canonical model doc");
}

process.stdout.write(
  `OK cost engine contract: ${contract.components.length} components, ${contract.plannedArtifacts.views.length} views, ${contract.plannedArtifacts.rpcs.length} RPCs\n`,
);
