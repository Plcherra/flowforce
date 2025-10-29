/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSaveUserPermissions } from '../useUserPermissions';
import type { PermissionKey, PermissionValue } from '@/lib/permissions/registry';

const supabaseMocks = vi.hoisted(() => {
  const existingOverrides: Array<{ permission_key: PermissionKey; permission_value: PermissionValue }> = [];

  const selectEqMock = vi.fn(async () => ({
    data: existingOverrides,
    error: null,
  }));
  const selectMock = vi.fn(() => ({
    eq: selectEqMock,
  }));
  const upsertMock = vi.fn(async () => ({
    data: null,
    error: null,
  }));
  const deleteInMock = vi.fn(async () => ({
    data: null,
    error: null,
  }));
  const deleteEqMock = vi.fn(() => ({
    in: deleteInMock,
  }));
  const deleteMock = vi.fn(() => ({
    eq: deleteEqMock,
  }));
  const fromMock = vi.fn(() => ({
    select: selectMock,
    upsert: upsertMock,
    delete: deleteMock,
  }));
  const getUserMock = vi.fn(async () => ({ data: { user: { id: 'auditor-1' } } }));

  return {
    existingOverrides,
    selectEqMock,
    selectMock,
    upsertMock,
    deleteInMock,
    deleteEqMock,
    deleteMock,
    fromMock,
    getUserMock,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseMocks.fromMock,
    auth: {
      getUser: supabaseMocks.getUserMock,
    },
  },
}));

const reactQueryMocks = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: any) => options,
  useQueryClient: () => ({
    invalidateQueries: reactQueryMocks.invalidateQueriesMock,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const auditMocks = vi.hoisted(() => ({
  logAuditEventMock: vi.fn(),
}));

vi.mock('@/services/audit/auditService', () => ({
  logAuditEvent: auditMocks.logAuditEventMock,
}));

describe('useSaveUserPermissions', () => {
  beforeEach(() => {
    supabaseMocks.existingOverrides.length = 0;
    supabaseMocks.selectEqMock.mockClear();
    supabaseMocks.selectMock.mockClear();
    supabaseMocks.upsertMock.mockClear();
    supabaseMocks.deleteInMock.mockClear();
    supabaseMocks.deleteEqMock.mockClear();
    supabaseMocks.deleteMock.mockClear();
    supabaseMocks.fromMock.mockClear();
    supabaseMocks.getUserMock.mockClear();
    reactQueryMocks.invalidateQueriesMock.mockClear();
    auditMocks.logAuditEventMock.mockClear();
  });

  it('upserts new overrides, deletes stale entries, and records an audit event', async () => {
    supabaseMocks.existingOverrides.push(
      { permission_key: 'schedule.view', permission_value: 'allow' },
      { permission_key: 'viewTeamProfiles', permission_value: 'deny' },
    );

    const mutation = useSaveUserPermissions();

    await mutation.mutationFn({
      userId: 'user-123',
      permissions: {
        'schedule.view': 'allow',
        viewTeamProfiles: 'inherit',
      } as unknown as Record<PermissionKey, PermissionValue>,
    });

    expect(supabaseMocks.upsertMock).toHaveBeenCalledTimes(1);
    expect(supabaseMocks.upsertMock).toHaveBeenCalledWith(
      [
        {
          user_id: 'user-123',
          permission_key: 'schedule.view',
          permission_value: 'allow',
          created_by: 'auditor-1',
        },
      ],
      { onConflict: 'user_id,permission_key' },
    );

    expect(supabaseMocks.deleteEqMock).toHaveBeenCalledWith('user_id', 'user-123');
    expect(supabaseMocks.deleteInMock).toHaveBeenCalledWith('permission_key', ['viewTeamProfiles']);

    expect(auditMocks.logAuditEventMock).toHaveBeenCalledTimes(1);
    expect(auditMocks.logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUserId: 'user-123',
        oldValues: { 'schedule.view': 'allow', viewTeamProfiles: 'deny' },
        newValues: { 'schedule.view': 'allow' },
      }),
    );
  });

  it('skips audit logging when overrides remain unchanged', async () => {
    supabaseMocks.existingOverrides.push({
      permission_key: 'schedule.view',
      permission_value: 'allow',
    });

    const mutation = useSaveUserPermissions();

    await mutation.mutationFn({
      userId: 'user-123',
      permissions: {
        'schedule.view': 'allow',
      } as unknown as Record<PermissionKey, PermissionValue>,
    });

    expect(supabaseMocks.upsertMock).toHaveBeenCalledTimes(1);
    expect(supabaseMocks.deleteMock).not.toHaveBeenCalled();
    expect(auditMocks.logAuditEventMock).not.toHaveBeenCalled();
  });
});
