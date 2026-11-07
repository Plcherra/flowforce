import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/features/forms/utils/formDayWindow";
import { useMyShiftBoard } from "@/features/tasks/hooks/useMyShiftBoard";

const FormFillDialog = lazy(() => import("@/features/forms/components/FormFillDialog"));

export function TodayRoleLists() {
  const { t, i18n } = useTranslation();
  const shift = useMyShiftBoard([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const board = shift.board;
  if (board.kind !== "ready" || board.view.roleLists.length === 0) return null;

  return (
    <section className="space-y-3" data-testid="overview-role-lists">
      <h2 className="text-lg font-semibold">{t("tasks.todayLists")}</h2>
      {board.view.roleLists.map((list) => (
        <article
          key={list.formId}
          className="space-y-2 rounded-xl border bg-background p-3"
          data-testid={`overview-role-list-${list.formId}`}
        >
          <h3 className="font-medium">{list.title || t("tasks.listsForThisRole")}</h3>
          {list.phase === "due" && list.dueTime ? (
            <p className="text-sm text-muted-foreground">
              {t("forms.roleListDue", { time: formatClock(list.dueTime, i18n.language) })}
            </p>
          ) : null}
          {list.items.length > 0 ? (
            <ul className="space-y-1">
              {list.items.map((item) => (
                <li key={item.id} className="text-sm">
                  {item.label}
                </li>
              ))}
            </ul>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            data-testid={`overview-role-open-${list.formId}`}
            onClick={() => setOpenId(list.formId)}
          >
            {t("tasks.openList")}
          </Button>
        </article>
      ))}
      {openId ? (
        <Suspense fallback={null}>
          <FormFillDialog
            open
            formId={openId}
            onOpenChange={(open) => {
              if (!open) setOpenId(null);
            }}
            onSubmitted={() => shift.refresh()}
          />
        </Suspense>
      ) : null}
    </section>
  );
}
