import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { sections as fileSections } from "@/sections/registry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Edit2, Copy, Trash2, FolderOpen } from "lucide-react";

type Props = {
  onCreate?: () => void;
};

const catColor: Record<string, string> = {
  communication: "bg-secondary/10 text-secondary",
  operations: "bg-success-muted text-success",
  hr: "bg-primary/10 text-primary",
  custom: "bg-muted text-foreground",
};

export function FileSectionsManager({ onCreate }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<
    "all" | "communication" | "operations" | "hr" | "custom"
  >("all");
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(fileSections.map((s) => [s.slug, true])),
  );

  const filtered = useMemo(() => {
    return fileSections.filter(
      (s) =>
        (category === "all" || s.category === category) &&
        (s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.slug.includes(query)),
    );
  }, [query, category]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span>{t("sections.fileBasedSections")}</span>
          <div className="flex gap-2">
            <Input
              className="w-56"
              placeholder={t("sections.searchSections")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("inventory.allCategories2")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("inventory.allCategories2")}</SelectItem>
                <SelectItem value="communication">{t("navigation.communication")}</SelectItem>
                <SelectItem value="operations">{t("navigation.operations")}</SelectItem>
                <SelectItem value="hr">{t("sections.hrPeople")}</SelectItem>
                <SelectItem value="custom">{t("common.custom")}</SelectItem>
              </SelectContent>
            </Select>
            {onCreate && <Button onClick={onCreate}>{t("sections.createSection")}</Button>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.map((s) => {
          return (
          <div
            key={s.slug}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Badge className={catColor[s.category] || catColor.custom}>
                {s.category}
              </Badge>
              <div>
                <div className="font-medium">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  {t("sections.sections")}{s.slug} {t("sections.pages")} {s.pages.length}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={visible[s.slug]}
                onCheckedChange={(v) =>
                  setVisible((prev) => ({ ...prev, [s.slug]: !!v }))
                }
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/sections/${s.slug}`, "_self")}
              >
                <FolderOpen className="h-4 w-4 mr-1" /> {t("tasks.view")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigator.clipboard.writeText(`npm run gen:section ${s.slug}`)
                }
              >
                <Copy className="h-4 w-4 mr-1" /> {t("sections.copy")}
              </Button>
              <Button variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-1" /> {t("common.edit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4 mr-1" /> {t("common.delete")}
              </Button>
            </div>
          </div>
        );
        })}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            {t("sections.noSectionsFound")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
