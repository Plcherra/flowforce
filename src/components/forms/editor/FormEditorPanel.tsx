import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormFieldType } from "@/types/forms";
import { useFormSchemaStore } from "@/stores/useFormSchemaStore";
import { cn } from "@/lib/utils";

const fieldTypes: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Paragraph" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "file_upload", label: "File upload" },
  { value: "signature", label: "Signature" },
  { value: "formula", label: "Formula" },
];

const randomId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

export function FormEditorPanel() {
  const schema = useFormSchemaStore((state) => state.schema);
  const activeSectionId = useFormSchemaStore((state) => state.activeSectionId);
  const activeFieldId = useFormSchemaStore((state) => state.activeFieldId);

  const setActiveSection = useFormSchemaStore(
    (state) => state.setActiveSection,
  );
  const setActiveField = useFormSchemaStore((state) => state.setActiveField);
  const addSection = useFormSchemaStore((state) => state.addSection);
  const addField = useFormSchemaStore((state) => state.addField);
  const updateField = useFormSchemaStore((state) => state.updateField);
  const removeField = useFormSchemaStore((state) => state.removeField);
  const setMetadata = useFormSchemaStore((state) => state.setMetadata);
  const upsertFormula = useFormSchemaStore((state) => state.upsertFormula);
  const removeFormula = useFormSchemaStore((state) => state.removeFormula);

  const activeSection = useMemo(
    () =>
      schema?.sections.find((section) => section.id === activeSectionId) ??
      schema?.sections[0],
    [schema, activeSectionId],
  );

  const activeField = useMemo(() => {
    if (!activeSection) return undefined;
    return (
      activeSection.fields.find((field) => field.id === activeFieldId) ??
      activeSection.fields[0]
    );
  }, [activeSection, activeFieldId]);

  const metadata = schema?.metadata ?? {};
  const ownerOnly = Boolean(metadata.ownerOnly);
  const formulas = schema?.formulas ?? [];
  const allFields = useMemo(
    () =>
      schema?.sections.flatMap((section) =>
        section.fields.map((field) => ({ id: field.id, label: field.label })),
      ) ?? [],
    [schema],
  );

  const handleAddFormula = () => {
    const targetId = activeField?.id ?? allFields[0]?.id ?? "";
    upsertFormula({
      id: randomId(),
      name: "New formula",
      expression: "",
      targetFieldId: targetId,
    });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const templateJSON = event.dataTransfer.getData(
      "application/form-field-template",
    );
    if (!templateJSON || !schema) return;
    const template = JSON.parse(templateJSON) as {
      type: FormFieldType;
      label: string;
    };
    const sectionId = activeSection?.id ?? schema.sections[0]?.id;
    if (!sectionId) return;
    addField(sectionId, {
      type: template.type,
      label: template.label,
    });
  };

  const handleAddQuickField = (type: FormFieldType) => {
    if (!schema) return;
    const sectionId = activeSection?.id ?? schema.sections[0]?.id;
    if (!sectionId) return;
    addField(sectionId, {
      type,
      label: "New field",
    });
  };

  if (!schema) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Load a form schema to start editing.
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col border-x bg-background"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <Select
              value={activeSection?.id}
              onValueChange={(value) => setActiveSection(value)}
            >
              <SelectTrigger className="min-w-[200px]">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {schema.sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addSection("Untitled section")}
            >
              + Add section
            </Button>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <label className="flex items-center gap-2">
              <Switch
                checked={ownerOnly}
                onCheckedChange={(checked) =>
                  setMetadata({ ...metadata, ownerOnly: checked })
                }
                aria-label="Restrict form to owner"
              />
              <span>Owner only</span>
            </label>
            <span className="hidden md:inline">
              Drag a field here or use quick add:
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAddQuickField("text")}
            >
              Text
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAddQuickField("select")}
            >
              Dropdown
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAddQuickField("checkbox")}
            >
              Checkbox
            </Button>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {schema.sections.map((section) => (
            <div key={section.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {section.title}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "h-7 text-xs",
                    activeSection?.id === section.id
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  Focus section
                </Button>
              </div>
              <div className="space-y-2">
                {section.fields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(section.id);
                      setActiveField(field.id);
                    }}
                    className={cn(
                      "w-full rounded-lg border bg-muted/40 p-3 text-left transition hover:border-primary",
                      activeField?.id === field.id
                        ? "border-primary bg-primary/10"
                        : "border-transparent",
                    )}
                  >
                    <p className="text-sm font-medium">
                      {field.label || "Untitled field"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {field.type}
                    </p>
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addField(section.id, {
                      type: "text",
                      label: "New field",
                    })
                  }
                >
                  + Add field
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      {activeSection && activeField && (
        <div className="border-t bg-background p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Field label
              </label>
              <Input
                value={activeField.label}
                onChange={(event) =>
                  updateField(activeSection.id, activeField.id, {
                    label: event.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Field type
                </label>
                <Select
                  value={activeField.type}
                  onValueChange={(value) =>
                    updateField(activeSection.id, activeField.id, {
                      type: value as FormFieldType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Placeholder
                </label>
                <Input
                  value={activeField.placeholder ?? ""}
                  onChange={(event) =>
                    updateField(activeSection.id, activeField.id, {
                      placeholder: event.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Required</p>
                <p className="text-xs text-muted-foreground">
                  Users must complete this field before submitting.
                </p>
              </div>
              <Switch
                checked={Boolean(activeField.required)}
                onCheckedChange={(checked) =>
                  updateField(activeSection.id, activeField.id, {
                    required: checked,
                  })
                }
              />
            </div>
            {(activeField.type === "select" ||
              activeField.type === "radio" ||
              activeField.type === "checkbox") && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Options (one per line)
                </label>
                <Textarea
                  value={(activeField.options ?? []).join("\n")}
                  onChange={(event) =>
                    updateField(activeSection.id, activeField.id, {
                      options: event.target.value
                        .split("\n")
                        .map((option) => option.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  removeField(activeSection.id, activeField.id);
                  setActiveField(null);
                }}
              >
                Remove field
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="border-t bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Formulas</p>
            <p className="text-xs text-muted-foreground">
              Use formulas to compute values automatically.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleAddFormula}>
            + Add formula
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {formulas.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No formulas configured yet.
            </p>
          )}
          {formulas.map((formula) => (
            <div
              key={formula.id}
              className="space-y-3 rounded-lg border bg-muted/40 p-3"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Name
                  </label>
                  <Input
                    value={formula.name}
                    onChange={(event) =>
                      upsertFormula({ ...formula, name: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Target field
                  </label>
                  <Select
                    value={formula.targetFieldId}
                    onValueChange={(value) =>
                      upsertFormula({ ...formula, targetFieldId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose field" />
                    </SelectTrigger>
                    <SelectContent>
                      {allFields.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.label || "Untitled field"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Expression
                </label>
                <Textarea
                  value={formula.expression}
                  onChange={(event) =>
                    upsertFormula({
                      ...formula,
                      expression: event.target.value,
                    })
                  }
                  placeholder="e.g. field_a + field_b"
                  rows={2}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeFormula(formula.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FormEditorPanel;
