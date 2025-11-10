import type { Page, Route } from '@playwright/test';

const SUPABASE_URL = 'https://wvkfhprjpegjyzktyueh.supabase.co';
const AUTH_STORAGE_KEY = 'sb-wvkfhprjpegjyzktyueh-auth-token';
const TEST_USER_ID = '00000000-0000-0000-0000-0000000e2e01';
const TEST_COMPANY_ID = 'company-e2e';
const ISO_TIMESTAMP = '2024-01-01T00:00:00.000Z';

export type CertificationScenario = 'load' | 'empty' | 'error' | 'cta';

interface TableDataset {
  certification_catalog?: unknown[];
  certification_progress?: unknown[];
  tasks?: unknown[];
  goal_participants?: unknown[];
  goals?: unknown[];
  skill_matrix?: unknown[];
  learning_course_progress?: unknown[];
  employee_badge?: unknown[];
  profiles?: unknown[];
}

const baseTables: TableDataset = {
  profiles: [
    {
      id: TEST_USER_ID,
      role: 'operations_manager',
      company_id: TEST_COMPANY_ID,
    },
  ],
  certification_progress: [],
  tasks: [],
  goal_participants: [],
  goals: [],
  skill_matrix: [
    {
      employee_id: TEST_USER_ID,
      role: 'operations_manager',
      level: 1,
      xp: 0,
    },
  ],
  learning_course_progress: [],
  employee_badge: [],
};

const scenarioTables: Record<CertificationScenario, TableDataset & { errorTables?: string[] }> = {
  load: {
    certification_catalog: [
      {
        id: 'cert-1',
        code: 'CX-101',
        title: 'Customer Excellence Mastery',
        description: 'Complete the customer excellence path.',
        issuer: 'FlowForce Academy',
        badge_code: 'CX-BADGE',
        requirement_config: {
          tasks: { completed: 3 },
          goals: { completed: 1 },
          xp: { amount: 100 },
          courses: { codes: ['LC-101'] },
        },
        xp_reward: 0,
        created_at: ISO_TIMESTAMP,
        updated_at: ISO_TIMESTAMP,
        linked_course_id: null,
        unlocks_role: null,
      },
      {
        id: 'cert-2',
        code: 'TEAM-201',
        title: 'Team Leadership Sprint',
        description: 'Guide your team through two key initiatives.',
        issuer: 'FlowForce Academy',
        badge_code: null,
        requirement_config: {
          tasks: { completed: 4 },
        },
        xp_reward: 0,
        created_at: ISO_TIMESTAMP,
        updated_at: ISO_TIMESTAMP,
        linked_course_id: null,
        unlocks_role: null,
      },
    ],
    tasks: [{ id: 'task-1' }, { id: 'task-2' }, { id: 'task-3' }, { id: 'task-4' }],
    goal_participants: [{ goal_id: 'goal-1' }],
    goals: [{ id: 'goal-1' }],
    skill_matrix: [
      {
        employee_id: TEST_USER_ID,
        role: 'operations_manager',
        level: 3,
        xp: 180,
      },
    ],
    learning_course_progress: [{ course_code: 'LC-101', status: 'completed' }],
    employee_badge: [{ badge_code: 'CX-BADGE' }],
  },
  empty: {
    certification_catalog: [],
    tasks: [],
    goal_participants: [],
    goals: [],
    skill_matrix: [
      {
        employee_id: TEST_USER_ID,
        role: 'operations_manager',
        level: 1,
        xp: 0,
      },
    ],
    learning_course_progress: [],
  },
  error: {
    errorTables: ['certification_catalog'],
  },
  cta: {
    certification_catalog: [
      {
        id: 'cert-3',
        code: 'OPS-101',
        title: 'Operations Foundations',
        description: 'Kick off your operations learning path.',
        issuer: 'FlowForce Academy',
        badge_code: null,
        requirement_config: {
          tasks: { completed: 2 },
          xp: { amount: 50 },
        },
        xp_reward: 0,
        created_at: ISO_TIMESTAMP,
        updated_at: ISO_TIMESTAMP,
        linked_course_id: null,
        unlocks_role: null,
      },
      {
        id: 'cert-4',
        code: 'OPS-201',
        title: 'Ops Improver',
        description: 'Advance once you complete starter modules.',
        issuer: 'FlowForce Academy',
        badge_code: null,
        requirement_config: {
          tasks: { completed: 1 },
        },
        xp_reward: 0,
        created_at: ISO_TIMESTAMP,
        updated_at: ISO_TIMESTAMP,
        linked_course_id: null,
        unlocks_role: null,
      },
    ],
    tasks: [],
    goal_participants: [],
    goals: [],
    skill_matrix: [
      {
        employee_id: TEST_USER_ID,
        role: 'operations_manager',
        level: 1,
        xp: 0,
      },
    ],
    learning_course_progress: [],
  },
};

const jsonHeaders = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
};

const corsHeaders = {
  ...jsonHeaders,
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
};

export async function seedSupabaseSession(page: Page) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const userPayload = {
    id: TEST_USER_ID,
    aud: 'authenticated',
    email: 'certifications-e2e@example.com',
    phone: null,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    role: 'authenticated',
    created_at: ISO_TIMESTAMP,
    updated_at: ISO_TIMESTAMP,
  };

  const sessionPayload = {
    currentSession: {
      provider_token: null,
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      expires_at: expiresAt,
      token_type: 'bearer',
      user: userPayload,
    },
    currentUser: userPayload,
    expiresAt,
  };

  await page.addInitScript(
    ({ storageKey, payload }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    { storageKey: AUTH_STORAGE_KEY, payload: sessionPayload },
  );
}

export async function mockCertificationsApi(page: Page, scenario: CertificationScenario) {
  await interceptSupabaseRest(page, scenario);
  await page.route(`${SUPABASE_URL}/auth/v1/*`, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }
    return route.fulfill({ status: 200, body: '{}', headers: jsonHeaders });
  });
  await page.route(`${SUPABASE_URL}/functions/v1/*`, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }
    return route.fulfill({ status: 200, body: JSON.stringify({}), headers: jsonHeaders });
  });
}

async function interceptSupabaseRest(page: Page, scenario: CertificationScenario) {
  await page.route(`${SUPABASE_URL}/rest/v1/*`, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }

    const url = new URL(route.request().url());
    const tableName = url.pathname.split('/').pop() ?? '';

    if (scenarioTables[scenario]?.errorTables?.includes(tableName) && route.request().method() === 'GET') {
      return route.fulfill({
        status: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ message: 'Mock server error' }),
      });
    }

    if (tableName === 'rpc') {
      return fulfillJson(route, []);
    }

    const payload = resolveTablePayload(tableName, scenario);

    if (route.request().method() === 'POST' || route.request().method() === 'PATCH' || route.request().method() === 'PUT') {
      return fulfillJson(route, payload ?? []);
    }

    return fulfillJson(route, payload ?? []);
  });
}

function resolveTablePayload(table: string, scenario: CertificationScenario) {
  const scenarioData = scenarioTables[scenario]?.[table as keyof TableDataset];
  if (scenarioData !== undefined) {
    return scenarioData;
  }
  const baseData = baseTables[table as keyof TableDataset];
  return baseData ?? [];
}

function fulfillJson(route: Route, payload: unknown) {
  return route.fulfill({
    status: 200,
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
}
