import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { departmentNameProblem } from "@/features/scheduling/utils/shiftRoleDepartment";

type DepartmentRow = { id: string; name: string | null };

export function DepartmentSettingsCard() {
  const { t } = useTranslation();
  const { can } = useCan();
  const { profile } = useProfile();
  const { toast } = useToast();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const allowed = can("managePositions") || can("systemSettings");
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    const { data, error } = await supabase // pragma: allowlist secret
      .from("departments")
      .select("id, name")
      .eq("company_id", companyId)
      .order("name", { ascending: true });
    if (error) {
      toast({ title: t("settings.departmentFailed"), variant: "destructive" });
      return;
    }
    setRows((data ?? []) as DepartmentRow[]);
  }, [companyId, t, toast]);

  useEffect(() => {
    if (!allowed || !companyId) return;
    void load();
  }, [allowed, companyId, load]);

  if (!allowed) return null;

  const add = async () => {
    if (!companyId) return;
    const problem = departmentNameProblem(draft, rows);
    if (problem) {
      toast({
        title: t(problem === "empty" ? "settings.departmentEmpty" : "settings.departmentDuplicate"),
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("departments").insert({ // pragma: allowlist secret
      company_id: companyId,
      name: draft.trim(),
    });
    setBusy(false);
    if (error) {
      toast({ title: t("settings.departmentFailed"), variant: "destructive" });
      return;
    }
    setDraft("");
    toast({ title: t("settings.departmentAdded") });
    await load();
  };

  const rename = async (row: DepartmentRow, name: string) => {
    if (!companyId || name.trim() === (row.name ?? "").trim()) return;
    const problem = departmentNameProblem(name, rows, row.id);
    if (problem) {
      toast({
        title: t(problem === "empty" ? "settings.departmentEmpty" : "settings.departmentDuplicate"),
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase // pragma: allowlist secret
      .from("departments")
      .update({ name: name.trim() })
      .eq("id", row.id)
      .eq("company_id", companyId);
    if (error) {
      toast({ title: t("settings.departmentFailed"), variant: "destructive" });
      return;
    }
    toast({ title: t("settings.departmentRenamed") });
    await load();
  };

  const remove = async (row: DepartmentRow) => {
    if (!companyId) return;
    const { error } = await supabase // pragma: allowlist secret
      .from("departments")
      .delete()
      .eq("id", row.id)
      .eq("company_id", companyId);
    if (error) {
      toast({ title: t("settings.departmentFailed"), variant: "destructive" });
      return;
    }
    toast({ title: t("settings.departmentRemoved") });
    await load();
  };

  return (
    <Card data-testid="department-settings">
      <CardHeader>
        <CardTitle>{t("settings.departmentsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Label htmlFor="department-name" className="sr-only">
            {t("settings.departmentName")}
          </Label>
          <Input
            id="department-name"
            className="min-h-11"
            data-testid="department-name-input"
            value={draft}
            placeholder={t("settings.departmentName")}
            aria-label={t("settings.departmentName")}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button
            type="button"
            className="min-h-11"
            data-testid="department-add"
            disabled={busy}
            onClick={() => void add()}
          >
            {t("settings.addDepartment")}
          </Button>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("settings.departmentEmptyList")}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 sm:flex-row" data-testid={`department-row-${row.id}`}>
                <Input
                  className="min-h-11"
                  aria-label={t("settings.departmentName")}
                  defaultValue={row.name ?? ""}
                  onBlur={(event) => void rename(row, event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  data-testid={`department-remove-${row.id}`}
                  onClick={() => void remove(row)}
                >
                  {t("settings.removeDepartment")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
