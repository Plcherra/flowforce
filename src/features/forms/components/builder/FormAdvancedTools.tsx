import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormSchemaStore } from "@/stores/useFormSchemaStore";

const randomId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

export function FormAdvancedTools() {
  const { t } = useTranslation();
  const schema = useFormSchemaStore((state) => state.schema);
  const addSection = useFormSchemaStore((state) => state.addSection);
  const renameSection = useFormSchemaStore((state) => state.renameSection);
  const setMetadata = useFormSchemaStore((state) => state.setMetadata);
  const upsertFormula = useFormSchemaStore((state) => state.upsertFormula);
  const removeFormula = useFormSchemaStore((state) => state.removeFormula);
  const updateField = useFormSchemaStore((state) => state.updateField);
  if (!schema) return null;
  const ownerOnly = Boolean(schema.metadata?.ownerOnly);
  const fields = schema.sections.flatMap((section) =>
    section.fields.map((field) => ({ id: field.id, label: field.label, sectionId: section.id })),
  );

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-3" data-testid="form-advanced-tools">
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-sm font-medium">{t("forms.ownerOnly")}</span>
        <Switch
          checked={ownerOnly}
          aria-label={t("forms.restrictFormToOwner")}
          onCheckedChange={(checked) =>
            setMetadata({ ...(schema.metadata ?? {}), ownerOnly: checked })
          }
        />
      </label>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{t("forms.sectionHeading")}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11"
            onClick={() => addSection(t("forms.untitledSection"))}
          >
            {t("forms.addSection")}
          </Button>
        </div>
        {schema.sections.map((section) => (
          <Input
            key={section.id}
            className="min-h-11"
            value={section.title}
            aria-label={t("forms.sectionTitle")}
            onChange={(event) => renameSection(section.id, event.target.value)}
          />
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{t("forms.formulas")}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11"
            onClick={() =>
              upsertFormula({
                id: randomId(),
                name: t("forms.fieldFormula"),
                expression: "",
                targetFieldId: fields[0]?.id ?? "",
              })
            }
          >
            {t("forms.addFormula")}
          </Button>
        </div>
        {schema.formulas.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("forms.noFormulasConfiguredYet")}</p>
        ) : null}
        {schema.formulas.map((formula) => (
          <div key={formula.id} className="space-y-2 rounded-md border bg-background p-3">
            <Label htmlFor={`formula-name-${formula.id}`}>{t("schedule.name")}</Label>
            <Input
              id={`formula-name-${formula.id}`}
              className="min-h-11"
              value={formula.name}
              onChange={(event) => upsertFormula({ ...formula, name: event.target.value })}
            />
            <Label htmlFor={`formula-target-${formula.id}`}>{t("forms.targetField")}</Label>
            <Select
              value={formula.targetFieldId}
              onValueChange={(value) => upsertFormula({ ...formula, targetFieldId: value })}
            >
              <SelectTrigger id={`formula-target-${formula.id}`} className="min-h-11">
                <SelectValue placeholder={t("forms.chooseField")} />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.label || t("forms.untitledField")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label htmlFor={`formula-expression-${formula.id}`}>{t("forms.expression")}</Label>
            <Textarea
              id={`formula-expression-${formula.id}`}
              value={formula.expression}
              rows={2}
              placeholder={t("forms.eGFieldAFieldB")}
              onChange={(event) => {
                const expression = event.target.value;
                upsertFormula({ ...formula, expression });
                const section = schema.sections.find((item) =>
                  item.fields.some((field) => field.id === formula.targetFieldId),
                );
                if (section) {
                  updateField(section.id, formula.targetFieldId, {
                    formula_expression: expression,
                  });
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 text-destructive"
              onClick={() => removeFormula(formula.id)}
            >
              {t("forms.remove")}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
