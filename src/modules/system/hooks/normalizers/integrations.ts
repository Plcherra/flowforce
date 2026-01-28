import type {
  IntegrationsSettings,
  IntegrationStatus,
  IntegrationAuthType,
  IntegrationConnection,
} from "@/types/system-settings";
import { DEFAULT_INTEGRATIONS } from "../systemSettingsDefaults";
import { asString, isRecord } from "./helpers";

export const normalizeIntegrations = (value: unknown): IntegrationsSettings => {
  const source = isRecord(value) ? value : {};
  const providersSource = isRecord(source.providers) ? source.providers : {};
  const syncMappingsSource = isRecord(source.syncMappings)
    ? source.syncMappings
    : {};
  const connectionsSource = Array.isArray(source.connections)
    ? source.connections
    : [];

  const providers: Record<
    string,
    { status: IntegrationStatus; authType: IntegrationAuthType }
  > = {
    ...DEFAULT_INTEGRATIONS.providers,
  };

  Object.entries(providersSource).forEach(([key, providerValue]) => {
    const providerRecord = isRecord(providerValue) ? providerValue : {};
    const statusCandidate = asString(providerRecord.status);
    const authCandidate = asString(providerRecord.authType);
    if (!providers[key]) {
      providers[key] = {
        status: "disconnected",
        authType: "api_key",
      };
    }
    providers[key] = {
      status: (statusCandidate as IntegrationStatus) ?? providers[key].status,
      authType:
        (authCandidate as IntegrationAuthType) ?? providers[key].authType,
    };
  });

  const connections: IntegrationConnection[] = connectionsSource
    .map((value) => (isRecord(value) ? value : null))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((value) => ({
      id: asString(value.id) ?? `tmp-${Date.now()}`,
      provider: asString(value.provider) ?? "unknown",
      status: (asString(value.status) as IntegrationStatus) ?? "disconnected",
      authType: (asString(value.authType) as IntegrationAuthType) ?? "api_key",
      connectedAt: asString(value.connectedAt),
      lastSyncedAt: asString(value.lastSyncedAt),
      metadata: isRecord(value.metadata) ? value.metadata : undefined,
    }));

  return {
    ...DEFAULT_INTEGRATIONS,
    ...source,
    providers,
    connections,
    syncMappings: {
      ...DEFAULT_INTEGRATIONS.syncMappings,
      ...syncMappingsSource,
    },
    lastSyncedAt: asString(source.lastSyncedAt),
  };
};
