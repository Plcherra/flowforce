import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import type { IntegrationConnection } from "@/types/system-settings";
import { ErrorState } from "./ErrorState";
import { useIntegrationSettings } from "../hooks/useIntegrationSettings";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";

type ProviderMeta = {
  key: string;
  name: string;
  description: string;
  authType: "api_key" | "oauth";
  documentation: string;
};

const PROVIDERS: ProviderMeta[] = [
  {
    key: "toast",
    name: "Toast",
    description: "Payroll, scheduling, and sales data sync",
    authType: "api_key",
    documentation: "https://pos.toasttab.com/",
  },
  {
    key: "marketman",
    name: "MarketMan",
    description: "Inventory and recipe cost synchronization",
    authType: "api_key",
    documentation: "https://www.marketman.com/",
  },
  {
    key: "quickbooks",
    name: "QuickBooks Online",
    description: "Accounting and payroll sync",
    authType: "oauth",
    documentation: "https://quickbooks.intuit.com/",
  },
];

export function IntegrationSettingsPanel() {
  const system = useSystemSettingsContext();
  const {
    loading,
    globalError,
    canEdit,
    integrations,
    updateIntegrations,
    connectIntegration,
    disconnectIntegration,
    saving,
    saveError,
  } = useIntegrationSettings(system);

  const [activeProvider, setActiveProvider] = useState<ProviderMeta | null>(
    null,
  );
  const [apiKey, setApiKey] = useState("");
  const [notes, setNotes] = useState("");

  const providerStatus = useMemo(
    () => integrations.providers ?? {},
    [integrations.providers],
  );

  if (globalError) {
    return <ErrorState message={globalError.message} />;
  }

  const handleConnect = async (provider: ProviderMeta) => {
    if (provider.authType === "api_key" && !apiKey.trim()) {
      return;
    }
    const connection: IntegrationConnection = {
      id: `${provider.key}-${Date.now()}`,
      provider: provider.key,
      status: "connected",
      authType: provider.authType,
      lastSyncedAt: new Date().toISOString(),
      metadata:
        provider.authType === "api_key"
          ? { apiKey: apiKey.trim(), notes }
          : undefined,
    };
    await connectIntegration(provider.key, connection);
    setActiveProvider(null);
    setApiKey("");
    setNotes("");
  };

  const handleDisconnect = async (providerKey: string) => {
    await disconnectIntegration(providerKey);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Manage third-party connections and synchronization rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {PROVIDERS.map((provider) => {
            const status =
              providerStatus[provider.key]?.status ?? "disconnected";
            const isConnected = status === "connected";
            const isPending = status === "pending";
            return (
              <Card key={provider.key} className="border-muted shadow-sm">
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <Badge
                      variant={
                        isConnected
                          ? "default"
                          : isPending
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {provider.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    Auth type:{" "}
                    {provider.authType === "api_key" ? "API Key" : "OAuth"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {isConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(provider.key)}
                        disabled={!canEdit || saving}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setActiveProvider(provider)}
                        disabled={!canEdit || saving}
                      >
                        {provider.authType === "oauth"
                          ? "Start OAuth"
                          : "Connect"}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={provider.documentation}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Docs
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">
            Connection activity
          </h3>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead>Last sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.connections.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No connections yet.
                  </TableCell>
                </TableRow>
              ) : (
                integrations.connections.map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell className="font-medium">
                      {connection.provider}
                    </TableCell>
                    <TableCell>{connection.status}</TableCell>
                    <TableCell>
                      {connection.connectedAt
                        ? new Date(connection.connectedAt).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {connection.lastSyncedAt
                        ? new Date(connection.lastSyncedAt).toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Adjust auto-sync rules and mappings as integrations go live.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              updateIntegrations({
                syncMappings: {
                  ...integrations.syncMappings,
                },
              })
            }
            disabled={saving || !canEdit}
          >
            Refresh mappings
          </Button>
        </div>

        {saveError && <ErrorState message={saveError.message} />}

        {activeProvider && (
          <Dialog open onOpenChange={() => setActiveProvider(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect {activeProvider.name}</DialogTitle>
              </DialogHeader>
              {activeProvider.authType === "api_key" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      API Key
                    </label>
                    <Input
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder="Paste API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Notes
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      placeholder="Optional context for teammates"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Continue to {activeProvider.name} to authorize FlowForce. You
                  will be redirected back automatically.
                </p>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setActiveProvider(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleConnect(activeProvider)}
                  disabled={
                    saving ||
                    (activeProvider.authType === "api_key" && !apiKey.trim())
                  }
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {activeProvider.authType === "oauth" ? "Continue" : "Connect"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
