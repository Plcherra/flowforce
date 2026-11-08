import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase as browserClient } from "@/integrations/supabase/client"; // pragma: allowlist secret
import {
  HiringBuilder,
  type HiringBuilderHandle,
} from "@/features/employee-onboarding/components/HiringBuilder";
import { useToast } from "@/hooks/use-toast";
import { opsInviteBasics } from "../../utils/opsInviteFlow";

export function OpsInviteBasics({
  companyId,
  isSubmitting = false,
  onBack,
  onSend,
}: {
  companyId: string | null;
  isSubmitting?: boolean;
  onBack: () => void;
  onSend: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const hiringRef = useRef<HiringBuilderHandle>(null);
  const send = async () => {
    const saved = await hiringRef.current?.save();
    if (saved === false) {
      toast({ title: t("employeeOnboarding.saveFailed"), variant: "destructive" });
      return;
    }
    onSend();
  };
  const basicsQuery = useQuery({
    queryKey: ["ops-invite-basics", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) {
        return opsInviteBasics({
          companyId: null,
          description: null,
          documents: [],
          policies: [],
        });
      }

      const [companyResult, settingsResult, documentResult, policyResult] =
        await Promise.all([
          browserClient
            .from("companies")
            .select("id, description")
            .eq("id", companyId)
            .maybeSingle(),
          browserClient
            .from("system_settings")
            .select("general")
            .eq("company_id", companyId)
            .limit(1),
          browserClient
            .from("documents")
            .select("*")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false })
            .limit(20),
          browserClient
            .from("company_policies")
            .select("id, name, type, archived_at")
            .eq("company_id", companyId)
            .order("name", { ascending: true }),
        ]);

      if (companyResult.error || documentResult.error || policyResult.error) {
        throw companyResult.error ?? documentResult.error ?? policyResult.error;
      }

      const general = settingsResult.data?.[0]?.general;
      const settingsWelcome =
        general && typeof general === "object" && !Array.isArray(general)
          ? (general as Record<string, unknown>).companyDescription
          : null;

      return opsInviteBasics({
        companyId,
        description:
          companyResult.data?.description ??
          (typeof settingsWelcome === "string" ? settingsWelcome : null),
        documents: documentResult.data ?? [],
        policies: policyResult.data ?? [],
      });
    },
  });

  const basics = basicsQuery.data;

  return (
    <div className="space-y-4" data-testid="ops-basics">
      <div>
        <h3 className="text-lg font-semibold">{t("employees.opsFlowBasics")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("employees.opsFlowBasicsHelp")}
        </p>
      </div>

      {basicsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("employees.opsFlowLoading")}</p>
      ) : null}

      {basicsQuery.isError ? (
        <p className="text-sm text-destructive" data-testid="ops-basics-error">
          {t("employees.opsFlowBasicsLoadError")}
        </p>
      ) : null}

      {basics ? (
        <div className="space-y-4">
          <section data-testid="ops-basics-welcome">
            <h4 className="text-sm font-medium">{t("employees.opsFlowWelcome")}</h4>
            {basics.welcome ? (
              <p className="mt-1 whitespace-pre-wrap text-sm">{basics.welcome}</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground" data-empty="true">
                {t("employees.opsFlowNoWelcome")}
              </p>
            )}
          </section>

          <section data-testid="ops-basics-docs">
            <HiringBuilder ref={hiringRef} />
          </section>

          <section data-testid="ops-basics-rules">
            <h4 className="text-sm font-medium">{t("employees.opsFlowRules")}</h4>
            {basics.rules.length > 0 ? (
              <ul className="mt-1 space-y-1 text-sm">
                {basics.rules.map((rule) => (
                  <li key={rule.id} data-testid="ops-basics-rule">
                    {rule.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground" data-empty="true">
                {t("employees.opsFlowNoRules")}
              </p>
            )}
          </section>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          {t("employees.opsFlowBack")}
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            data-testid="ops-basics-skip"
            onClick={onSend}
            disabled={isSubmitting}
          >
            {t("employees.opsFlowSkip")}
          </Button>
          <Button
            type="button"
            data-testid="ops-basics-continue"
            onClick={() => void send()}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("literals.sending") : t("employees.opsFlowSend")}
          </Button>
        </div>
      </div>
    </div>
  );
}
