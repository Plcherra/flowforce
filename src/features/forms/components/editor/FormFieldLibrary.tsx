import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { paneScroller } from "@/features/forms/utils/formsSurface";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FormFieldType } from "@/types/forms";
import { formFieldCatalog } from "@/features/forms/utils/formFieldCatalog";

interface FieldTemplate {
  type: FormFieldType;
  label: string;
  description: string;
  category: string;
}

interface FormFieldLibraryProps {
  onAddField: (template: FieldTemplate) => void;
  allowDrag?: boolean;
}

export function FormFieldLibrary({
  onAddField,
  allowDrag = true,
}: FormFieldLibraryProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const fieldTemplates = useMemo(
    () =>
      formFieldCatalog.map((item) => ({
        type: item.value,
        label: t(item.labelKey),
        description: t(item.descriptionKey),
        category: t(item.categoryKey),
      })),
    [t],
  );

  const filteredTemplates = useMemo(() => {
    if (!query.trim()) return fieldTemplates;
    return fieldTemplates.filter((template) =>
      `${template.label} ${template.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  }, [fieldTemplates, query]);

  const handleDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    template: FieldTemplate,
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "application/form-field-template",
      JSON.stringify(template),
    );
  };

  return (
    <div className="flex h-full flex-col gap-4 border-r bg-muted/30 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("forms.fieldLibrary")}</h3>
        <Input
          placeholder={t("forms.searchFields")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t("forms.searchFieldLibrary")}
        />
      </div>
      <div className={paneScroller}>
        <div className="space-y-4 pr-2">
          {filteredTemplates.map((template) => (
            <div
              key={template.type}
              className="rounded-lg border bg-background p-3 shadow-sm transition hover:border-primary hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{template.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </div>
                <Badge variant="outline">{template.category}</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => onAddField(template)}
                >
                  {t("tasks.add")}</Button>
                {allowDrag ? (
                  <Button
                    size="sm"
                    variant="outline"
                    draggable
                    onDragStart={(event) => handleDragStart(event, template)}
                  >
                    {t("forms.drag")}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export type { FieldTemplate };

export default FormFieldLibrary;
