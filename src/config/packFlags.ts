/**
 * Company pack gates for Ops v1.
 *
 * Operations is the base pack and cannot be turned off. Team, Insights, and
 * Stock default off. A company can turn those on later by setting
 * `system_settings.admin_config.packFlags` — no extra table.
 *
 * Dev and Playwright can override the three optional packs with
 * sessionStorage key `flowforce:pack-flags`. Production builds ignore it
 * unless NEXT_PUBLIC_E2E_PACK_OVERRIDES=1, which release gates set for the
 * local server only.
 */

export const PACK_IDS = ["ops", "team", "insights", "stock"] as const;

export type PackId = (typeof PACK_IDS)[number];

export type OptionalPackId = Exclude<PackId, "ops">;

export type PackFlags = Record<PackId, boolean>;

export const PACK_FLAG_OVERRIDE_STORAGE_KEY = "flowforce:pack-flags";

export const DEFAULT_PACK_FLAGS: PackFlags = {
  ops: true,
  team: false,
  insights: false,
  stock: false,
};

const OPTIONAL_PACKS: OptionalPackId[] = ["team", "insights", "stock"];

const GATED_PREFIXES: { pack: OptionalPackId; prefix: string }[] = [
  { pack: "stock", prefix: "/app/inventory" },
  { pack: "stock", prefix: "/app/expenses" },
  { pack: "stock", prefix: "/app/purchasing" },
  { pack: "stock", prefix: "/app/cookbook" },
  { pack: "stock", prefix: "/app/items-setup" },
  { pack: "stock", prefix: "/app/inventory-actions" },
  { pack: "stock", prefix: "/app/inventory-count-execution" },
  { pack: "insights", prefix: "/app/reports" },
  { pack: "insights", prefix: "/app/analytics" },
  { pack: "insights", prefix: "/app/ai-insights" },
  { pack: "insights", prefix: "/app/operations" },
  { pack: "team", prefix: "/app/performance" },
  { pack: "team", prefix: "/app/recognition" },
  { pack: "team", prefix: "/app/leaderboard" },
  { pack: "team", prefix: "/app/learning-center" },
  { pack: "team", prefix: "/app/certifications" },
  { pack: "team", prefix: "/app/resources" },
];

const DIRECTORY_PATHS = new Set([
  "/app/employees",
  "/app/employee-directory",
]);

export function isPackEnabled(flags: PackFlags, pack: PackId): boolean {
  if (pack === "ops") return true;
  return flags[pack] === true;
}

export function parsePackFlagOverrides(
  value: unknown,
): Partial<Record<OptionalPackId, boolean>> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const source = value as Record<string, unknown>;
  const overrides: Partial<Record<OptionalPackId, boolean>> = {};
  let found = false;

  for (const pack of OPTIONAL_PACKS) {
    if (typeof source[pack] === "boolean") {
      overrides[pack] = source[pack];
      found = true;
    }
  }

  return found ? overrides : null;
}

export function readPackFlagsFromAdminConfig(adminConfig: unknown): PackFlags {
  const root =
    adminConfig && typeof adminConfig === "object" && !Array.isArray(adminConfig)
      ? (adminConfig as Record<string, unknown>).packFlags
      : null;

  return applyPackFlagOverride(DEFAULT_PACK_FLAGS, parsePackFlagOverrides(root));
}

export function applyPackFlagOverride(
  flags: PackFlags,
  override: Partial<Record<OptionalPackId, boolean>> | null,
): PackFlags {
  return {
    ops: true,
    team: override?.team ?? flags.team,
    insights: override?.insights ?? flags.insights,
    stock: override?.stock ?? flags.stock,
  };
}

export function packForNavSection(translationKey: string): OptionalPackId | null {
  if (translationKey === "inventory") return "stock";
  if (translationKey === "analyticsReports") return "insights";
  if (translationKey === "team") return "team";
  return null;
}

function toAppPath(pathname: string): string {
  const withoutQuery = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  let path = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;

  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  if (path !== "/app" && !path.startsWith("/app/")) {
    path = path === "/" ? "/app" : `/app${path}`;
  }

  return path;
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Pack required to open this path. Null means the base Ops pack, including the directory. */
export function packRequiredForPath(pathname: string): OptionalPackId | null {
  const path = toAppPath(pathname);

  if (DIRECTORY_PATHS.has(path) || path.startsWith("/app/employees/")) {
    return null;
  }

  for (const entry of GATED_PREFIXES) {
    if (matchesPrefix(path, entry.prefix)) return entry.pack;
  }

  return null;
}
