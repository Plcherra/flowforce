"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  LogOut,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import type { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@/lib/router-adapter";
import { useToast } from "@/hooks/use-toast";

type ProfileContextSnapshot = ReturnType<typeof useProfile>;

interface TenantSetupRequiredProps {
  profileState: ProfileContextSnapshot;
}

export function TenantSetupRequired({
  profileState,
}: TenantSetupRequiredProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [repairing, setRepairing] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

  const canAttemptRepair = Boolean(user?.user_metadata?.company_name);

  const retryProfile = async () => {
    setRepairError(null);
    await profileState.refreshProfile();
  };

  const repairWorkspace = async () => {
    setRepairing(true);
    setRepairError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const response = await fetch("/api/onboarding/repair", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        details?: { message?: string } | string;
      };

      if (!response.ok) {
        const detailMessage =
          typeof result.details === "string"
            ? result.details
            : result.details?.message;
        throw new Error(
          [result.message, detailMessage].filter(Boolean).join(": ") ||
            "Unable to repair workspace setup.",
        );
      }

      await supabase.auth.refreshSession();
      await profileState.refreshProfile();
      toast({
        title: "Workspace repaired",
        description: "Your account is connected to a company workspace.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to repair workspace setup.";
      setRepairError(message);
      toast({
        title: "Repair failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRepairing(false);
    }
  };

  const supportCode = user?.id ? user.id.slice(0, 8) : "no-user";
  const email = user?.email ?? "Signed-in account";
  const reason =
    profileState.error ??
    (!profileState.profile
      ? "Profile setup is incomplete."
      : "Profile is not attached to a company.");

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center">
        <div className="w-full rounded-lg border bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Account setup required
                </p>
                <h1 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">
                  No company detected
                </h1>
                <p className="text-sm leading-6 text-muted-foreground md:text-base">
                  Your sign-in worked, but this account is not connected to a
                  company workspace yet. FlowForce needs that link before it can
                  load tenant data safely.
                </p>
              </div>
            </div>

            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Workspace link missing</AlertTitle>
              <AlertDescription>
                {reason} Reference {supportCode} for support. Account: {email}
              </AlertDescription>
            </Alert>

            {repairError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Repair did not complete</AlertTitle>
                <AlertDescription>{repairError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                onClick={repairWorkspace}
                disabled={!canAttemptRepair || repairing}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4" />
                {repairing ? "Repairing..." : "Repair workspace"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={retryProfile}
                disabled={profileState.loading || repairing}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4" />
                Retry connection
              </Button>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                If repair is unavailable, sign out and restart company setup.
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link to="/company-registration">Setup</Link>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
