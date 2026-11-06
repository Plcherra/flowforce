import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useCan } from "@/hooks/useCan";
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client"; // pragma: allowlist secret
import type { Json } from "@/integrations/supabase/types"; // pragma: allowlist secret
import { deleteFormRow, insertFormRow, replaceFormFields } from "@/features/forms/repositories/formsRepository";
import { useForms } from "@/features/forms/hooks/useForms";
import {
  applyCafeStarter,
  cafeCopyKey,
  cafeDefaultWindow,
  cafeItemCopyKey,
  cafeStarterGate,
  cafeWindowProblem,
  CAFE_LIST_SPECS,
  findBaristaRole,
  pendingCafeLists,
  type CafeListKey,
} from "@/features/forms/utils/cafeStarter";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/features/tasks/utils/taskSchedule";
import { logger } from "@/utils/logger";

type Windows = Record<CafeListKey, { showFrom: string; dueAt: string }>;

function freshWindows(): Windows {
  const day = new Date();
  return {
    opening: cafeDefaultWindow(day, "opening"),
    closing: cafeDefaultWindow(day, "closing"),
  };
}

export default function CafeStarterDialog({
  open,
  onOpenChange,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { can } = useCan();
  const { roles, loading: rolesLoading } = useCompanyRoles();
  const { forms } = useForms();
  const [windows, setWindows] = useState<Windows>(freshWindows);
  const [pending, setPending] = useState(false);
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const barista = findBaristaRole(roles);
  const gate = cafeStarterGate({
    canCreateForms: can("createForms"),
    canManageRoles: can("systemSettings"),
    baristaExists: Boolean(barista),
  });
  const pendingLists = pendingCafeLists(forms);
  const timeProblem = pendingLists.some((key) =>
    cafeWindowProblem(windows[key].showFrom, windows[key].dueAt),
  );

  const setWindow = (
    key: CafeListKey,
    field: "showFrom" | "dueAt",
    value: string,
  ) => {
    setWindows((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));
  };

  const apply = async () => {
    if (!user || !companyId || gate !== "apply" || timeProblem) return;
    setPending(true);
    try {
      const result = await applyCafeStarter({
        roles,
        forms,
        canManageRoles: can("systemSettings"),
        roleDescription: t("forms.cafe.roleDescription"),
        lists: CAFE_LIST_SPECS.map((spec) => ({
          key: spec.key,
          title: t(cafeCopyKey(spec.key, "Title")),
          description: t(cafeCopyKey(spec.key, "Description")),
          showFrom: windows[spec.key].showFrom || null,
          dueAt: windows[spec.key].dueAt || null,
          itemLabels: Array.from({ length: spec.itemCount }, (_, index) =>
            t(cafeItemCopyKey(spec.key, index)),
          ),
        })),
        createRole: async (role) => {
          const { data, error } = await supabase // pragma: allowlist secret
            .from("company_roles")
            .insert({
              ...role,
              company_id: companyId,
              created_by: user.id,
              permissions: role.permissions as Json,
            })
            .select("id")
            .single();
          if (error || !data?.id) throw error ?? new Error("role");
          return { id: data.id };
        },
        createList: async (list) => {
          const sourceLocale = appLanguageFromTag(
            i18n.resolvedLanguage || i18n.language,
          );
          const created = await insertFormRow(
            companyId,
            {
              title: list.title,
              description: list.description,
              status: "published",
              created_by: user.id,
              settings: list.settings as Json,
            },
            sourceLocale,
          );
          try {
            await replaceFormFields(companyId, created.id, list.fields, sourceLocale);
          } catch (error) {
            await deleteFormRow(companyId, created.id).catch(() => undefined);
            throw error;
          }
          return { id: created.id };
        },
      });
      if (result.already) {
        toast({
          title: t("forms.cafe.starter"),
          description: t("forms.cafe.alreadyApplied"),
        });
      } else {
        toast({
          title: t("forms.cafe.added"),
          description: t("forms.cafe.addedHelp", { shift: t("tasks.myShift") }),
        });
      }
      onApplied();
      onOpenChange(false);
    } catch (error) {
      logger.error("Cafe starter failed", { error, tags: ["forms", "cafe"] });
      const due = error instanceof Error && error.message === "due";
      toast({
        title: t("forms.errorTitle"),
        description: due ? t("forms.cafe.dueOrder") : t("forms.cafe.failed"),
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
        data-testid="cafe-starter-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t("forms.cafe.starter")}</DialogTitle>
          <DialogDescription>
            {t("forms.cafe.help", { shift: t("tasks.myShift") })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <section className="space-y-1" data-testid="cafe-starter-role">
            <h3 className="text-sm font-semibold">{t("forms.cafe.roleName")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("forms.cafe.roleDescription")}
            </p>
            {!rolesLoading && barista ? (
              <p className="text-sm text-muted-foreground">{t("forms.cafe.roleExists")}</p>
            ) : null}
            {!rolesLoading && !barista ? (
              <p className="text-sm text-muted-foreground">
                {t("forms.cafe.roleWillCreate")}
              </p>
            ) : null}
          </section>
          {CAFE_LIST_SPECS.map((spec) => (
            <section
              key={spec.key}
              className="space-y-2 rounded-md border p-3"
              data-testid={`cafe-list-${spec.key}`}
            >
              <h3 className="text-sm font-semibold">
                {t(cafeCopyKey(spec.key, "Title"))}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(cafeCopyKey(spec.key, "Description"))}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {Array.from({ length: spec.itemCount }, (_, index) => (
                  <li key={cafeItemCopyKey(spec.key, index)} data-testid={`cafe-item-${spec.key}-${index + 1}`}>
                    {t(cafeItemCopyKey(spec.key, index))}
                  </li>
                ))}
              </ul>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`cafe-show-from-${spec.key}`}>{t("forms.showFrom")}</Label>
                  <Input
                    id={`cafe-show-from-${spec.key}`}
                    type="datetime-local"
                    data-testid={`cafe-show-from-${spec.key}`}
                    value={toDatetimeLocalValue(windows[spec.key].showFrom)}
                    onChange={(event) =>
                      setWindow(
                        spec.key,
                        "showFrom",
                        fromDatetimeLocalValue(event.target.value) ?? "",
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`cafe-due-at-${spec.key}`}>{t("forms.dueAt")}</Label>
                  <Input
                    id={`cafe-due-at-${spec.key}`}
                    type="datetime-local"
                    data-testid={`cafe-due-at-${spec.key}`}
                    value={toDatetimeLocalValue(windows[spec.key].dueAt)}
                    onChange={(event) =>
                      setWindow(
                        spec.key,
                        "dueAt",
                        fromDatetimeLocalValue(event.target.value) ?? "",
                      )
                    }
                  />
                </div>
              </div>
            </section>
          ))}
          {timeProblem ? (
            <p className="text-sm text-destructive" data-testid="cafe-starter-due">
              {t("forms.cafe.dueOrder")}
            </p>
          ) : null}
          {gate === "blocked" ? (
            <p className="text-sm text-muted-foreground" data-testid="cafe-starter-blocked">
              {t("forms.cafe.blocked")}
            </p>
          ) : null}
          {pendingLists.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="cafe-starter-already">
              {t("forms.cafe.alreadyApplied")}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {t("common.cancel")}
          </Button>
          {gate === "apply" && pendingLists.length > 0 ? (
            <Button
              type="button"
              data-testid="cafe-starter-apply"
              disabled={pending || rolesLoading || timeProblem || !companyId}
              onClick={() => void apply()}
            >
              {pending ? t("forms.cafe.applying") : t("forms.cafe.apply")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
