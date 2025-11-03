/* @vitest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSystemSettings } from '../useSystemSettings';

const authMocks = vi.hoisted(() => ({
  user: { id: 'user-123' },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: authMocks.user,
    session: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const companyMocks = vi.hoisted(() => ({
  state: {
    company: null as any,
    loading: false,
    updateCompany: vi.fn(),
    refetchCompany: vi.fn(async () => undefined),
  },
}));

vi.mock('@/hooks/useCompany', () => ({
  useCompany: () => companyMocks.state,
}));

const supabaseMocks = vi.hoisted(() => {
  let systemRow: any = null;

  const profileSingleMock = vi.fn(async () => ({
    data: { role: 'admin', is_company_admin: true },
    error: null,
  }));

  const systemMaybeSingleMock = vi.fn(async () => ({ data: systemRow, error: null }));

  const systemUpdateSingleMock = vi.fn(async () => ({ data: systemRow, error: null }));

  const fromMock = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ single: profileSingleMock })),
        })),
      };
    }
    if (table === 'system_settings') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: systemMaybeSingleMock })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: () => ({ single: systemUpdateSingleMock }),
          })),
        })),
        insert: vi.fn(() => ({
          select: () => ({ single: vi.fn(async () => ({ data: systemRow, error: null })) }),
        })),
      };
    }
    return {
      select: vi.fn(),
    };
  });

  return {
    setSystemRow: (row: any) => {
      systemRow = row;
    },
    fromMock,
    profileSingleMock,
    systemMaybeSingleMock,
    systemUpdateSingleMock,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseMocks.fromMock,
  },
}));

describe('useSystemSettings', () => {
  beforeEach(() => {
    companyMocks.state.company = null;
    companyMocks.state.loading = false;
    companyMocks.state.refetchCompany.mockClear();
    supabaseMocks.setSystemRow(null);
    supabaseMocks.fromMock.mockClear();
    supabaseMocks.profileSingleMock.mockClear();
    supabaseMocks.systemMaybeSingleMock.mockClear();
    supabaseMocks.systemUpdateSingleMock.mockClear();
  });

  it('reports error when company context is missing', async () => {
    const { result } = renderHook(() => useSystemSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe('No active company context');
  });

  it('loads settings for provided company id', async () => {
    companyMocks.state.company = {
      id: 'company-123',
      name: 'Acme Inc.',
      timezone: 'UTC',
      currency: 'USD',
      primary_color: '#123456',
      secondary_color: '#654321',
      working_hours: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;

    const systemRow = {
      id: 'settings-1',
      company_id: 'company-123',
      general: { companyName: 'Acme Inc.' },
      security: {},
      localization: {},
      notifications: {},
      integrations: {},
      appearance: {},
      admin_config: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    supabaseMocks.setSystemRow(systemRow);

    const { result } = renderHook(() => useSystemSettings('company-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.settings).not.toBeNull();
    });

    expect(result.current.settings?.companyId).toBe('company-123');

    await act(async () => {
      await result.current.updateSettings({ general: { companyName: 'Acme Updated' } as any });
    });

    expect(supabaseMocks.systemUpdateSingleMock).toHaveBeenCalled();
  });
});
