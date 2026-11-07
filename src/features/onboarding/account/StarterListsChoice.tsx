import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceChoice } from "@/features/onboarding/components/SourceChoice";
import type { OrgSource } from "@/features/onboarding/utils/orgTemplates";

export type StarterListDraft = {
  id: string;
  title: string;
  items: string[];
};

export function StarterListsChoice({
  source,
  lists,
  onSource,
  onChange,
}: {
  source: OrgSource;
  lists: StarterListDraft[];
  onSource: (source: OrgSource) => void;
  onChange: (lists: StarterListDraft[]) => void;
}) {
  const { t } = useTranslation();

  const update = (id: string, patch: Partial<StarterListDraft>) => {
    onChange(lists.map((list) => (list.id === id ? { ...list, ...patch } : list)));
  };

  return (
    <div className="space-y-4" data-testid="starter-lists-choice">
      <SourceChoice source={source} onSource={onSource} name="starter-source" />
      {lists.map((list) => (
        <div key={list.id} className="space-y-2 rounded-xl border p-3">
          <Input
            className="min-h-11 font-medium"
            aria-label={t("onboarding.account.starter.listTitle")}
            value={list.title}
            onChange={(event) => update(list.id, { title: event.target.value })}
          />
          {list.items.map((item, index) => (
            <Input
              key={`${list.id}-${index}`}
              className="min-h-11"
              aria-label={t("onboarding.account.starter.listItem")}
              value={item}
              onChange={(event) => {
                const items = [...list.items];
                items[index] = event.target.value;
                update(list.id, { items });
              }}
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={() => update(list.id, { items: [...list.items, ""] })}
          >
            {t("onboarding.account.starter.addItem")}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={() =>
          onChange([
            ...lists,
            { id: `list-${lists.length + 1}`, title: "", items: [""] },
          ])
        }
      >
        {t("onboarding.account.starter.addList")}
      </Button>
    </div>
  );
}
