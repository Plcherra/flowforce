import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { dirname, join, relative } from "node:path";
import { performance } from "node:perf_hooks";

const root = process.cwd();
const outputPath =
  process.env.PERF_OUTPUT_FILE ||
  "docs/test-results/performance-load-baseline.json";
const baseUrl = process.env.PERF_BASE_URL;
const endpointList = (
  process.env.PERF_ENDPOINTS || "/api/health,/,/auth,/app"
)
  .split(",")
  .map((endpoint) => endpoint.trim())
  .filter(Boolean);
const loadEndpoint = process.env.PERF_LOAD_ENDPOINT || "/api/health";
const loadRequests = Number(process.env.PERF_LOAD_REQUESTS || 25);
const loadConcurrency = Number(process.env.PERF_LOAD_CONCURRENCY || 5);
const timeoutMs = Number(process.env.PERF_TIMEOUT_MS || 10_000);

function walkFiles(directory) {
  try {
    const entries = readdirSync(directory, { withFileTypes: true });
    return entries.flatMap((entry) => {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) return walkFiles(absolutePath);
      if (!entry.isFile()) return [];
      return [absolutePath];
    });
  } catch (_error) {
    return [];
  }
}

function sizeSummary(directory) {
  const absoluteDirectory = join(root, directory);
  const files = walkFiles(absoluteDirectory);
  const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
  const largestFiles = files
    .map((file) => ({
      path: relative(root, file),
      bytes: statSync(file).size,
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10);

  return {
    directory,
    totalBytes,
    totalMb: Number((totalBytes / 1024 / 1024).toFixed(2)),
    fileCount: files.length,
    largestFiles,
  };
}

function requestUrl(url) {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const client = url.startsWith("https:") ? https : http;
    const request = client.get(url, { timeout: timeoutMs }, (response) => {
      response.resume();
      response.on("end", () => {
        resolve({
          url,
          status: response.statusCode || 0,
          durationMs: Math.round(performance.now() - startedAt),
          ok: (response.statusCode || 0) >= 200 && (response.statusCode || 0) < 400,
        });
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error(`timeout after ${timeoutMs}ms`));
    });

    request.on("error", (error) => {
      resolve({
        url,
        status: 0,
        durationMs: Math.round(performance.now() - startedAt),
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });
}

function percentile(values, point) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((point / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(0, index)];
}

async function runLoadProbe(url) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < loadRequests) {
      nextIndex += 1;
      results.push(await requestUrl(url));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(loadConcurrency, loadRequests) }, () =>
      worker(),
    ),
  );

  const durations = results.map((result) => result.durationMs);
  const failures = results.filter((result) => !result.ok);

  return {
    url,
    requests: results.length,
    concurrency: loadConcurrency,
    failures: failures.length,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    maxMs: durations.length ? Math.max(...durations) : 0,
    sampleFailures: failures.slice(0, 3),
  };
}

function joinUrl(base, endpoint) {
  const url = new URL(endpoint, base);
  return url.toString();
}

async function main() {
  const build = {
    next: sizeSummary(".next"),
    nextStatic: sizeSummary(".next/static"),
    nextServer: sizeSummary(".next/server"),
  };

  const pageProbes = [];
  let loadProbe = {
    skipped: true,
    reason: "PERF_BASE_URL was not provided.",
  };

  if (baseUrl) {
    for (const endpoint of endpointList) {
      pageProbes.push(await requestUrl(joinUrl(baseUrl, endpoint)));
    }
    loadProbe = await runLoadProbe(joinUrl(baseUrl, loadEndpoint));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: baseUrl || null,
    budgets: {
      nextStaticMbMax: 25,
      nextServerMbMax: 150,
      pageP95MsMax: 2500,
      apiP95MsMax: 500,
      healthLoadP95MsMax: 500,
      healthLoadFailureRateMax: 0,
      pilotConcurrentUsers: 50,
      pilotBurstRequestsPerMinute: 600,
    },
    build,
    pageProbes,
    loadProbe,
    hotQueryFamilies: [
      "company_id-scoped list pages ordered by created_at or updated_at",
      "user_id-scoped task, notification, and scheduling lookups",
      "inventory item/unit/stock joins scoped by company_id",
      "workflow instance and evidence lookups scoped by company_id and status",
      "system_logs warning/error lookups ordered by created_at desc",
    ],
  };

  mkdirSync(dirname(join(root, outputPath)), { recursive: true });
  writeFileSync(join(root, outputPath), `${JSON.stringify(report, null, 2)}\n`);

  const text = readFileSync(join(root, outputPath), "utf8");
  console.log(text);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
