import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  filterPickerPeople,
  pickerLevels,
  pickerRoles,
  type PickerPerson,
} from "@/components/people/peoplePickerFilter";

export function PeoplePicker({
  people,
  selectedIds,
  onChange,
}: {
  people: PickerPerson[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const roles = useMemo(() => pickerRoles(people), [people]);
  const levels = useMemo(() => pickerLevels(people), [people]);
  const visible = useMemo(
    () => filterPickerPeople(people, query, role, level),
    [people, query, role, level],
  );
  const selected = people.filter((person) => selectedIds.includes(person.id));

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <div className="space-y-2" data-testid="people-picker">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="min-h-11">
            {t("people.choosePeople")}
            <span className="ml-2 text-muted-foreground">
              {t("people.selectedCount", { count: selectedIds.length })}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="z-[90] w-80 p-3" align="start">
          <div className="space-y-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("people.searchPeople")}
              aria-label={t("people.searchPeople")}
            />
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant={level ? "outline" : "default"}
                onClick={() => setLevel(null)}
              >
                {t("people.allLevels")}
              </Button>
              {levels.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={level === item ? "default" : "outline"}
                  onClick={() => setLevel(level === item ? null : item)}
                >
                  {item}
                </Button>
              ))}
            </div>
            {roles.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={role ? "outline" : "default"}
                  onClick={() => setRole(null)}
                >
                  {t("people.allRoles")}
                </Button>
                {roles.map((item) => (
                  <Button
                    key={item}
                    type="button"
                    size="sm"
                    variant={role === item ? "default" : "outline"}
                    onClick={() => setRole(role === item ? null : item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {visible.length === 0 ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  {t("people.noPeopleMatch")}
                </p>
              ) : (
                visible.map((person) => (
                  <label
                    key={person.id}
                    className="flex min-h-11 items-center gap-2 rounded-md px-1 text-sm"
                  >
                    <Checkbox
                      checked={selectedIds.includes(person.id)}
                      onCheckedChange={() => toggle(person.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">{person.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {person.role || person.level}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selected.map((person) => (
            <Button
              key={person.id}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => toggle(person.id)}
            >
              {person.name}
              <X className="ml-1 h-3 w-3" aria-hidden="true" />
              <span className="sr-only">{t("people.removePerson")}</span>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
