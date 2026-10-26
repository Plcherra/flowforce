import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { attachableShiftForms } from "@/features/forms/utils/formLifecycle";

export function ShiftFormPicker({
  disabled = false,
  linkedIds,
  onLink,
}: {
  disabled?: boolean;
  linkedIds: string[];
  onLink: (form: { id: string; title: string | null }) => void;
}) {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const formsQuery = useQuery({
    queryKey: ["shift-task-forms", companyId],
    enabled: Boolean(companyId && open),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("id, title, status")
        .eq("company_id", companyId!)
        .eq("status", "published")
        .order("title", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const forms = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return attachableShiftForms(formsQuery.data ?? []).filter((form) =>
      needle ? (form.title ?? "").toLowerCase().includes(needle) : true,
    );
  }, [formsQuery.data, query]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {t("tasks.chooseForm")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent className="flex max-h-[min(32rem,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="space-y-2 border-b px-4 py-3 pr-12">
            <DialogTitle>{t("tasks.chooseForm")}</DialogTitle>
            <DialogDescription>{t("tasks.shiftFormsHelp")}</DialogDescription>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("forms.searchForms2")}
              aria-label={t("forms.searchForms")}
            />
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {formsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("tasks.loadingShift")}</p>
            ) : forms.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("tasks.publishAFormToAttach")}</p>
            ) : (
              <ul className="space-y-2">
                {forms.map((form) => {
                  const linked = linkedIds.includes(form.id);
                  return (
                    <li
                      key={form.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate font-medium">{form.title}</span>
                      {linked ? (
                        <span className="text-xs text-muted-foreground">
                          {t("tasks.linkedToThisShift")}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="min-h-11"
                          disabled={disabled}
                          onClick={() => {
                            onLink(form);
                            setOpen(false);
                            setQuery("");
                          }}
                        >
                          {t("tasks.linkFormToShift")}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
