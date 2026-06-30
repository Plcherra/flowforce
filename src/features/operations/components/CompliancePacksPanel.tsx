import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ClipboardList,
  Download,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  compliancePackCatalog,
  isCompliancePackInstalled,
  sortCompliancePacks,
  summarizeCompliancePacks,
  type CompliancePackDashboardRow,
  type CompliancePackKey,
  type CompliancePackRpcResult,
} from "@/services/operations/compliancePacks";
import { logger } from "@/utils/logger";

export function CompliancePacksPanel() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [packs, setPacks] = useState<CompliancePackDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const sortedPacks = useMemo(() => sortCompliancePacks(packs), [packs]);
  const summary = useMemo(
    () => summarizeCompliancePacks(sortedPacks),
    [sortedPacks],
  );

  const loadPacks = useCallback(async () => {
    if (!companyId) {
      setPacks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("operations_compliance_dashboard_v")
        .select("*")
        .eq("company_id", companyId)
        .order("compliance_score", { ascending: true });

      if (error) throw error;

      setPacks((data ?? []) as CompliancePackDashboardRow[]);
    } catch (error) {
      logger.error("[CompliancePacksPanel] load failed", {
        error,
        tags: ["error"],
      });
      setPacks([]);
      toast({
        variant: "destructive",
        title: "Unable to load compliance packs",
        description:
          error instanceof Error ? error.message : "Unexpected compliance error.",
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, toast]);

  useEffect(() => {
    void loadPacks();
  }, [loadPacks]);

  const installPack = async (packKey: CompliancePackKey) => {
    if (!companyId) return;

    setActing(`install:${packKey}`);

    try {
      const { data, error } = await supabase.rpc("install_compliance_pack", {
        p_company_id: companyId,
        p_pack_key: packKey,
      });

      if (error) throw error;

      const result = (data ?? {}) as CompliancePackRpcResult;
      toast({
        title: "Compliance pack installed",
        description: result.workflowid
          ? "Template workflow and evidence rules are ready."
          : "Pack is ready.",
      });
      await loadPacks();
    } catch (error) {
      logger.error("[CompliancePacksPanel] install failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Compliance install failed",
        description:
          error instanceof Error ? error.message : "Unexpected compliance error.",
      });
    } finally {
      setActing(null);
    }
  };

  const exportPack = async (packKey: CompliancePackKey) => {
    if (!companyId) return;

    setActing(`export:${packKey}`);

    try {
      const today = new Date();
      const periodEnd = today.toISOString().slice(0, 10);
      const periodStartDate = new Date(today);
      periodStartDate.setDate(today.getDate() - 30);
      const periodStart = periodStartDate.toISOString().slice(0, 10);

      const { data, error } = await supabase.rpc(
        "create_compliance_audit_export",
        {
          p_company_id: companyId,
          p_pack_key: packKey,
          p_period_start: periodStart,
          p_period_end: periodEnd,
        },
      );

      if (error) throw error;

      const result = (data ?? {}) as CompliancePackRpcResult;
      toast({
        title: "Audit export ready",
        description: result.exportid
          ? `Export ${result.exportid.slice(0, 8)} created.`
          : "Compliance snapshot created.",
      });
    } catch (error) {
      logger.error("[CompliancePacksPanel] export failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Audit export failed",
        description:
          error instanceof Error ? error.message : "Unexpected compliance error.",
      });
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Compliance
          </p>
          <h3 className="text-lg font-semibold">Compliance Packs</h3>
        </div>
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          {summary.averageScore} score
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-2xl border p-2">
          <p className="font-semibold">{summary.installed}</p>
          <p className="text-muted-foreground">packs</p>
        </div>
        <div className="rounded-2xl border p-2">
          <p className="font-semibold">{summary.overdueRuns}</p>
          <p className="text-muted-foreground">overdue</p>
        </div>
        <div className="rounded-2xl border p-2">
          <p className="font-semibold">{summary.openExceptions}</p>
          <p className="text-muted-foreground">exceptions</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {compliancePackCatalog.map((pack) => {
          const installed = isCompliancePackInstalled(sortedPacks, pack.key);
          const installedPack = sortedPacks.find(
            (entry) => entry.pack_key === pack.key,
          );
          const actionKey = installed ? `export:${pack.key}` : `install:${pack.key}`;
          const busy = acting === actionKey;

          return (
            <div key={pack.key} className="rounded-2xl border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{pack.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(pack.retentionDays / 365)} year retention
                  </p>
                </div>
                <Badge variant={installed ? "default" : "outline"}>
                  {installed ? "Installed" : "Template"}
                </Badge>
              </div>

              {installedPack && (
                <div className="mt-3">
                  <Progress
                    value={installedPack.compliance_score}
                    className="h-2"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {installedPack.completed_runs}/{installedPack.total_runs} runs
                    complete, {installedPack.evidence_count} evidence records
                  </p>
                </div>
              )}

              <Button
                size="sm"
                variant={installed ? "outline" : "default"}
                className="mt-3 w-full"
                disabled={Boolean(acting) || !companyId}
                onClick={() =>
                  installed ? void exportPack(pack.key) : void installPack(pack.key)
                }
              >
                {busy ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : installed ? (
                  <Download className="mr-2 h-3.5 w-3.5" />
                ) : (
                  <ClipboardList className="mr-2 h-3.5 w-3.5" />
                )}
                {installed ? "Export" : "Install"}
              </Button>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border p-3 text-sm text-muted-foreground">
          <Archive className="h-4 w-4" />
          Loading compliance packs
        </div>
      )}
    </div>
  );
}
