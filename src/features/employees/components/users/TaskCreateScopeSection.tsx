import { useTranslation } from "react-i18next";
import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { TaskCreateGrant } from "@/features/roles/constants/taskCreateScope";

const LEVELS = [1, 2, 3, 4];

interface TaskCreateScopeSectionProps {
  level: number;
  grants: readonly TaskCreateGrant[];
  canEdit: boolean;
  canPassGrant: boolean;
  people: readonly { id: string; name: string }[];
  selectedLevels: readonly number[];
  selectedUsers: readonly string[];
  passGrant: boolean;
  onToggleLevel: (level: number) => void;
  onToggleUser: (userId: string) => void;
  onPassGrant: (value: boolean) => void;
  onSave: () => void;
  onRevoke: (grantId: string) => void;
}

export function TaskCreateScopeSection({
  level,
  grants,
  canEdit,
  canPassGrant,
  people,
  selectedLevels,
  selectedUsers,
  passGrant,
  onToggleLevel,
  onToggleUser,
  onPassGrant,
  onSave,
  onRevoke,
}: TaskCreateScopeSectionProps) {
  const { t } = useTranslation();
  const active = grants.filter((grant) => !grant.revoked);
  return (
    <section className="space-y-3" data-testid="task-create-scope">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{t("tasks.taskCreationScope")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("tasks.personLevel", { level })}
        </p>
      </div>
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("tasks.noExtraScope")}</p>
      ) : (
        <ul className="space-y-2">
          {active.map((grant) => (
            <li key={grant.id} className="flex items-center justify-between gap-2">
              <p className="text-sm">
                {grant.canGrant ? t("tasks.rightToGrant") : t("tasks.extraLevels")}
                {grant.levels.length > 0 ? ` ${grant.levels.join(", ")}` : ""}
              </p>
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  data-testid={`task-create-revoke-${grant.id}`}
                  onClick={() => onRevoke(grant.id)}
                >
                  {t("tasks.revokeGrant")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((value) => (
              <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedLevels.includes(value)}
                  onCheckedChange={() => onToggleLevel(value)}
                />
                {t("tasks.personLevel", { level: value })}
              </label>
            ))}
          </div>
          <div className="space-y-1">
            {people.map((person) => (
              <label key={person.id} className="flex min-h-11 items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedUsers.includes(person.id)}
                  onCheckedChange={() => onToggleUser(person.id)}
                />
                {person.name}
              </label>
            ))}
          </div>
          {canPassGrant ? (
            <label className="flex min-h-11 items-center gap-2 text-sm" data-testid="task-create-pass-grant">
              <Checkbox
                checked={passGrant}
                onCheckedChange={(value) => onPassGrant(value === true)}
              />
              {t("tasks.rightToGrant")}
            </label>
          ) : null}
          <Button type="button" className="min-h-11 w-full" onClick={onSave}>
            {t("tasks.grantScope")}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("tasks.cannotGrantScope")}</p>
      )}
    </section>
  );
}
