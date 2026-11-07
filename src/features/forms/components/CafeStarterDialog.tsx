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
import { logger } from "@/utils/logger";

type Windows = Record<CafeListKey, { showAt: string; dueTime: string; completeBy: string }>;

function freshWindows(): Windows {
  return {
    opening: cafeDefaultWindow("opening"),
    closing: cafeDefaultWindow("closing"),
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
  const timeProblem = pendingLists
    .map((key) =>
      cafeWindowProblem(windows[key].showAt, windows[key].dueTime, windows[key].completeBy),
    )
    .find((problem) => problem != null) ?? null;

  const setWindow = (
    key: CafeListKey,
    field: "showAt" | "dueTime" | "completeBy",
    value: string,
  ) => {
    setWindows((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));
  };

  const apply = async () => {
    if (!user || !companyId || gate !== "apply" || timeProblem != null) return;
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
          showAt: windows[spec.key].showAt || null,
          dueTime: windows[spec.key].dueTime || null,
          completeBy: windows[spec.key].completeBy || null,
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
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`cafe-show-at-${spec.key}`}>{t("forms.showTime")}</Label>
                  <Input
                    id={`cafe-show-at-${spec.key}`}
                    type="time"
                    data-testid={`cafe-show-from-${spec.key}`}
                    value={windows[spec.key].showAt}
                    onChange={(event) => setWindow(spec.key, "showAt", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`cafe-due-time-${spec.key}`}>{t("forms.dueTime")}</Label>
                  <Input
                    id={`cafe-due-time-${spec.key}`}
                    type="time"
                    data-testid={`cafe-due-at-${spec.key}`}
                    value={windows[spec.key].dueTime}
                    onChange={(event) => setWindow(spec.key, "dueTime", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`cafe-complete-${spec.key}`}>{t("forms.completeByTime")}</Label>
                  <Input
                    id={`cafe-complete-${spec.key}`}
                    type="time"
                    data-testid={`cafe-complete-by-${spec.key}`}
                    value={windows[spec.key].completeBy}
                    onChange={(event) => setWindow(spec.key, "completeBy", event.target.value)}
                  />
                </div>
              </div>
            </section>
          ))}
          {timeProblem ? (
            <p className="text-sm text-destructive" data-testid="cafe-starter-due">
              {t(timeProblem === "complete" ? "forms.completeByOrder" : "forms.cafe.dueOrder")}
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
              disabled={pending || rolesLoading || timeProblem != null || !companyId}
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
