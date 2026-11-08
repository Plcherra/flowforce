import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type NameOption = {
  id: string;
  name: string;
  suggested?: boolean;
};

export function NameCombobox({
  label,
  value,
  options,
  testId,
  onSelect,
  onCreate,
  onDelete,
}: {
  label: string;
  value: string;
  options: NameOption[];
  testId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => Promise<"ok" | "blocked" | void> | "ok" | "blocked" | void;
}) {
  const { t } = useTranslation();
  const selected = options.find((option) => option.id === value && !option.suggested);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [confirm, setConfirm] = useState<"create" | "delete" | "blocked" | null>(null);
  const typed = query.trim();
  const exists = options.some(
    (option) => !option.suggested && option.name.toLowerCase() === typed.toLowerCase(),
  );
  const canCreate = typed.length > 0 && !exists;
  const matches = options.filter((option) =>
    option.name.toLowerCase().includes(typed.toLowerCase()),
  );

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          value={query}
          data-testid={testId}
          className="min-h-11"
          aria-label={label}
          onChange={(event) => {
            setQuery(event.target.value);
            if (selected) onSelect("");
          }}
        />
        {canCreate ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="min-h-11 min-w-11"
            data-testid={`${testId}-create`}
            aria-label={t("employees.createNamed", { name: typed })}
            onClick={() => setConfirm("create")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
        {selected ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="min-h-11 min-w-11"
            data-testid={`${testId}-delete`}
            aria-label={t("employees.deleteNamed", { name: selected.name })}
            onClick={() => setConfirm("delete")}
          >
            <Minus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {typed && !(selected && selected.name.toLowerCase() === typed.toLowerCase()) ? (
        <ul className="max-h-40 overflow-y-auto rounded-md border text-sm" data-testid={`${testId}-list`}>
          {matches.map((option) => (
            <li key={`${option.suggested ? "new" : "row"}-${option.id || option.name}`}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center px-3 text-left hover:bg-muted"
                data-testid={`${testId}-option`}
                onClick={() => {
                  setQuery(option.name);
                  if (option.suggested || !option.id) {
                    setConfirm("create");
                    return;
                  }
                  onSelect(option.id);
                }}
              >
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "create"
                ? t("employees.createConfirm", { name: typed })
                : confirm === "blocked"
                  ? t("employees.deleteBlocked", { name: selected?.name ?? typed })
                  : t("employees.deleteConfirm", { name: selected?.name ?? typed })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "blocked"
                ? t("employees.deleteBlockedHelp")
                : t("employees.nameConfirmHelp")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("employees.nameNo")}</AlertDialogCancel>
            {confirm === "blocked" ? null : (
              <AlertDialogAction
                onClick={() => {
                  if (confirm === "create") {
                    onCreate(typed);
                    setQuery(typed);
                  }
                  if (confirm === "delete" && selected) {
                    void Promise.resolve(onDelete(selected.id)).then((result) => {
                      if (result === "blocked") {
                        setConfirm("blocked");
                        return;
                      }
                      setQuery("");
                      onSelect("");
                    });
                  }
                }}
              >
                {t("employees.nameYes")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
