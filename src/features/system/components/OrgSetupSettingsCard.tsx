import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { OrgPermissionsStep } from "@/features/onboarding/components/OrgPermissionsStep";
import {
  effectivePermissions,
  orgReady,
  type OrgSetup,
} from "@/features/onboarding/utils/orgTemplates";

function isOrgSetup(value: unknown): value is OrgSetup {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as { businessType?: unknown; departments?: unknown };
  return (
    (record.businessType === "cafe" ||
      record.businessType === "restaurant" ||
      record.businessType === "retail") &&
    Array.isArray(record.departments)
  );
}

export function OrgSetupSettingsCard() {
  const { t } = useTranslation();
  const { can } = useCan();
  const { profile } = useProfile();
  const { toast } = useToast();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const allowed = can("managePositions") || can("systemSettings");
  const [setup, setSetup] = useState<OrgSetup | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    const { data, error } = await supabase // pragma: allowlist secret
      .from("system_settings")
      .select("admin_config")
      .eq("company_id", companyId)
      .maybeSingle();
    if (error || !data) return;
    const root = data.admin_config;
    const org =
      root && typeof root === "object" && !Array.isArray(root)
        ? (root as { orgSetup?: unknown }).orgSetup
        : null;
    setSetup(isOrgSetup(org) ? org : null);
  }, [companyId]);

  useEffect(() => {
    if (!allowed) return;
    void load();
  }, [allowed, load]);

  if (!allowed || !setup) return null;

  const save = async () => {
    if (!companyId || !orgReady(setup)) return;
    setBusy(true);
    const { data } = await supabase // pragma: allowlist secret
      .from("system_settings")
      .select("admin_config")
      .eq("company_id", companyId)
      .maybeSingle();
    const root =
      data?.admin_config && typeof data.admin_config === "object" && !Array.isArray(data.admin_config)
        ? (data.admin_config as Record<string, unknown>)
        : {};
    const { error } = await supabase // pragma: allowlist secret
      .from("system_settings")
      .update({ admin_config: { ...root, orgSetup: setup } })
      .eq("company_id", companyId);
    if (!error) {
      for (const department of setup.departments) {
        for (const role of department.roles) {
          await supabase // pragma: allowlist secret
            .from("company_roles")
            .update({
              permissions: effectivePermissions(department.permissions, role.overrides),
            })
            .eq("company_id", companyId)
            .eq("name", role.name.trim());
        }
      }
    }
    setBusy(false);
    toast({
      title: t(error ? "settings.departmentFailed" : "onboarding.org.permissionsSaved"),
      variant: error ? "destructive" : "default",
    });
  };

  return (
    <Card data-testid="org-permissions-settings">
      <CardHeader>
        <CardTitle>{t("onboarding.org.permissionsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <OrgPermissionsStep setup={setup} onChange={setSetup} />
        <Button type="button" className="min-h-11" disabled={busy} onClick={() => void save()}>
          {t("onboarding.org.savePermissions")}
        </Button>
      </CardContent>
    </Card>
  );
}
