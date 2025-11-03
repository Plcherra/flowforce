import { useCallback, useMemo, useState } from 'react';
import type {
  IntegrationConnection,
  IntegrationsSettings,
} from '@/types/system-settings';
import { DEFAULT_INTEGRATIONS } from './systemSettingsDefaults';
import type { SystemSettingsHook } from './useSystemSettings';

export function useIntegrationSettings(source: SystemSettingsHook) {
  const { settings, updateSettings, loading, error, canEdit } = source;
  const base = settings?.integrations ?? DEFAULT_INTEGRATIONS;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const connectionsMap = useMemo(() => {
    const map = new Map<string, IntegrationConnection>();
    base.connections.forEach((connection) => {
      map.set(connection.id, connection);
    });
    return map;
  }, [base.connections]);

  const updateIntegrations = useCallback(
    async (updates: Partial<IntegrationsSettings>) => {
      if (!settings) return;
      setSaving(true);
      setSaveError(null);
      try {
        const merged: IntegrationsSettings = {
          ...base,
          ...updates,
          providers: {
            ...base.providers,
            ...(updates.providers ?? {}),
          },
          connections: Array.from(
            new Map(
              [
                ...base.connections.map((connection) => [connection.id, connection] as const),
                ...(updates.connections?.map((connection) => [connection.id, connection] as const) ??
                  []),
              ],
            ).values(),
          ),
          syncMappings: {
            ...base.syncMappings,
            ...(updates.syncMappings ?? {}),
          },
          lastSyncedAt: updates.lastSyncedAt ?? base.lastSyncedAt,
        };

        await updateSettings({ integrations: merged });
      } catch (err) {
        setSaveError(err as Error);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [base, settings, updateSettings],
  );

  const connectIntegration = useCallback(
    async (provider: string, connection: IntegrationConnection) => {
      await updateIntegrations({
        providers: {
          [provider]: {
            status: connection.status,
            authType: connection.authType,
          },
        },
        connections: [
          {
            ...connection,
            metadata: connection.metadata ? { ...connection.metadata } : undefined,
          },
        ],
        lastSyncedAt: connection.lastSyncedAt ?? new Date().toISOString(),
      });
    },
    [updateIntegrations],
  );

  const disconnectIntegration = useCallback(
    async (provider: string) => {
      const remainingConnections = [...base.connections].filter(
        (connection) => connection.provider !== provider,
      );

      await updateIntegrations({
        providers: {
          [provider]: {
            status: 'disconnected',
            authType: base.providers[provider]?.authType ?? 'api_key',
          },
        },
        connections: remainingConnections,
      });
    },
    [updateIntegrations, base.connections, base.providers],
  );

  return {
    loading,
    globalError: error,
    canEdit,
    integrations: base,
    connectionsMap,
    saving,
    saveError,
    updateIntegrations,
    connectIntegration,
    disconnectIntegration,
  };
}
