#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const inventoryPath = join(
  cwd,
  "src/app-shell/navigation/moduleRouteInventory.json",
);
const navigationPath = join(cwd, "src/data/navigationData.tsx");
const smokePath = join(cwd, "scripts/smoke-visible-modules.mjs");

const allowedStatuses = new Set(["production", "beta", "hidden", "deprecated"]);

function fail(message) {
  process.stderr.write(`Visible module inventory contract failed: ${message}\n`);
  process.exit(1);
}

function normalizePath(path) {
  const [rawPath] = String(path || "").split("?");
  let normalized = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  if (!normalized.startsWith("/app")) {
    normalized = normalized === "/" ? "/app" : `/app${normalized}`;
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function toSortedUnique(values) {
  return [...new Set(values)].sort();
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return walkFiles(fullPath);
    }

    return [fullPath];
  });
}

function appPageFileToRoute(filePath) {
  const appDir = join(cwd, "app/app");
  const relative = filePath.slice(appDir.length).replace(/\\/g, "/");
  const route = relative.replace(/\/page\.tsx$/, "") || "/";
  return normalizePath(route === "/" ? "/app" : `/app${route}`);
}

function assertSameSet(actual, expected, label) {
  const actualOnly = actual.filter((value) => !expected.includes(value));
  const expectedOnly = expected.filter((value) => !actual.includes(value));

  if (actualOnly.length || expectedOnly.length) {
    fail(
      `${label} mismatch\n` +
        `  unexpected: ${actualOnly.join(", ") || "none"}\n` +
        `  missing: ${expectedOnly.join(", ") || "none"}`,
    );
  }
}

if (!existsSync(inventoryPath)) {
  fail("missing src/app-shell/navigation/moduleRouteInventory.json");
}

const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
const routes = Array.isArray(inventory.routes) ? inventory.routes : [];

if (routes.length === 0) {
  fail("inventory must contain routes");
}

const paths = routes.map((route) => route.path);
const duplicatePaths = paths.filter((path, index) => paths.indexOf(path) !== index);
if (duplicatePaths.length) {
  fail(`duplicate route inventory paths: ${toSortedUnique(duplicatePaths).join(", ")}`);
}

for (const route of routes) {
  if (!route.label || !route.path || !route.owner) {
    fail(`route entries require label, path, and owner: ${JSON.stringify(route)}`);
  }

  if (!allowedStatuses.has(route.status)) {
    fail(`${route.path} has invalid status "${route.status}"`);
  }

  if (route.sidebar && route.status !== "production") {
    fail(`${route.path} is visible in sidebar but is not production`);
  }

  if (route.smoke && route.status !== "production") {
    fail(`${route.path} is in smoke tests but is not production`);
  }
}

const sidebarRoutes = toSortedUnique(
  routes.filter((route) => route.sidebar).map((route) => normalizePath(route.path)),
);

const smokeRoutes = toSortedUnique(
  routes.filter((route) => route.smoke).map((route) => normalizePath(route.path)),
);

assertSameSet(smokeRoutes, sidebarRoutes, "smoke routes and production sidebar routes");

const navigationText = readFileSync(navigationPath, "utf8");
const navigationHrefMatches = [...navigationText.matchAll(/href:\s*"([^"]+)"/g)];
const navigationRoutes = toSortedUnique([
  "/app/dashboard",
  ...navigationHrefMatches.map((match) => normalizePath(match[1])),
]);

assertSameSet(navigationRoutes, sidebarRoutes, "static sidebar navigation and inventory");

const smokeText = readFileSync(smokePath, "utf8");
if (!smokeText.includes("moduleRouteInventory.json")) {
  fail("smoke-visible-modules must read moduleRouteInventory.json");
}

const discoveredAppRoutes = toSortedUnique(
  walkFiles(join(cwd, "app/app"))
    .filter((filePath) => filePath.endsWith("/page.tsx"))
    .map(appPageFileToRoute),
);
const inventoryAppRoutes = toSortedUnique(
  routes.map((route) => normalizePath(route.path)),
);

assertSameSet(
  inventoryAppRoutes,
  discoveredAppRoutes,
  "app/app page routes and visible module inventory",
);

process.stdout.write(
  `OK visible module inventory contract: ${sidebarRoutes.length} production routes, ${routes.length} inventoried routes\n`,
);
