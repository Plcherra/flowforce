import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { OPS_SUGGESTIONS_CHANGED } from "../utils/operationsHubSuggestion";

interface AutomationSuggestion {
  id: string;
  suggestion_title: string;
  suggestion_summary?: string | null;
  status: string;
}

const sectionTitleClass =
  "text-xs uppercase tracking-[0.4em] text-muted-foreground";

const RUN_RESULT_KEYS: Record<string, string> = {
  ran: "operations.sendToFlowForceRan",
  already_active: "operations.sendToFlowForceAlreadyActive",
  forbidden: "operations.sendToFlowForceForbidden",
  unsupported: "operations.sendToFlowForceUnsupported",
  storage_unavailable: "operations.sendToFlowForceStorage",
  conflict: "operations.sendToFlowForceConflict",
};

export function AutomationsPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useProfile();
  const { can, isLoading: permissionLoading } = useCan();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const canRun = !permissionLoading && can("ai.actions.automate");
  const [suggestions, setSuggestions] = useState<AutomationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      if (!companyId) {
        if (active) {
          setSuggestions([]);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("ops_automation_suggestions")
        .select("id,suggestion_title,suggestion_summary,status")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!active) return;
      if (error) {
        logger.error("[AutomationsPanel] failed to load suggestions", {
          error,
          tags: ["error"],
        });
        setSuggestions([]);
      } else {
        setSuggestions((data ?? []) as AutomationSuggestion[]);
      }
      setLoading(false);
    }

    void load();
    const refresh = () => {
      void load();
    };
    window.addEventListener(OPS_SUGGESTIONS_CHANGED, refresh);
    return () => {
      active = false;
      window.removeEventListener(OPS_SUGGESTIONS_CHANGED, refresh);
    };
  }, [companyId]);

  const activeAutomations = suggestions.filter(
    (suggestion) =>
      suggestion.status === "active" || suggestion.status === "applied",
  );
  const proposedAutomations = suggestions.filter(
    (suggestion) =>
      suggestion.status !== "active" && suggestion.status !== "applied",
  );

  async function handleDispatch(suggestion: AutomationSuggestion) {
    setDispatching(suggestion.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({
          variant: "destructive",
          title: t("operations.sendToFlowForceForbidden"),
        });
        return;
      }
      const response = await fetch("/api/ops/automations/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ suggestionId: suggestion.id }),
      });
      const payload = (await response.json().catch(() => null)) as {
        code?: string;
      } | null;
      const code = payload?.code ?? "run_failed";
      if (code === "ran" || code === "already_active") {
        setSuggestions((current) =>
          current.map((row) =>
            row.id === suggestion.id ? { ...row, status: "active" } : row,
          ),
        );
        toast({ title: t(RUN_RESULT_KEYS[code]) });
        return;
      }
      toast({
        variant: "destructive",
        title: t(RUN_RESULT_KEYS[code] ?? "operations.sendToFlowForceFailed"),
      });
    } catch (error) {
      logger.error("[AutomationsPanel] Failed to run automation", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: t("operations.sendToFlowForceFailed"),
      });
    } finally {
      setDispatching(null);
    }
  }

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className={sectionTitleClass}>{t("operations.automations")}</p>
          <h3 className="text-lg font-semibold">{t("operations.playbooks")}</h3>
        </div>
        <Badge variant="outline">{t("shell.flowforce")}</Badge>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={`automation-skeleton-${index}`}
              className="h-16 w-full rounded-2xl"
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <section>
            <p className={sectionTitleClass}>{t("operations.activeAutomations")}</p>
            <ScrollArea className="mt-2 max-h-60 pr-2">
              <div className="space-y-3">
                {activeAutomations.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("operations.noneRunningRightNow")}
                  </p>
                )}
                {activeAutomations.map((automation) => (
                  <motion.div
                    key={automation.id}
                    layout
                    className="rounded-2xl border bg-muted/30 p-3"
                  >
                    <p className="text-sm font-semibold">
                      {automation.suggestion_title}
                    </p>
                    {automation.suggestion_summary && (
                      <p className="text-xs text-muted-foreground">
                        {automation.suggestion_summary}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </section>

          <section>
            <p className={sectionTitleClass}>{t("operations.suggestedAutomations")}</p>
            <ScrollArea className="mt-2 max-h-60 pr-2">
              <div className="space-y-3">
                {proposedAutomations.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("operations.noPendingDrafts")}
                  </p>
                )}
                {proposedAutomations.map((automation) => (
                  <motion.div
                    key={automation.id}
                    layout
                    className="rounded-2xl border bg-background p-3"
                  >
                    <p className="text-sm font-semibold">
                      {automation.suggestion_title}
                    </p>
                    {automation.suggestion_summary && (
                      <p className="text-xs text-muted-foreground">
                        {automation.suggestion_summary}
                      </p>
                    )}
                    {permissionLoading ? null : canRun ? (
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        disabled={dispatching === automation.id}
                        onClick={() => void handleDispatch(automation)}
                      >
                        {dispatching === automation.id
                          ? t("operations.sendToFlowForceWorking")
                          : t("operations.sendToFlowForce")}
                      </Button>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {t("operations.sendToFlowForceNoPermission")}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </section>
        </div>
      )}
    </div>
  );
}
