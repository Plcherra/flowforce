/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForms } from '../useForms';

const mocks = vi.hoisted(() => {
  const sampleData = [
    {
      id: 'form-1',
      title: 'Safety Inspection',
      description: null,
      status: 'published',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z',
      created_by: 'user-1',
      created_profile: { first_name: 'Alex', last_name: 'Smith' },
      department: { name: 'Operations' },
      submission_stats: [{ count: 3 }],
      latest_submission: [{ submitted_at: '2024-01-03T00:00:00.000Z' }],
    },
  ];

  const limitMock = vi.fn(() => Promise.resolve({ data: sampleData, error: null }));

  const createBuilder = () => {
    const builder: any = {};
    builder.select = vi.fn(() => builder);
    builder.order = vi.fn(() => builder);
    builder.limit = limitMock;
    return builder;
  };

  const fromMock = vi.fn(() => createBuilder());

  return {
    sampleData,
    limitMock,
    fromMock,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.fromMock,
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/stores/useFormSchemaStore', () => ({
  useFormSchemaStore: {
    getState: () => ({ schema: null }),
  },
}));

function FormsConsumer() {
  const { forms, loading, refetchForms } = useForms();

  return (
    <div>
      <div data-testid="loading-state">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="form-count">{forms.length}</div>
      <button
        data-testid="refetch-button"
        onClick={() => {
          void refetchForms();
        }}
      >
        Refetch
      </button>
    </div>
  );
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

describe('useForms hook', () => {
  beforeEach(() => {
    mocks.limitMock.mockClear();
    mocks.fromMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  test('invokes the paginated forms query and refetches with the latest submission limit', async () => {
    const { queryClient } = renderWithClient(<FormsConsumer />);

    await waitFor(() => expect(screen.getByTestId('loading-state').textContent).toBe('ready'));

    expect(screen.getByTestId('form-count').textContent).toBe('1');
    expect(mocks.fromMock).toHaveBeenCalledWith('forms');
    expect(mocks.limitMock).toHaveBeenCalledTimes(1);
    expect(mocks.limitMock).toHaveBeenCalledWith(1, { foreignTable: 'latest_submission' });

    fireEvent.click(screen.getByTestId('refetch-button'));

    await waitFor(() => expect(mocks.limitMock).toHaveBeenCalledTimes(2));
    expect(mocks.limitMock.mock.calls[1]).toEqual([1, { foreignTable: 'latest_submission' }]);

    queryClient.clear();
  });
});
