import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/public-types';

export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

type AvailabilityLockMode = Database['public']['Enums']['availability_lock_mode'];
interface OrgPreferenceRow {
  id: string;
  availability_lock_mode: AvailabilityLockMode;
  auto_lock_day_of_week: number;
  auto_lock_hour: number;
}

interface AvailabilityExceptionRow {
  employee_id: string;
  start_date: string;
  end_date: string;
  approved_by: string | null;
}

export type LockState =
  | 'locked'
  | 'open'
  | {
      mode: 'open-with-exceptions';
      exceptEmployeeIds: string[];
    };

interface LockEngineDeps {
  getOrgPref(orgId: string): Promise<OrgPreferenceRow | null>;
  getApprovedExceptions(orgId: string, range: { start: string; end: string }): Promise<AvailabilityExceptionRow[]>;
  hasApprovedException(orgId: string, employeeId: string, date: string): Promise<boolean>;
}

const defaultDeps: LockEngineDeps = {
  async getOrgPref(orgId) {
    const { data, error } = await supabase
      .from('org_prefs')
      .select('id, availability_lock_mode, auto_lock_day_of_week, auto_lock_hour')
      .eq('id', orgId)
      .maybeSingle();

    if (error) {
      console.error('[lockEngine] Failed to fetch org preferences', error);
      throw error;
    }

    return (data as OrgPreferenceRow | null) ?? null;
  },
  async getApprovedExceptions(_orgId, range) {
    const { data, error } = await supabase
      .from('availability_exception')
      .select('employee_id,start_date,end_date,approved_by')
      .lte('start_date', range.end)
      .gte('end_date', range.start)
      .not('approved_by', 'is', null);

    if (error) {
      console.error('[lockEngine] Failed to fetch availability exceptions', error);
      throw error;
    }

    return (data ?? []) as AvailabilityExceptionRow[];
  },
  async hasApprovedException(_orgId, employeeId, date) {
    const { data, error } = await supabase
      .from('availability_exception')
      .select('id')
      .eq('employee_id', employeeId)
      .lte('start_date', date)
      .gte('end_date', date)
      .not('approved_by', 'is', null)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[lockEngine] Failed to check availability exception', error);
      throw error;
    }

    return Boolean(data);
  },
};

const mergeDeps = (overrides?: Partial<LockEngineDeps>): LockEngineDeps => ({
  getOrgPref: overrides?.getOrgPref ?? defaultDeps.getOrgPref,
  getApprovedExceptions: overrides?.getApprovedExceptions ?? defaultDeps.getApprovedExceptions,
  hasApprovedException: overrides?.hasApprovedException ?? defaultDeps.hasApprovedException,
});

const toISODate = (date: Date): string => date.toISOString().slice(0, 10);

const parseISODateUTC = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0));
};

export const startOfIsoWeek = (date: Date): Date => {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const day = result.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  result.setUTCDate(result.getUTCDate() + diff);
  return result;
};

export const addWeeks = (date: Date, weeks: number): Date => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + weeks * 7);
  return result;
};

export const computeAutoLockThreshold = (
  weekStartISO: string,
  prefs: Pick<OrgPreferenceRow, 'auto_lock_day_of_week' | 'auto_lock_hour'>,
): Date => {
  const weekStart = parseISODateUTC(weekStartISO);
  const threshold = new Date(weekStart.getTime());
  const startDow = weekStart.getUTCDay();
  const targetDow = prefs.auto_lock_day_of_week ?? 4; // default Thursday
  let diff = (7 + startDow - targetDow) % 7;
  if (diff === 0) diff = 7; // ensure threshold occurs before week start
  threshold.setUTCDate(threshold.getUTCDate() - diff);
  threshold.setUTCHours(prefs.auto_lock_hour ?? 17, 0, 0, 0);
  return threshold;
};

const buildWeekRange = (weekStartISO: string) => {
  const start = parseISODateUTC(weekStartISO);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 6);
  return { start: toISODate(start), end: toISODate(end) };
};

export async function getLockStateForWeek(
  params: { orgId: string; weekStart: string; deps?: Partial<LockEngineDeps> },
): Promise<LockState> {
  const deps = mergeDeps(params.deps);
  const prefs = await deps.getOrgPref(params.orgId);

  if (!prefs) {
    return 'open';
  }

  const baseMode = prefs.availability_lock_mode;
  const now = new Date();

  let isLocked = false;
  if (baseMode === 'lock') {
    isLocked = true;
  } else if (baseMode === 'auto') {
    const threshold = computeAutoLockThreshold(params.weekStart, prefs);
    isLocked = now >= threshold;
  } else {
    isLocked = false;
  }

  if (!isLocked) {
    return 'open';
  }

  const range = buildWeekRange(params.weekStart);
  const exceptions = await deps.getApprovedExceptions(params.orgId, range);
  const exceptEmployeeIds = Array.from(
    new Set(
      exceptions
        .filter((item) => item.approved_by)
        .map((item) => item.employee_id),
    ),
  );

  if (exceptEmployeeIds.length === 0) {
    return 'locked';
  }

  return {
    mode: 'open-with-exceptions',
    exceptEmployeeIds,
  };
}

export async function allowEdit(params: {
  orgId?: string;
  employeeId: string;
  date: string;
  deps?: Partial<LockEngineDeps>;
}): Promise<boolean> {
  const orgId = params.orgId ?? DEFAULT_ORG_ID;
  const deps = mergeDeps(params.deps);
  const dateISO = params.date;
  const weekStart = toISODate(startOfIsoWeek(parseISODateUTC(dateISO)));

  const state = await getLockStateForWeek({ orgId, weekStart, deps });

  if (state === 'open') {
    return true;
  }

  const hasException = await deps.hasApprovedException(orgId, params.employeeId, dateISO);

  if (state === 'locked') {
    return hasException;
  }

  // open-with-exceptions state
  if (!state.exceptEmployeeIds.includes(params.employeeId)) {
    return false;
  }

  return hasException;
}

export default {
  getLockStateForWeek,
  allowEdit,
  computeAutoLockThreshold,
  startOfIsoWeek,
  addWeeks,
};

export type { LockEngineDeps };
