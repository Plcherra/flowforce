import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  Trash2,
  FileText,
  AlignLeft,
  Hash,
  ChevronDown,
  CheckCircle,
  Image,
  Calculator,
  ScanLine,
  Calendar,
  MapPin,
  ImageUp,
  Mic,
  Video,
  CheckSquare,
  Upload,
  Star,
  PenTool,
  Sliders,
  Plus,
  LayoutGrid,
  List,
  Edit,
} from "lucide-react";
import { FormFieldType } from "@/types/forms";
import { FormFieldValidationRules } from "@/types/api";
import { FormulaField } from "@/features/forms/components/fields/FormulaField";
import { DescriptionFieldEditor } from "./DescriptionFieldEditor";

interface FormField {
  field_type: FormFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  content?: string;
  is_required: boolean;
  options?: string[];
  validation_rules?: FormFieldValidationRules;
  field_order: number;
  min_value?: number;
  max_value?: number;
  step_value?: number;
  formula_expression?: string;
  dependent_fields?: string[];
  rating_config?: Record<string, any>;
  scan_config?: Record<string, unknown>;
  media_config?: Record<string, unknown>;
  allow_multiple_selection?: boolean;
  conditional_logic?: {
    enabled: boolean;
    fieldid?: string;
    condition_type?:
      | "equals"
      | "not_equals"
      | "contains"
      | "not_contains"
      | "any_of"
      | "none_of";
    condition_values?: string[];
  };
}

interface FieldEditorProps {
  fields: FormField[];
  onUpdateField: (index: number, updates: Partial<FormField>) => void;
  onRemoveField: (index: number) => void;
  onMoveField: (fromIndex: number, toIndex: number) => void;
}

const fieldTypes = [
  { value: "text", label: "Description", icon: "FileText", category: "basic" },
  { value: "formula", label: "Formula", icon: "Calculator", category: "basic" },
  {
    value: "select",
    label: "Dropdown",
    icon: "ChevronDown",
    category: "basic",
  },
  { value: "number", label: "Number", icon: "Hash", category: "basic" },
  {
    value: "textarea",
    label: "Open ended",
    icon: "AlignLeft",
    category: "basic",
  },
  { value: "yes_no", label: "Yes/No", icon: "CheckCircle", category: "basic" },
  { value: "date", label: "Date", icon: "Calendar", category: "basic" },
  {
    value: "number_slider",
    label: "Number Slider",
    icon: "Sliders",
    category: "basic",
  },
  {
    value: "location",
    label: "Location",
    icon: "MapPin",
    category: "location",
  },
  {
    value: "image_upload",
    label: "Image Upload",
    icon: "ImageUp",
    category: "media",
  },
  {
    value: "audio_recording",
    label: "Audio Recording",
    icon: "Mic",
    category: "media",
  },
  {
    value: "video_upload",
    label: "Video Upload",
    icon: "Video",
    category: "media",
  },
  { value: "file", label: "File upload", icon: "Upload", category: "media" },
  {
    value: "scanner",
    label: "Scanner",
    icon: "ScanLine",
    category: "interactive",
  },
  {
    value: "image_selection",
    label: "Image selection",
    icon: "Image",
    category: "interactive",
  },
  {
    value: "signature",
    label: "Signature",
    icon: "PenTool",
    category: "interactive",
  },
  { value: "rating", label: "Rating", icon: "Star", category: "interactive" },
  {
    value: "task",
    label: "Task",
    icon: "CheckSquare",
    category: "interactive",
  },
] as const;

const getFieldIcon = (fieldType: string) => {
  const typeConfig = fieldTypes.find((t) => t.value === fieldType);
  const iconName = typeConfig?.icon || "FileText";

  const iconMap: Record<string, any> = {
    FileText,
    AlignLeft,
    Hash,
    ChevronDown,
    CheckCircle,
    Image,
    Calculator,
    ScanLine,
    Calendar,
    MapPin,
    ImageUp,
    Mic,
    Video,
    CheckSquare,
    Upload,
    Star,
    PenTool,
    Sliders,
  };

  const IconComponent = iconMap[iconName] || FileText;
  return <IconComponent className="h-4 w-4" />;
};

const needsOptions = (fieldType: string) => {
  return ["select", "radio", "checkbox", "image_selection"].includes(fieldType);
};

const DropdownOptionsEditor = ({
  options,
  allowMultiple,
  onUpdateOptions,
  onUpdateMultiple,
}: {
  options: string[];
  allowMultiple: boolean;
  onUpdateOptions: (options: string[]) => void;
  onUpdateMultiple: (allow: boolean) => void;
}) => {
  const { t } = useTranslation();
  const addOption = () => {
    const newOption = `Option ${options.length + 1}`;
    onUpdateOptions([...options, newOption]);
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    onUpdateOptions(updated);
  };

  const removeOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index);
    onUpdateOptions(updated);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">{t("forms.items")}</label>
          <Button
            variant="outline"
            size="sm"
            onClick={addOption}
            className="h-8 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            {t("forms.addItem")}</Button>
        </div>

        <div className="space-y-2">
          {options.map((option, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 border rounded-md bg-background"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move flex-shrink-0" />
              <Input
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={t("forms.enterOptionText")}
                className="flex-1 h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeOption(index)}
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {options.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
              {t("forms.noItemsYetClickAddItemToGetStarted")}</div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <label className="flex items-center space-x-2">
          <Checkbox
            checked={allowMultiple}
            onCheckedChange={(checked) => onUpdateMultiple(!!checked)}
          />
          <span className="text-sm font-medium">{t("forms.multipleSelection")}</span>
        </label>
      </div>
    </div>
  );
};

export default function FieldEditor({
  fields,
  onUpdateField,
  onRemoveField,
  onMoveField,
}: FieldEditorProps) {
  const { t } = useTranslation();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isCompactView, setIsCompactView] = useState(false);
  const [expandedField, setExpandedField] = useState<number | null>(null);

  const getAvailableFieldsForConditions = (currentIndex: number) => {
    return fields.slice(0, currentIndex).map((field, index) => ({
      id: (index + 1).toString(),
      label: field.label || `Field ${index + 1}`,
      type: field.field_type,
      options: field.options || [],
    }));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", "");
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onMoveField(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex-1 min-h-0">
      <div className="h-full flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Form Fields ({fields.length})</h3>
          <div className="flex gap-2">
            <Button
              variant={isCompactView ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCompactView(!isCompactView)}
              className="flex items-center gap-2"
            >
              {isCompactView ? (
                <List className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
              {isCompactView ? "List View" : "Card View"}
            </Button>
            <Button variant="outline" size="sm">
              {t("schedule.preview")}</Button>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {fields.map((field, index) =>
            isCompactView ? (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 border rounded-lg bg-card hover:shadow-sm transition-all cursor-move ${
                  draggedIndex === index ? "opacity-50 scale-95" : ""
                } ${dragOverIndex === index ? "border-primary border-2" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab hover:cursor-grabbing hover:text-primary transition-colors flex-shrink-0" />

                <div className="flex items-center gap-2 flex-shrink-0">
                  {getFieldIcon(field.field_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {field.label || `Field ${index + 1}`}
                    </span>
                    {field.is_required && (
                      <Badge variant="secondary" className="text-xs">
                        {t("forms.required")}</Badge>
                    )}
                    {field.conditional_logic?.enabled && (
                      <Badge variant="outline" className="text-xs">
                        <div className="w-2 h-2 rounded-full bg-warning mr-1"></div>
                        {t("forms.conditional")}</Badge>
                    )}
                  </div>
                  {field.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {field.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded capitalize">
                    {fieldTypes.find((t) => t.value === field.field_type)
                      ?.label || field.field_type}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedField(expandedField === index ? null : index)
                    }
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveField(index)}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              // Full Card View
              <Card
                key={index}
                className={`border-l-4 border-l-primary/20 hover:shadow-sm transition-all cursor-move ${
                  draggedIndex === index ? "opacity-50 scale-95" : ""
                } ${dragOverIndex === index ? "border-primary border-2" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab hover:cursor-grabbing hover:text-primary transition-colors" />
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {getFieldIcon(field.field_type)}
                          {field.label || `Field ${index + 1}`}
                          {field.is_required && (
                            <Badge variant="secondary" className="text-xs">
                              {t("forms.required")}</Badge>
                          )}
                          {field.conditional_logic?.enabled && (
                            <Badge variant="outline" className="text-xs">
                              <div className="w-2 h-2 rounded-full bg-warning mr-1"></div>
                              {t("forms.conditional")}</Badge>
                          )}
                        </CardTitle>
                        {field.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {field.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveField(index)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Show DescriptionFieldEditor ONLY for description fields */}
                  {field.field_type === "description" ? (
                    <DescriptionFieldEditor
                      field={field}
                      onUpdateField={(updates) => onUpdateField(index, updates)}
                    />
                  ) : (
                    <>
                      {/* Standard field configuration for all other field types */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">{t("forms.label")}</label>
                          <Input
                            value={field.label}
                            onChange={(e) =>
                              onUpdateField(index, { label: e.target.value })
                            }
                            placeholder={t("forms.enterFieldLabel")}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">{t("schedule.type")}</label>
                          <Select
                            value={field.field_type}
                            onValueChange={(value) =>
                              onUpdateField(index, {
                                field_type: value as FormFieldType,
                              })
                            }
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    {getFieldIcon(type.value)}
                                    {type.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          {t("forms.descriptionOptional")}</label>
                        <Input
                          value={field.description}
                          onChange={(e) =>
                            onUpdateField(index, {
                              description: e.target.value,
                            })
                          }
                          placeholder={t("forms.helpTextForThisField")}
                          className="text-sm"
                        />
                      </div>

                      {field.field_type !== "formula" &&
                        field.field_type !== "number_slider" &&
                        field.field_type !== "yes_no" && (
                          <div>
                            <label className="text-sm font-medium">
                              {t("forms.placeholderOptional")}</label>
                            <Input
                              value={field.placeholder}
                              onChange={(e) =>
                                onUpdateField(index, {
                                  placeholder: e.target.value,
                                })
                              }
                              placeholder={t("forms.placeholderText")}
                              className="text-sm"
                            />
                          </div>
                        )}

                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2">
                          <Checkbox
                            checked={field.is_required}
                            onCheckedChange={(checked) =>
                              onUpdateField(index, { is_required: !!checked })
                            }
                          />
                          <span className="text-sm font-medium">{t("forms.required")}</span>
                        </label>
                      </div>

                      {needsOptions(field.field_type) && (
                        <DropdownOptionsEditor
                          options={field.options || []}
                          allowMultiple={
                            field.allow_multiple_selection || false
                          }
                          onUpdateOptions={(options) =>
                            onUpdateField(index, { options })
                          }
                          onUpdateMultiple={(allow) =>
                            onUpdateField(index, {
                              allow_multiple_selection: allow,
                            })
                          }
                        />
                      )}

                      {/* Show additional config for specific field types */}
                      {field.field_type === "formula" && (
                        <div>
                          <label className="text-sm font-medium">
                            {t("forms.formulaConfiguration")}</label>
                          <FormulaField
                            label={t("forms.formulaBuilder")}
                            description="Build your formula using available fields"
                            formula={field.formula_expression || ""}
                            availableFields={fields
                              .filter((f) => f.field_type === "number")
                              .map((f) => ({
                                label: f.label,
                                name: f.label
                                  .toLowerCase()
                                  .replace(/\s+/g, "_"),
                                type: "number",
                              }))}
                            isBuilding={true}
                            onFormulaChange={(formula) =>
                              onUpdateField(index, {
                                formula_expression: formula,
                              })
                            }
                            className="mt-2"
                          />
                        </div>
                      )}

                      {field.field_type === "number_slider" && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-sm font-medium">{t("forms.min")}</label>
                            <Input
                              type="number"
                              value={field.min_value || 0}
                              onChange={(e) =>
                                onUpdateField(index, {
                                  min_value: Number(e.target.value),
                                })
                              }
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">{t("forms.max")}</label>
                            <Input
                              type="number"
                              value={field.max_value || 100}
                              onChange={(e) =>
                                onUpdateField(index, {
                                  max_value: Number(e.target.value),
                                })
                              }
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">{t("forms.step")}</label>
                            <Input
                              type="number"
                              value={field.step_value || 1}
                              onChange={(e) =>
                                onUpdateField(index, {
                                  step_value: Number(e.target.value),
                                })
                              }
                              className="text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Conditional Logic Configuration */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">
                        {t("forms.conditionalLogic")}</label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={field.conditional_logic?.enabled || false}
                          onCheckedChange={(checked) =>
                            onUpdateField(index, {
                              conditional_logic: {
                                ...field.conditional_logic,
                                enabled: !!checked,
                              },
                            })
                          }
                        />
                        <span className="text-sm">
                          {t("forms.showThisFieldOnlyIf")}</span>
                      </div>
                    </div>

                    {field.conditional_logic?.enabled && (
                      <div className="space-y-3 p-3 bg-muted/20 rounded-lg border border-warning/40">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">
                              {t("forms.showOnlyIf")}</label>
                            <Select
                              value={field.conditional_logic.fieldid || ""}
                              onValueChange={(value) =>
                                onUpdateField(index, {
                                  conditional_logic: {
                                    ...field.conditional_logic,
                                    fieldid: value,
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder={t("forms.selectField")} />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableFieldsForConditions(index).map(
                                  (availableField) => (
                                    <SelectItem
                                      key={availableField.id}
                                      value={availableField.id}
                                    >
                                      {availableField.label}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              {t("forms.condition")}</label>
                            <Select
                              value={
                                field.conditional_logic.condition_type ||
                                "equals"
                              }
                              onValueChange={(value) =>
                                onUpdateField(index, {
                                  conditional_logic: {
                                    ...field.conditional_logic,
                                    condition_type: value as any,
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">{t("forms.equals")}</SelectItem>
                                <SelectItem value="not_equals">
                                  {t("forms.doesNotEqual")}</SelectItem>
                                <SelectItem value="contains">
                                  {t("forms.contains")}</SelectItem>
                                <SelectItem value="not_contains">
                                  {t("forms.doesNotContain")}</SelectItem>
                                <SelectItem value="any_of">
                                  {t("forms.isAnyOf")}</SelectItem>
                                <SelectItem value="none_of">
                                  {t("forms.isNoneOf")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ),
          )}

          {/* Expanded Field Editor (for compact view) */}
          {isCompactView && expandedField !== null && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">
                    {t("forms.editField", {
                      label:
                        fields[expandedField]?.label ||
                        t("forms.fieldNumber", { index: expandedField + 1 }),
                    })}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedField(null)}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {expandedField !== null && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">{t("forms.label")}</label>
                        <Input
                          value={fields[expandedField]?.label || ""}
                          onChange={(e) =>
                            onUpdateField(expandedField, {
                              label: e.target.value,
                            })
                          }
                          placeholder={t("forms.enterFieldLabel")}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t("schedule.type")}</label>
                        <Select
                          value={fields[expandedField]?.field_type || "text"}
                          onValueChange={(value) =>
                            onUpdateField(expandedField, {
                              field_type: value as FormFieldType,
                            })
                          }
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  {getFieldIcon(type.value)}
                                  {type.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        {t("forms.descriptionOptional")}</label>
                      <Input
                        value={fields[expandedField]?.description || ""}
                        onChange={(e) =>
                          onUpdateField(expandedField, {
                            description: e.target.value,
                          })
                        }
                        placeholder={t("forms.helpTextForThisField")}
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        {t("forms.placeholderOptional")}</label>
                      <Input
                        value={fields[expandedField]?.placeholder || ""}
                        onChange={(e) =>
                          onUpdateField(expandedField, {
                            placeholder: e.target.value,
                          })
                        }
                        placeholder={t("forms.placeholderText")}
                        className="text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={fields[expandedField]?.is_required || false}
                          onCheckedChange={(checked) =>
                            onUpdateField(expandedField, {
                              is_required: !!checked,
                            })
                          }
                        />
                        <span className="text-sm font-medium">{t("forms.required")}</span>
                      </label>
                    </div>

                    {needsOptions(fields[expandedField]?.field_type || "") && (
                      <DropdownOptionsEditor
                        options={fields[expandedField]?.options || []}
                        allowMultiple={
                          fields[expandedField]?.allow_multiple_selection ||
                          false
                        }
                        onUpdateOptions={(options) =>
                          onUpdateField(expandedField, { options })
                        }
                        onUpdateMultiple={(allow) =>
                          onUpdateField(expandedField, {
                            allow_multiple_selection: allow,
                          })
                        }
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {fields.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-lg font-medium mb-2">{t("forms.noFieldsYet")}</p>
              <p className="text-sm">
                {t("forms.clickAddFieldOrSelectElementsFromTheLeftToStartBuildingYourForm")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
