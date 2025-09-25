// src/server/copilot/rules-loader.ts
// Loads and caches active rulesets. Replace in-memory stub with DB access later.

export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type Area = 'FOH' | 'BOH';

export interface ScheduleRules {
  // Example: hard caps per area/day
  caps?: Partial<Record<Area, Partial<Record<Weekday, { min?: number; max?: number }>>>>;
  // Example: certain roles must have open/close capability
  requireCloser?: boolean;
  // Example: disallow trainees alone for some roles/areas
  traineeMustBePaired?: boolean;
}

export interface InventoryRules {
  // Maximum daily prep per item (by itemId)
  maxDailyPrepByItem?: Record<string, number>;
  // Warn when expiration within N days
  expiryWarningDays?: number;
  // Default unit map (e.g., itemId -> 'kg' | 'lb' | 'oz' | 'g')
  defaultUnits?: Record<string, string>;
}

export interface AvailabilityRules {
  submissionDeadline?: string; // e.g., 'ThuT18:00' (org-local time semantics)
  maxWeeklyHours?: number;
  minRestBetweenShiftsHours?: number;
}

export interface Ruleset {
  orgId: string;
  locationId?: string; // if scoped per location
  version: string;
  schedule?: ScheduleRules;
  inventory?: InventoryRules;
  availability?: AvailabilityRules;
  updatedAt: string; // ISO timestamp
}

// ---- In-memory cache (replace with DB-backed cache later) ----
const cache = new Map<string, Ruleset>(); // key = orgId|locationId

function cacheKey(orgId: string, locationId?: string) {
  return `${orgId}|${locationId ?? 'org'}`;
}

// Default ruleset (safe, conservative). Adjust after wiring your Rules page.
const DEFAULT_RULESET: Ruleset = {
  orgId: 'default',
  version: 'v0',
  updatedAt: new Date().toISOString(),
  schedule: {
    caps: {
      FOH: {
        Mon: { max: 6 },
        Tue: { max: 6 },
        Wed: { max: 6 },
        Thu: { max: 6 },
        Fri: { max: 7 },
        Sat: { max: 9 },
        Sun: { max: 9 },
      },
      BOH: {
        Mon: { max: 6 },
        Tue: { max: 6 },
        Wed: { max: 6 },
        Thu: { max: 6 },
        Fri: { max: 7 },
        Sat: { max: 10 },
        Sun: { max: 10 },
      },
    },
    requireCloser: true,
    traineeMustBePaired: true,
  },
  inventory: {
    expiryWarningDays: 2,
    maxDailyPrepByItem: {},
    defaultUnits: {},
  },
  availability: {
    submissionDeadline: 'ThuT18:00',
    maxWeeklyHours: 60,
    minRestBetweenShiftsHours: 10,
  },
};

/**
 * Load active ruleset for an org/location.
 * Replace with a DB call (e.g., Supabase) and populate cache.
 */
export async function loadActiveRuleset(orgId: string, locationId?: string): Promise<Ruleset> {
  const key = cacheKey(orgId, locationId);
  const existing = cache.get(key);
  if (existing) return existing;

  // TODO: Replace with DB fetch:
  // const rs = await db.selectActiveRuleset({ orgId, locationId });
  // cache.set(key, rs);
  // return rs;

  // For now, return a cloned DEFAULT_RULESET but scoped to org/location
  const rs: Ruleset = {
    ...DEFAULT_RULESET,
    orgId,
    locationId,
    updatedAt: new Date().toISOString(),
  };
  cache.set(key, rs);
  return rs;
}

/** Allows the Rules Editor to push an updated ruleset in-memory (until DB is wired). */
export async function setActiveRuleset(ruleset: Ruleset) {
  const key = cacheKey(ruleset.orgId, ruleset.locationId);
  cache.set(key, ruleset);
}

/** Clear cache (for tests or hot reload). */
export function clearRulesCache() {
  cache.clear();
}