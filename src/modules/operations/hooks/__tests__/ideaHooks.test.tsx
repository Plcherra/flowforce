import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIdeaInsights } from '../useIdeaInsights';
import { useIdeaDiagnostics } from '../useIdeaDiagnostics';
import { useIdeaActions } from '../useIdeaActions';
import { useIdeaAssessments } from '../useIdeaAssessments';

type SupabaseMock = {
  rpc: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
};

const { rpcMock, fromMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
  },
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: {
      id: 'user-1',
      userId: 'user-1',
      company_id: 'company-1',
    },
    loading: false,
  }),
}));

describe('IDEA hooks', () => {
  const range = { start: new Date('2024-01-01T00:00:00Z'), end: new Date('2024-01-08T00:00:00Z') };

  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads KPI insights from Supabase', async () => {
    rpcMock.mockResolvedValue({
      data: [
        { id: 'sales', label: 'Sales', value: 125000, delta: 5200, trend: 'up', unit: 'USD' },
      ],
      error: null,
    });
    fromMock.mockImplementation(() => ({}));

    const { result } = renderHook(() => useIdeaInsights('company-1', range));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].label).toBe('Sales');
  });

  it('summarises diagnostics from AI endpoint', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    fromMock.mockImplementation(() => ({}));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        evaluation: {
          insights: [
            { id: 'sig-1', message: 'Rising labor cost', severity: 'warning', metadata: { confidence: 0.82 } },
          ],
          recommendedActions: [
            {
              dedupeKey: 'rec-1',
              actionType: 'idea.action.correct',
              confidence: 0.71,
              impacts: [{ metric: 'Labor %', delta: -3 }],
            },
          ],
        },
      }),
    });

    const originalFetch: typeof global.fetch | undefined = global.fetch;
    // @ts-expect-error override fetch for test
    global.fetch = fetchMock;

    const insights = [{ id: 'labor', label: 'Labor %', value: 28, delta: 3, trend: 'up' as const }];
    const { result } = renderHook(() => useIdeaDiagnostics('company-1', insights, range));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data.causes[0].summary).toContain('labor');
    expect(result.current.data.recommendations[0].action).toContain('idea.action.correct');
    expect(fetchMock).toHaveBeenCalledWith(
      '/functions/v1/copilot-service',
      expect.objectContaining({ method: 'POST' }),
    );

    global.fetch = originalFetch as typeof global.fetch;
  });

  it('creates and executes IDEA actions', async () => {
    const actionsStore: any[] = [];
    const cyclesStore: any[] = [{ id: 'cycle-1', stage: 'execute', company_id: 'company-1', range: {} }];

    fromMock.mockImplementation((table: string) => {
      if (table === 'idea_actions') {
        return createIdeaActionsMock(actionsStore);
      }
      if (table === 'idea_cycles') {
        return createIdeaCyclesMock(cyclesStore);
      }
      return {};
    });

    const { result } = renderHook(() => useIdeaActions('company-1', 'cycle-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);

    await act(async () => {
      await result.current.createAction({ action: 'Coach shift leads', recommendationId: 'rec-1' });
    });

    await waitFor(() => expect(result.current.data).toHaveLength(1));

    await act(async () => {
      await result.current.execute({ actionId: result.current.data[0].id });
    });

    await waitFor(() => expect(result.current.data[0].status).toBe('executed'));
  });

  it('evaluates assessments and persists cycle updates', async () => {
    const beforeSnapshot = [
      { id: 'sales', value: 100000, label: 'Sales', unit: 'USD' },
    ];
    const afterSnapshot = [
      { id: 'sales', value: 120000, label: 'Sales', unit: 'USD' },
    ];

    rpcMock.mockImplementation((_fn: string, params: any) => {
      const start = params?.range_start;
      if (start === range.start.toISOString()) {
        return Promise.resolve({ data: afterSnapshot, error: null });
      }
      return Promise.resolve({ data: beforeSnapshot, error: null });
    });

    fromMock.mockImplementation((table: string) => {
      if (table === 'idea_cycles') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: 'cycle-1' }, error: null })) })),
            })),
          })),
        };
      }
      return buildPassthroughActionsMock();
    });

    const insights = afterSnapshot.map((entry) => ({
      id: entry.id,
      label: entry.label,
      value: entry.value,
      delta: entry.value - beforeSnapshot[0].value,
      trend: 'up' as const,
    }));

    const { result } = renderHook(() =>
      useIdeaAssessments('company-1', range, 'cycle-1', insights, true),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data[0].roi).toBe(20);

    await act(async () => {
      await result.current.saveAssessment('Integration test');
    });

    expect(fromMock).toHaveBeenCalledWith('idea_cycles');
  });

  it('progresses through identify, diagnose, execute, and assess stages', async () => {
    let callCount = 0;
    const identifySnapshot = [
      { id: 'sales', label: 'Sales', value: 150000, delta: 5000, trend: 'up', unit: 'USD' },
    ];
    const beforeSnapshot = [
      { id: 'sales', value: 120000, label: 'Sales', unit: 'USD' },
    ];
    const afterSnapshot = [
      { id: 'sales', value: 150000, label: 'Sales', unit: 'USD' },
    ];

    rpcMock.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.resolve({ data: identifySnapshot, error: null });
      }
      if (callCount === 2) {
        return Promise.resolve({ data: beforeSnapshot, error: null });
      }
      return Promise.resolve({ data: afterSnapshot, error: null });
    });

    const actionsStore: any[] = [];
    const cyclesStore: any[] = [];

    fromMock.mockImplementation((table: string) => {
      if (table === 'idea_actions') {
        return createIdeaActionsMock(actionsStore);
      }
      if (table === 'idea_cycles') {
        return createIdeaCyclesMock(cyclesStore);
      }
      return {};
    });

    const insightsHook = renderHook(() => useIdeaInsights('company-99', range));
    await waitFor(() => expect(insightsHook.result.current.loading).toBe(false));
    expect(insightsHook.result.current.data).toHaveLength(1);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        evaluation: {
          insights: [
            { id: 'c-flow', message: 'Product mix shift', severity: 'warning', metadata: { confidence: 0.78 } },
          ],
          recommendedActions: [
            {
              dedupeKey: 'r-flow',
              actionType: 'Launch upsell campaign',
              confidence: 0.74,
              impacts: [{ metric: 'Sales', delta: 5, unit: 'USD' }],
            },
          ],
        },
      }),
    });
    const originalFetch: typeof global.fetch | undefined = global.fetch;
    // @ts-expect-error override fetch for integration test
    global.fetch = fetchMock;

    const diagnosticsHook = renderHook(
      ({ data }) => useIdeaDiagnostics('company-99', data, range),
      { initialProps: { data: [] as ReturnType<typeof useIdeaInsights>['data'] } },
    );

    diagnosticsHook.rerender({ data: insightsHook.result.current.data });
    await waitFor(() => expect(diagnosticsHook.result.current.loading).toBe(false));
    expect(diagnosticsHook.result.current.data.recommendations).toHaveLength(1);

    cyclesStore.push({
      id: 'cycle-1',
      company_id: 'company-99',
      stage: 'execute',
      range: `[${range.start.toISOString()},${range.end.toISOString()})`,
      insights: insightsHook.result.current.data,
      actions: diagnosticsHook.result.current.data.recommendations,
      assessments: null,
    });

    const actionsHook = renderHook(() => useIdeaActions('company-99', 'cycle-1'));
    await waitFor(() => expect(actionsHook.result.current.loading).toBe(false));

    await act(async () => {
      await actionsHook.result.current.createAction({
        action: diagnosticsHook.result.current.data.recommendations[0].action,
        recommendationId: diagnosticsHook.result.current.data.recommendations[0].id,
      });
    });

    await waitFor(() => expect(actionsHook.result.current.data).toHaveLength(1));

    await act(async () => {
      await actionsHook.result.current.execute({ actionId: actionsHook.result.current.data[0].id });
    });

    await waitFor(() => expect(actionsHook.result.current.data[0].status).toBe('executed'));

    const assessmentsHook = renderHook(() =>
      useIdeaAssessments('company-99', range, 'cycle-1', insightsHook.result.current.data, true),
    );

    await waitFor(() => expect(assessmentsHook.result.current.loading).toBe(false));

    await act(async () => {
      await assessmentsHook.result.current.saveAssessment('Cycle complete');
    });

    expect(cyclesStore[0].assessments).not.toBeNull();

    global.fetch = originalFetch as typeof global.fetch;
  });
});

function buildPassthroughActionsMock() {
  return createIdeaActionsMock([]);
}

function createIdeaActionsMock(store: any[]) {
  const builder = {
    eq: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve({ data: store, error: null })),
  };

  return {
    select: vi.fn(() => builder),
    insert: (payload: any) => ({
      select: () => ({
        single: () => {
          const entry = {
            id: payload?.id ?? `action-${store.length + 1}`,
            created_at: new Date().toISOString(),
            ...payload,
          };
          store.push(entry);
          return Promise.resolve({ data: entry, error: null });
        },
      }),
    }),
    update: (payload: any) => ({
      eq: () => ({
        eq: () => ({
          select: () => ({
            single: () => {
              if (store.length === 0) {
                return Promise.resolve({ data: { ...payload }, error: null });
              }
              const updated = { ...store[0], ...payload };
              store[0] = updated;
              return Promise.resolve({ data: updated, error: null });
            },
          }),
        }),
      }),
    }),
  } as any;
}

function createIdeaCyclesMock(store: any[]) {
  return {
    insert: (payload: any) => ({
      select: () => ({
        single: () => {
          const entry = {
            id: payload?.id ?? `cycle-${store.length + 1}`,
            created_at: new Date().toISOString(),
            ...payload,
          };
          store.push(entry);
          return Promise.resolve({ data: entry, error: null });
        },
      }),
    }),
    update: (payload: any) => ({
      eq: () => ({
        select: () => ({
          single: () => {
            if (store.length === 0) {
              return Promise.resolve({ data: { ...payload }, error: null });
            }
            const updated = { ...store[0], ...payload };
            store[0] = updated;
            return Promise.resolve({ data: updated, error: null });
          },
        }),
      }),
    }),
  } as any;
}
